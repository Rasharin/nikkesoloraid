import { NextResponse } from "next/server";
import {
  createRecommendationAdminClient,
  getRecommendationServerEnv,
  getRecommendationUserId,
  requireMaster,
} from "../recommendations/recommendation-server";

async function context() {
  const env = getRecommendationServerEnv();
  if (!env) return null;
  const userId = await getRecommendationUserId(env);
  const admin = createRecommendationAdminClient(env);
  return (await requireMaster(admin, userId)) ? { admin } : null;
}

export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data, error } = await ctx.admin
      .from("recommendation_blocked_users")
      .select("user_id,blocked_at")
      .order("blocked_at", { ascending: false });
    if (error) throw error;
    const users = await Promise.all((data ?? []).map(async (row) => {
      const { data: authData } = await ctx.admin.auth.admin.getUserById(row.user_id);
      return { userId: row.user_id, userLabel: authData.user?.email ?? row.user_id, blockedAt: row.blocked_at };
    }));
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[admin/blocked-users] GET failed", error);
    return NextResponse.json({ error: "Failed to load blocked users." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
    if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
    const { error } = await ctx.admin.from("recommendation_blocked_users").delete().eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/blocked-users] DELETE failed", error);
    return NextResponse.json({ error: "Failed to unblock user." }, { status: 500 });
  }
}

