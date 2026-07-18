import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createDefaultTierBoard,
  normalizeTierBoard,
  type TierBoardData,
  type TierRow,
} from "../../../lib/nikke-tier";
import { SUBMASTER_USER_ID } from "../../../lib/submaster";

type TierBoardRow = {
  section_name: string;
  rows: unknown;
  updated_at: string;
};

export type TierBoardServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string;
};

export function getTierBoardServerEnv(): TierBoardServerEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && supabaseAnonKey && serviceRoleKey
    ? { supabaseUrl, supabaseAnonKey, serviceRoleKey }
    : null;
}

export function createTierBoardAdminClient(env: TierBoardServerEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getTierBoardUserId(env: TierBoardServerEnv) {
  const cookieStore = await cookies();
  const client = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) =>
        items.forEach(({ name, value, options }) => cookieStore.set(name, value, options ?? {})),
    },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user?.id ?? null;
}

export async function canEditTierBoard(admin: SupabaseClient, userId: string | null) {
  if (!userId) return false;
  if (userId === SUBMASTER_USER_ID) return true;
  const { data, error } = await admin
    .from("app_config")
    .select("master_user_id")
    .eq("master_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function mapTierBoardRow(row: TierBoardRow | null, validNikkeNames?: ReadonlySet<string>) {
  if (!row) return createDefaultTierBoard();
  return normalizeTierBoard(
    {
      sectionName: row.section_name,
      rows: row.rows,
      updatedAt: row.updated_at,
    },
    validNikkeNames
  );
}

export async function loadTierBoard(admin: SupabaseClient, validNikkeNames?: ReadonlySet<string>) {
  const { data, error } = await admin
    .from("nikke_tier_board")
    .select("section_name,rows,updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return mapTierBoardRow(data as TierBoardRow | null, validNikkeNames);
}

export async function loadValidNikkeNames(admin: SupabaseClient) {
  const { data, error } = await admin.from("nikkes").select("name");
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((row) => (typeof row.name === "string" ? row.name.trim() : ""))
      .filter(Boolean)
  );
}

export type SaveTierBoardInput = {
  sectionName?: unknown;
  rows?: unknown;
  expectedUpdatedAt?: unknown;
};

export type SaveTierBoardResult =
  | { kind: "saved"; board: TierBoardData }
  | { kind: "conflict"; board: TierBoardData };

export async function saveTierBoard(
  admin: SupabaseClient,
  userId: string,
  input: SaveTierBoardInput
): Promise<SaveTierBoardResult> {
  const validNikkeNames = await loadValidNikkeNames(admin);
  const current = await loadTierBoard(admin, validNikkeNames);
  const expectedUpdatedAt =
    typeof input.expectedUpdatedAt === "string" ? input.expectedUpdatedAt : null;

  if (current.updatedAt !== expectedUpdatedAt) {
    return { kind: "conflict", board: current };
  }

  const normalized = normalizeTierBoard(
    {
      sectionName: input.sectionName,
      rows: input.rows,
      updatedAt: current.updatedAt,
    },
    validNikkeNames
  );
  const payload = {
    id: 1,
    section_name: normalized.sectionName,
    rows: normalized.rows satisfies TierRow[],
    updated_by: userId,
  };

  if (current.updatedAt) {
    const { data, error } = await admin
      .from("nikke_tier_board")
      .update(payload)
      .eq("id", 1)
      .eq("updated_at", current.updatedAt)
      .select("section_name,rows,updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { kind: "conflict", board: await loadTierBoard(admin, validNikkeNames) };
    return { kind: "saved", board: mapTierBoardRow(data as TierBoardRow, validNikkeNames) };
  }

  const { data, error } = await admin
    .from("nikke_tier_board")
    .insert(payload)
    .select("section_name,rows,updated_at")
    .single();
  if (error?.code === "23505") {
    return { kind: "conflict", board: await loadTierBoard(admin, validNikkeNames) };
  }
  if (error) throw error;
  return { kind: "saved", board: mapTierBoardRow(data as TierBoardRow, validNikkeNames) };
}
