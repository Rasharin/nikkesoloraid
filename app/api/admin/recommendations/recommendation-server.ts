import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RecommendationServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string;
};

export function getRecommendationServerEnv(): RecommendationServerEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && supabaseAnonKey && serviceRoleKey
    ? { supabaseUrl, supabaseAnonKey, serviceRoleKey }
    : null;
}

export function createRecommendationAdminClient(env: RecommendationServerEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getRecommendationUserId(env: RecommendationServerEnv): Promise<string | null> {
  const cookieStore = await cookies();
  const client = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options ?? {})),
    },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user?.id ?? null;
}

export async function requireMaster(admin: SupabaseClient, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await admin
    .from("app_config")
    .select("master_user_id")
    .eq("master_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

