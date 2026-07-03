import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  selectDueSoloRaidScheduleActions,
  validateSoloRaidScheduleWindow,
  type SoloRaidScheduleActionCandidate,
  type SoloRaidScheduleStatus,
} from "@/lib/solo-raid-schedule";

export const SOLO_RAID_SCHEDULE_COLUMNS =
  "id,raid_key,raid_label,description,image_path,starts_at,ends_at,status,created_by,created_at,updated_at,started_at,ended_at";

const RECOMMENDED_DECK_SNAPSHOT_KEY_PREFIX = "recommended_deck_snapshot_";
const MAX_DECK_CHARS = 5;
const MIN_RECOMMENDED_DECK_SCORE = 100_000_000;

export type SoloRaidScheduleRow = {
  id: string;
  raid_key: string;
  raid_label: string;
  description: string;
  image_path: string;
  starts_at: string;
  ends_at: string;
  status: SoloRaidScheduleStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
};

type AppConfigRow = {
  master_user_id: string | null;
  solo_raid_tabs: unknown;
};

type DeckRow = {
  chars: unknown;
  score: number | string | null;
};

type ScheduleServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string;
};

export function getScheduleServerEnv(): ScheduleServerEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return null;
  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

export function createScheduleAdminClient(env: ScheduleServerEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getUserIdFromCookies(env: ScheduleServerEnv) {
  const cookieStore = await cookies();
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options ?? {});
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function getScheduleMasterContext() {
  const env = getScheduleServerEnv();
  if (!env) return { error: "Supabase server env is not configured." as const, status: 500 };

  const admin = createScheduleAdminClient(env);
  const userId = await getUserIdFromCookies(env);
  if (!userId) return { error: "Unauthorized." as const, status: 401 };

  const { data, error } = await admin.from("app_config").select("master_user_id").limit(1).maybeSingle();
  if (error) return { error: "Failed to load app config." as const, status: 500 };
  if (!data?.master_user_id || data.master_user_id !== userId) return { error: "Forbidden." as const, status: 403 };

  return { env, admin, userId };
}

export function mapSoloRaidSchedule(row: SoloRaidScheduleRow) {
  return {
    id: row.id,
    raidKey: row.raid_key,
    raidLabel: row.raid_label,
    description: row.description,
    imagePath: row.image_path,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export function slugifyRaidLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDeckTabs(value: unknown): Array<{ key: string; label: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as { key?: unknown; label?: unknown };
      const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
      const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
      return key && label ? { key, label } : null;
    })
    .filter((item): item is { key: string; label: string } => item !== null);
}

export async function buildUniqueRaidKey(admin: SupabaseClient, label: string) {
  const baseKey = slugifyRaidLabel(label);
  if (!baseKey) return "";

  const used = new Set<string>();
  const { data: config } = await admin.from("app_config").select("solo_raid_tabs").limit(1).maybeSingle();
  for (const tab of normalizeDeckTabs((config as AppConfigRow | null)?.solo_raid_tabs)) used.add(tab.key);

  const { data: schedules } = await admin.from("solo_raid_schedules").select("raid_key");
  for (const schedule of (schedules ?? []) as Array<{ raid_key?: string | null }>) {
    if (schedule.raid_key) used.add(schedule.raid_key);
  }

  let key = baseKey;
  let suffix = 2;
  while (used.has(key)) {
    key = `${baseKey}-${suffix}`;
    suffix += 1;
  }
  return key;
}

function buildRecommendedDeckSnapshot(decks: readonly DeckRow[], raidKey: string, raidLabel: string) {
  const grouped = new Map<string, { chars: string[]; totalScore: number; usedCount: number }>();

  for (const deck of decks) {
    const chars = Array.isArray(deck.chars) ? deck.chars.filter((value): value is string => typeof value === "string") : [];
    const score = Number(deck.score);
    if (chars.length !== MAX_DECK_CHARS || !Number.isFinite(score) || score <= MIN_RECOMMENDED_DECK_SCORE) continue;
    const trimmed = chars.map((char) => char.trim());
    if (trimmed.some((char) => !char)) continue;
    const key = [...trimmed].sort((a, b) => a.localeCompare(b)).join("|");
    const existing = grouped.get(key);
    if (existing) {
      existing.totalScore += score;
      existing.usedCount += 1;
    } else {
      grouped.set(key, { chars: trimmed, totalScore: score, usedCount: 1 });
    }
  }

  const snapshot = {
    raidKey,
    raidLabel,
    updatedAt: Date.now(),
    decks: Array.from(grouped.entries())
      .map(([deckKey, group]) => ({
        deckKey,
        chars: group.chars,
        usedCount: group.usedCount,
        avgScore: group.totalScore / group.usedCount,
      }))
      .sort((a, b) => b.avgScore - a.avgScore || b.usedCount - a.usedCount),
  };

  return snapshot;
}

async function archiveRaid(admin: SupabaseClient, raidKey: string, raidLabel: string, endedAt: string) {
  const { count, error: countError } = await admin
    .from("raid_user_stats")
    .select("client_id", { count: "exact", head: true })
    .eq("raid_key", raidKey);
  if (countError) throw countError;

  const { error: archiveError } = await admin.from("raid_user_archives").upsert(
    {
      raid_key: raidKey,
      raid_label: raidLabel,
      user_count: count ?? 0,
      ended_at: endedAt,
      updated_at: endedAt,
    },
    { onConflict: "raid_key" }
  );
  if (archiveError) throw archiveError;

  const { error: closeStatsError } = await admin
    .from("raid_user_stats")
    .update({ ended_at: endedAt })
    .eq("raid_key", raidKey)
    .is("ended_at", null);
  if (closeStatsError) throw closeStatsError;

  const { data: deckRows, error: decksError } = await admin.from("decks").select("chars,score").eq("raid_key", raidKey);
  if (decksError) throw decksError;

  const snapshot = buildRecommendedDeckSnapshot((deckRows ?? []) as DeckRow[], raidKey, raidLabel);
  const { data: config } = await admin.from("app_config").select("master_user_id").limit(1).maybeSingle();
  const { error: snapshotError } = await admin.from("site_settings").upsert(
    {
      key: `${RECOMMENDED_DECK_SNAPSHOT_KEY_PREFIX}${raidKey}`,
      value: JSON.stringify(snapshot),
      updated_by: (config as { master_user_id?: string | null } | null)?.master_user_id ?? null,
      updated_at: endedAt,
    },
    { onConflict: "key" }
  );
  if (snapshotError) throw snapshotError;
}

async function startSchedule(admin: SupabaseClient, schedule: SoloRaidScheduleRow, nowIso: string) {
  const { data: config, error: configError } = await admin
    .from("app_config")
    .select("master_user_id,solo_raid_tabs")
    .limit(1)
    .maybeSingle();
  if (configError) throw configError;
  if (!config?.master_user_id) throw new Error("app_config master_user_id is required.");

  const tabs = normalizeDeckTabs((config as AppConfigRow).solo_raid_tabs);
  const nextTabs = tabs.some((tab) => tab.key === schedule.raid_key)
    ? tabs
    : [...tabs, { key: schedule.raid_key, label: schedule.raid_label }];

  const { error: bossError } = await admin.from("bosses").insert({
    title: schedule.raid_label,
    description: schedule.description,
    image_path: schedule.image_path,
    starts_at: schedule.starts_at,
    ends_at: schedule.ends_at,
  });
  if (bossError) throw bossError;

  const { error: updateConfigError } = await admin
    .from("app_config")
    .update({
      solo_raid_tabs: nextTabs,
      active_raid_key: schedule.raid_key,
      solo_raid_active: true,
    })
    .eq("master_user_id", config.master_user_id);
  if (updateConfigError) throw updateConfigError;

  const { error: updateScheduleError } = await admin
    .from("solo_raid_schedules")
    .update({ status: "active", started_at: nowIso, updated_at: nowIso })
    .eq("id", schedule.id)
    .eq("status", "scheduled");
  if (updateScheduleError) throw updateScheduleError;
}

async function endSchedule(admin: SupabaseClient, schedule: SoloRaidScheduleRow, nowIso: string) {
  await archiveRaid(admin, schedule.raid_key, schedule.raid_label, nowIso);

  const { data: config, error: configError } = await admin.from("app_config").select("master_user_id").limit(1).maybeSingle();
  if (configError) throw configError;
  if (!config?.master_user_id) throw new Error("app_config master_user_id is required.");

  const { error: configUpdateError } = await admin
    .from("app_config")
    .update({ solo_raid_active: false, active_raid_key: schedule.raid_key })
    .eq("master_user_id", config.master_user_id);
  if (configUpdateError) throw configUpdateError;

  const { error: scheduleUpdateError } = await admin
    .from("solo_raid_schedules")
    .update({ status: "completed", ended_at: nowIso, updated_at: nowIso })
    .eq("id", schedule.id)
    .eq("status", "active");
  if (scheduleUpdateError) throw scheduleUpdateError;
}

function toActionCandidate(row: SoloRaidScheduleRow): SoloRaidScheduleActionCandidate {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function processSoloRaidSchedules(admin: SupabaseClient, now = new Date()) {
  const nowIso = now.toISOString();
  const { data, error } = await admin
    .from("solo_raid_schedules")
    .select(SOLO_RAID_SCHEDULE_COLUMNS)
    .in("status", ["scheduled", "active"]);
  if (error) throw error;

  const rows = (data ?? []) as SoloRaidScheduleRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const actions = selectDueSoloRaidScheduleActions(rows.map(toActionCandidate), nowIso);
  const ended: string[] = [];
  const started: string[] = [];

  for (const candidate of actions.ends) {
    const row = byId.get(candidate.id);
    if (!row) continue;
    await endSchedule(admin, row, nowIso);
    ended.push(row.id);
  }

  const activeAfterEnds = rows.some(
    (row) => row.status === "active" && !ended.includes(row.id) && Date.parse(row.ends_at) > Date.parse(nowIso)
  );
  if (actions.start && !activeAfterEnds) {
    const row = byId.get(actions.start.id);
    if (row) {
      const validation = validateSoloRaidScheduleWindow(row.starts_at, row.ends_at);
      if (validation.ok) {
        await startSchedule(admin, row, nowIso);
        started.push(row.id);
      }
    }
  }

  return { ok: true, started, ended };
}
