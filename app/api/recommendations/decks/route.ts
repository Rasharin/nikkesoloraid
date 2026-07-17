import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isDeckHiddenAfterModeration } from "@/lib/recommend";

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

  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await admin
    .from("decks")
    .select("id,user_id,raid_key,deck_key,chars,score,created_at,updated_at")
    .eq("raid_key", raidKey)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[recommendations/decks] decks fetch failed", error);
    return NextResponse.json({ error: "Failed to load recommendation decks." }, { status: 500 });
  }

  const userIds = [...new Set((data ?? []).map((deck) => deck.user_id))];
  const deckIds = (data ?? []).map((deck) => deck.id);
  const [{ data: blockedRows }, { data: moderationRows }] = await Promise.all([
    userIds.length
      ? admin.from("recommendation_blocked_users").select("user_id").in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    deckIds.length
      ? admin
          .from("recommendation_deck_moderations")
          .select("deck_id,hidden_deck_updated_at")
          .in("deck_id", deckIds)
      : Promise.resolve({ data: [] }),
  ]);
  const blocked = new Set((blockedRows ?? []).map((row) => row.user_id));
  const moderationByDeck = new Map((moderationRows ?? []).map((row) => [row.deck_id, row.hidden_deck_updated_at]));

  const decks = (data ?? [])
    .filter((deck) => !blocked.has(deck.user_id))
    .filter((deck) => {
      const hiddenVersion = moderationByDeck.get(deck.id);
      return !hiddenVersion || !isDeckHiddenAfterModeration(deck.updated_at, hiddenVersion);
    })
    .map((deck) => ({
      id: deck.id,
      user_id: "",
      raid_key: deck.raid_key,
      deck_key: deck.deck_key,
      chars: deck.chars,
      score: deck.score,
      created_at: deck.created_at,
      note: null,
    }));

  return NextResponse.json({ decks });
}
