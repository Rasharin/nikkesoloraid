import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type ArchiveRequest = {
  raidKey?: unknown;
  raidLabel?: unknown;
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

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as ArchiveRequest;
  const raidKey = typeof body.raidKey === "string" ? body.raidKey.trim() : "";
  const raidLabel = typeof body.raidLabel === "string" && body.raidLabel.trim() ? body.raidLabel.trim() : raidKey;

  if (!raidKey) {
    return NextResponse.json({ error: "raidKey is required." }, { status: 400 });
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

  const { data: config, error: configError } = await admin
    .from("app_config")
    .select("master_user_id")
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error("[admin/raid-stats/archive] app_config fetch failed", configError);
    return NextResponse.json({ error: "Failed to load app config." }, { status: 500 });
  }

  if (!config?.master_user_id || config.master_user_id !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const endedAt = new Date().toISOString();
  const { count, error: countError } = await admin
    .from("raid_user_stats")
    .select("client_id", { count: "exact", head: true })
    .eq("raid_key", raidKey);

  if (countError) {
    console.error("[admin/raid-stats/archive] count failed", countError);
    return NextResponse.json({ error: "Failed to count raid users." }, { status: 500 });
  }

  const { error: archiveError } = await admin.from("raid_user_archives").upsert(
    {
      raid_key: raidKey,
      raid_label: raidLabel,
      user_count: count ?? 0,
      ended_at: endedAt,
    },
    { onConflict: "raid_key" }
  );

  if (archiveError) {
    console.error("[admin/raid-stats/archive] archive upsert failed", archiveError);
    return NextResponse.json({ error: "Failed to archive raid stats." }, { status: 500 });
  }

  const { error: closeStatsError } = await admin
    .from("raid_user_stats")
    .update({ ended_at: endedAt })
    .eq("raid_key", raidKey)
    .is("ended_at", null);

  if (closeStatsError) {
    console.error("[admin/raid-stats/archive] close stats failed", closeStatsError);
    return NextResponse.json({ error: "Failed to close raid stats." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userCount: count ?? 0, endedAt });
}
