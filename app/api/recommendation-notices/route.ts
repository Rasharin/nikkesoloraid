import { NextResponse } from "next/server";
import { RECOMMENDATION_MODERATION_NOTICE } from "@/lib/recommendation-moderation";
import {
  createRecommendationAdminClient,
  getRecommendationServerEnv,
  getRecommendationUserId,
} from "../admin/recommendations/recommendation-server";

export async function GET() {
  const env = getRecommendationServerEnv();
  if (!env) return NextResponse.json({ error: "Server env is not configured." }, { status: 500 });
  const userId = await getRecommendationUserId(env);
  if (!userId) return NextResponse.json({ notice: null });
  const admin = createRecommendationAdminClient(env);
  const { data, error } = await admin
    .from("recommendation_moderation_notices")
    .select("id")
    .eq("user_id", userId)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to load notice." }, { status: 500 });
  return NextResponse.json({ notice: data ? { id: data.id, message: RECOMMENDATION_MODERATION_NOTICE } : null });
}

export async function PATCH(request: Request) {
  const env = getRecommendationServerEnv();
  if (!env) return NextResponse.json({ error: "Server env is not configured." }, { status: 500 });
  const userId = await getRecommendationUserId(env);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json();
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const admin = createRecommendationAdminClient(env);
  const { error } = await admin
    .from("recommendation_moderation_notices")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: "Failed to acknowledge notice." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
