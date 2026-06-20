import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type RecommendationRankRow = {
  user_id: string | null;
  total: number | string | null;
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

function calculateRank(currentUserId: string, currentTotal: number, rows: readonly RecommendationRankRow[]) {
  const totalsByUser = new Map<string, number>();

  for (const row of rows) {
    const userId = row.user_id?.trim() ?? "";
    const total = Number(row.total);
    if (!userId || !Number.isFinite(total) || total <= 0) continue;
    totalsByUser.set(userId, total);
  }

  totalsByUser.set(currentUserId, currentTotal);
  const totals = Array.from(totalsByUser.values()).sort((a, b) => b - a);
  const rank = totals.findIndex((total) => total <= currentTotal) + 1;

  return {
    rank: rank === 0 ? totals.length + 1 : rank,
    total: totals.length,
  };
}

export async function GET(request: Request) {
  const env = getServerEnv();
  if (!env) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const raidKey = url.searchParams.get("raidKey")?.trim() ?? "";
  const currentTotal = Number(url.searchParams.get("currentTotal") ?? "");

  if (!raidKey) {
    return NextResponse.json({ error: "raidKey is required." }, { status: 400 });
  }
  if (!Number.isFinite(currentTotal) || currentTotal <= 0 || !Number.isSafeInteger(currentTotal)) {
    return NextResponse.json({ error: "currentTotal must be a positive safe integer." }, { status: 400 });
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
    .from("solo_raid_recommendations")
    .select("user_id,total")
    .eq("raid_key", raidKey);

  if (error) {
    console.error("[recommendations/rank] recommendation totals fetch failed", error);
    return NextResponse.json({ error: "Failed to load recommendation rank." }, { status: 500 });
  }

  return NextResponse.json(calculateRank(userId, currentTotal, (data ?? []) as RecommendationRankRow[]));
}
