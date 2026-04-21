import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function normalizeCookieOptions(value: string, options: Record<string, unknown>) {
  const next = { ...options } as Record<string, unknown>;
  const isDeleteCookie = value === "" || options.maxAge === 0;
  if (!isDeleteCookie) {
    delete next.maxAge;
    delete next.expires;
  }
  return next;
}

function isMissingRelationError(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되지 않았습니다." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, normalizeCookieOptions(value, (options ?? {}) as Record<string, unknown>));
        });
      },
    },
  });

  const { data, error: userError } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (userError || !userId) {
    return NextResponse.json({ error: "로그인 정보가 없습니다." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const cleanupTables = [
    "solo_raid_recommendations",
    "favorite_nikkes",
    "decks",
    "solo_raid_tips",
    "usage_posts",
  ];

  for (const table of cleanupTables) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error && !isMissingRelationError(error)) {
      console.error(`[account/delete] ${table} cleanup failed`, error);
      return NextResponse.json({ error: `${table} 삭제 중 오류가 발생했습니다.` }, { status: 500 });
    }
  }

  const { error: contactError } = await admin.from("contact_inquiries").update({ user_id: null }).eq("user_id", userId);
  if (contactError && !isMissingRelationError(contactError)) {
    console.error("[account/delete] contact_inquiries cleanup failed", contactError);
    return NextResponse.json({ error: "문의 데이터 정리 중 오류가 발생했습니다." }, { status: 500 });
  }

  const { error: settingsError } = await admin.from("site_settings").update({ updated_by: null }).eq("updated_by", userId);
  if (settingsError && !isMissingRelationError(settingsError)) {
    console.error("[account/delete] site_settings cleanup failed", settingsError);
    return NextResponse.json({ error: "설정 데이터 정리 중 오류가 발생했습니다." }, { status: 500 });
  }

  const { error: appConfigError } = await admin.from("app_config").update({ master_user_id: null }).eq("master_user_id", userId);
  if (appConfigError && !isMissingRelationError(appConfigError)) {
    console.error("[account/delete] app_config cleanup failed", appConfigError);
    return NextResponse.json({ error: "관리자 설정 정리 중 오류가 발생했습니다." }, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("[account/delete] auth user deletion failed", deleteError);
    return NextResponse.json({ error: "계정 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
