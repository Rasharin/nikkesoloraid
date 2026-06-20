import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getServerEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

export async function GET(request: Request) {
  const env = getServerEnv();
  if (!env) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const raidKey = url.searchParams.get("raidKey")?.trim() ?? "";
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

  const { data, error } = await admin
    .from("decks")
    .select("id,user_id,raid_key,deck_key,chars,score,created_at")
    .eq("raid_key", raidKey)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[recommendations/decks] decks fetch failed", error);
    return NextResponse.json({ error: "Failed to load recommendation decks." }, { status: 500 });
  }

  const decks = (data ?? []).map((deck) => ({
    ...deck,
    note: null,
  }));

  return NextResponse.json({ decks });
}
