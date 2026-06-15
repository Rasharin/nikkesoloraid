import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type AppConfigRow = {
  master_user_id: string | null;
  active_raid_key: string | null;
  solo_raid_active: boolean | null;
};

type BossUserStat = {
  raidKey: string;
  raidLabel: string;
  userCount: number;
  active: boolean;
  endedAt: number | null;
};

function getServerEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

function toTime(value: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  const env = getServerEnv();
  if (!env) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });
  }

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (userError || !userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: configData, error: configError } = await admin
    .from("app_config")
    .select("master_user_id,active_raid_key,solo_raid_active")
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error("[admin/user-stats] app_config fetch failed", configError);
    return NextResponse.json({ error: "Failed to load app config." }, { status: 500 });
  }

  const config = configData as AppConfigRow | null;
  if (!config?.master_user_id || config.master_user_id !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [totalResult, activeResult, archiveResult] = await Promise.all([
    admin.from("site_user_stats").select("client_id", { count: "exact", head: true }),
    admin.from("raid_user_stats").select("raid_key,raid_label,ended_at"),
    admin.from("raid_user_archives").select("raid_key,raid_label,user_count,ended_at"),
  ]);

  if (totalResult.error) {
    console.error("[admin/user-stats] site count failed", totalResult.error);
    return NextResponse.json({ error: "Failed to load total stats." }, { status: 500 });
  }
  if (activeResult.error) {
    console.error("[admin/user-stats] raid stats fetch failed", activeResult.error);
    return NextResponse.json({ error: "Failed to load raid stats." }, { status: 500 });
  }
  if (archiveResult.error) {
    console.error("[admin/user-stats] raid archives fetch failed", archiveResult.error);
    return NextResponse.json({ error: "Failed to load raid archives." }, { status: 500 });
  }

  const soloRaidInProgress = Boolean(config.solo_raid_active && config.active_raid_key);
  const isCurrentActiveRaid = (raidKey: string | null) =>
    Boolean(raidKey && soloRaidInProgress && raidKey === config.active_raid_key);
  const byRaid = new Map<string, BossUserStat>();
  const archivedRaidKeys = new Set<string>();

  for (const row of (activeResult.data ?? []) as Array<{ raid_key: string | null; raid_label: string | null; ended_at: string | null }>) {
    if (!row.raid_key) continue;
    const existing = byRaid.get(row.raid_key);
    byRaid.set(row.raid_key, {
      raidKey: row.raid_key,
      raidLabel: row.raid_label?.trim() || row.raid_key,
      userCount: (existing?.userCount ?? 0) + 1,
      active: Boolean(existing?.active) || (isCurrentActiveRaid(row.raid_key) && !row.ended_at),
      endedAt: Math.max(existing?.endedAt ?? 0, toTime(row.ended_at) ?? 0) || null,
    });
  }

  for (const row of (archiveResult.data ?? []) as Array<{
    raid_key: string | null;
    raid_label: string | null;
    user_count: number | string | null;
    ended_at: string | null;
  }>) {
    if (!row.raid_key) continue;
    const archivedCount = Number(row.user_count);
    if (!Number.isFinite(archivedCount) || archivedCount < 0) continue;
    const existing = byRaid.get(row.raid_key);
    archivedRaidKeys.add(row.raid_key);
    byRaid.set(row.raid_key, {
      raidKey: row.raid_key,
      raidLabel: row.raid_label?.trim() || existing?.raidLabel || row.raid_key,
      userCount: isCurrentActiveRaid(row.raid_key) ? Math.max(existing?.userCount ?? 0, archivedCount) : archivedCount,
      active: isCurrentActiveRaid(row.raid_key) && Boolean(existing?.active),
      endedAt: toTime(row.ended_at) ?? existing?.endedAt ?? null,
    });
  }

  const bossUserStats = Array.from(byRaid.values())
    .map((stat) =>
      archivedRaidKeys.has(stat.raidKey) && !isCurrentActiveRaid(stat.raidKey)
        ? { ...stat, active: false }
        : stat
    )
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.endedAt ?? 0) - (a.endedAt ?? 0);
    });

  return NextResponse.json({
    totalUserCount: totalResult.count ?? 0,
    bossUserStats,
  });
}
