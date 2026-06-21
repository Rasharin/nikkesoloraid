import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ContactPostDetail, ContactPostSummary, ContactPostStatus, ContactPostVisibility } from "@/lib/contact-board";

export type ContactPostRow = {
  id: string;
  title: string | null;
  content: string | null;
  visibility: ContactPostVisibility | string | null;
  status: ContactPostStatus | string | null;
  password_hash: string | null;
  user_id: string | null;
  reply_content: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string;
};

export function getContactServerEnv(): ServerEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return null;
  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

export function createContactAdminClient(env: ServerEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getOptionalUserId(env: ServerEnv): Promise<string | null> {
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
  if (error || !data.user?.id) return null;
  return data.user.id;
}

export async function isMasterUser(admin: SupabaseClient, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await admin
    .from("app_config")
    .select("master_user_id")
    .eq("master_user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function toTime(value: string | null | undefined): number {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function hasReply(row: ContactPostRow): boolean {
  return Boolean(row.reply_content?.trim());
}

export function canOpenContactPost(row: ContactPostRow, userId: string | null, isMaster: boolean): boolean {
  return row.visibility === "public" || isMaster || Boolean(userId && row.user_id && userId === row.user_id);
}

export function mapContactPostSummary(row: ContactPostRow, userId: string | null, isMaster: boolean): ContactPostSummary {
  const createdAt = toTime(row.created_at);
  const updatedAt = toTime(row.updated_at) || createdAt;
  const visibility = row.visibility === "public" ? "public" : "private";
  const status = row.status === "resolved" ? "resolved" : "received";

  return {
    id: row.id,
    title: row.title?.trim() || "제목 없음",
    visibility,
    status,
    createdAt,
    updatedAt,
    userId: row.user_id,
    hasReply: hasReply(row),
    canOpen: canOpenContactPost({ ...row, visibility }, userId, isMaster),
  };
}

export function mapContactPostDetail(row: ContactPostRow, userId: string | null, isMaster: boolean): ContactPostDetail {
  const summary = mapContactPostSummary(row, userId, isMaster);
  const repliedAt = row.replied_at ? Date.parse(row.replied_at) : NaN;
  return {
    ...summary,
    content: row.content?.trim() ?? "",
    replyContent: row.reply_content?.trim() || null,
    repliedAt: Number.isFinite(repliedAt) ? repliedAt : null,
  };
}
