import { NextResponse } from "next/server";
import { buildDeckKey, isDeckHiddenAfterModeration } from "@/lib/recommend";
import { parseModerationAction, parsePositiveSafeScore } from "@/lib/recommendation-moderation";
import {
  createRecommendationAdminClient,
  getRecommendationServerEnv,
  getRecommendationUserId,
  requireMaster,
} from "./recommendation-server";

async function context() {
  const env = getRecommendationServerEnv();
  if (!env) return null;
  const userId = await getRecommendationUserId(env);
  const admin = createRecommendationAdminClient(env);
  if (!(await requireMaster(admin, userId))) return null;
  return { admin, userId: userId! };
}

export async function GET(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const url = new URL(request.url);
    const raidKey = url.searchParams.get("raidKey")?.trim() ?? "";
    const deckKey = url.searchParams.get("deckKey")?.trim() ?? "";
    if (!raidKey || !deckKey) return NextResponse.json({ error: "raidKey and deckKey are required." }, { status: 400 });

    const { data: decks, error } = await ctx.admin
      .from("decks")
      .select("id,user_id,raid_key,deck_key,chars,score,created_at,updated_at")
      .eq("raid_key", raidKey)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const matching = (decks ?? []).filter((deck) => Array.isArray(deck.chars) && buildDeckKey(deck.chars) === deckKey);
    const deckIds = matching.map((deck) => deck.id);
    const userIds = [...new Set(matching.map((deck) => deck.user_id))];
    const [{ data: moderations }, { data: blocked }] = await Promise.all([
      deckIds.length
        ? ctx.admin.from("recommendation_deck_moderations").select("deck_id,hidden_at,hidden_deck_updated_at").in("deck_id", deckIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? ctx.admin.from("recommendation_blocked_users").select("user_id,blocked_at").in("user_id", userIds)
        : Promise.resolve({ data: [] }),
    ]);
    const moderationByDeck = new Map((moderations ?? []).map((row) => [row.deck_id, row]));
    const blockedByUser = new Map((blocked ?? []).map((row) => [row.user_id, row]));

    const emails = new Map<string, string>();
    await Promise.all(userIds.map(async (id) => {
      const { data } = await ctx.admin.auth.admin.getUserById(id);
      emails.set(id, data.user?.email ?? id);
    }));

    return NextResponse.json({
      records: matching.map((deck) => ({
        id: deck.id,
        userId: deck.user_id,
        userLabel: emails.get(deck.user_id) ?? deck.user_id,
        score: Number(deck.score),
        createdAt: deck.created_at,
        updatedAt: deck.updated_at,
        hidden: (() => {
          const moderation = moderationByDeck.get(deck.id);
          return moderation
            ? isDeckHiddenAfterModeration(deck.updated_at, moderation.hidden_deck_updated_at)
            : false;
        })(),
        blocked: Boolean(blockedByUser.get(deck.user_id)),
      })),
    });
  } catch (error) {
    console.error("[admin/recommendations] GET failed", error);
    return NextResponse.json({ error: "Failed to load records." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await request.json();
    const action = parseModerationAction(body?.action);
    const deckId = typeof body?.deckId === "string" ? body.deckId.trim() : "";
    if (!action || !deckId) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

    const { data: deck, error: deckError } = await ctx.admin
      .from("decks")
      .select("id,user_id,chars,score,updated_at")
      .eq("id", deckId)
      .maybeSingle();
    if (deckError) throw deckError;
    if (!deck) return NextResponse.json({ error: "Deck not found." }, { status: 404 });

    if (action === "hide") {
      const { error } = await ctx.admin.from("recommendation_deck_moderations").upsert({
        deck_id: deck.id,
        user_id: deck.user_id,
        hidden_by: ctx.userId,
        hidden_at: new Date().toISOString(),
        hidden_deck_updated_at: deck.updated_at,
      });
      if (error) throw error;
      const { error: noticeError } = await ctx.admin.from("recommendation_moderation_notices").upsert(
        {
          user_id: deck.user_id,
          deck_id: deck.id,
          deck_chars: deck.chars,
          deck_score: deck.score,
          created_at: new Date().toISOString(),
          acknowledged_at: null,
        },
        { onConflict: "user_id,deck_id" }
      );
      if (noticeError) throw noticeError;
    } else if (action === "update_score") {
      const score = parsePositiveSafeScore(body?.score);
      if (score === null) return NextResponse.json({ error: "Invalid score." }, { status: 400 });
      const { error } = await ctx.admin.from("decks").update({ score }).eq("id", deck.id);
      if (error) throw error;
      await ctx.admin.from("recommendation_deck_moderations").delete().eq("deck_id", deck.id);
    } else if (action === "delete") {
      const { error } = await ctx.admin.from("decks").delete().eq("id", deck.id);
      if (error) throw error;
    } else {
      const { error } = await ctx.admin.from("recommendation_blocked_users").upsert({
        user_id: deck.user_id,
        blocked_by: ctx.userId,
        blocked_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/recommendations] PATCH failed", error);
    return NextResponse.json({ error: "Failed to update recommendation data." }, { status: 500 });
  }
}
