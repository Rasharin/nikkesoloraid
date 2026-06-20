import { supabase } from "./supabase";

export const MIN_RECOMMENDED_DECK_SCORE = 100_000_000;
export const MAX_RECOMMENDED_DECK_COUNT = 5;
export const MAX_DECK_CHARS = 5;

export type RecommendationSourceDeck = {
  id: string;
  raidKey: string;
  deckKey: string;
  chars: string[];
  score: number;
  createdAt: number;
};

export type AggregatedRecommendedDeck = {
  deckKey: string;
  chars: string[];
  usedCount: number;
  avgScore: number;
};

export type RecommendedDeckSnapshotLike = {
  decks: readonly AggregatedRecommendedDeck[];
} | null | undefined;

export type RecommendationRankData = {
  rank: number;
  total: number;
};

export type RecommendationRankRow = {
  userId: string;
  total: number;
};

type DeckRow = {
  id: string;
  user_id: string;
  raid_key: string | null;
  deck_key: string | null;
  chars: unknown;
  score: number | string | bigint | null;
  created_at: string | null;
};

function normToken(s: string) {
  return s.replace(/\s+/g, "").trim().toLowerCase();
}

export function buildDeckKey(chars: readonly string[]) {
  return [...chars].map((char) => char.trim()).sort((a, b) => a.localeCompare(b)).join("|");
}

export function getCommunityRaidDecksCacheKey(raidKey: string, isAuthenticated: boolean) {
  const normalizedRaidKey = raidKey.trim();
  if (!normalizedRaidKey) return "";
  return `${isAuthenticated ? "auth" : "anon"}:${normalizedRaidKey}`;
}

export function compareAggregatedRecommendedDecksByScore(a: AggregatedRecommendedDeck, b: AggregatedRecommendedDeck) {
  if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
  return b.usedCount - a.usedCount;
}

export function aggregateRecommendedDecks<T extends { chars: string[]; score: number }>(
  decks: readonly T[],
  options: { minScore?: number } = {}
): AggregatedRecommendedDeck[] {
  const minScore = options.minScore ?? MIN_RECOMMENDED_DECK_SCORE;
  const grouped = new Map<string, {
    orderCounts: Map<string, { chars: string[]; count: number }>;
    totalScore: number;
    usedCount: number;
  }>();

  for (const deck of decks) {
    if (!Number.isFinite(deck.score) || deck.score <= minScore) continue;
    if (!Array.isArray(deck.chars) || deck.chars.length !== MAX_DECK_CHARS) continue;

    const trimmedChars = deck.chars.map((char) => char.trim());
    if (trimmedChars.some((char) => char.length === 0)) continue;

    const normalizedChars = [...trimmedChars].sort((a, b) => a.localeCompare(b));
    const key = buildDeckKey(normalizedChars);
    const orderKey = trimmedChars.join("|");

    const existing = grouped.get(key);
    if (existing) {
      existing.totalScore += deck.score;
      existing.usedCount += 1;
      const orderEntry = existing.orderCounts.get(orderKey);
      if (orderEntry) {
        orderEntry.count += 1;
      } else {
        existing.orderCounts.set(orderKey, { chars: trimmedChars, count: 1 });
      }
      continue;
    }

    const orderCounts = new Map<string, { chars: string[]; count: number }>();
    orderCounts.set(orderKey, { chars: trimmedChars, count: 1 });
    grouped.set(key, { orderCounts, totalScore: deck.score, usedCount: 1 });
  }

  return Array.from(grouped.entries())
    .map(([deckKey, group]) => {
      let bestChars: string[] = [];
      let bestCount = 0;
      for (const { chars, count } of group.orderCounts.values()) {
        if (count > bestCount) {
          bestCount = count;
          bestChars = chars;
        }
      }
      return {
        deckKey,
        chars: bestChars,
        usedCount: group.usedCount,
        avgScore: group.totalScore / group.usedCount,
      };
    })
    .sort(compareAggregatedRecommendedDecksByScore);
}

export function chooseDisplayedRecommendedDecks({
  liveDecks,
  snapshot,
  isAuthenticated,
}: {
  liveDecks: readonly AggregatedRecommendedDeck[];
  snapshot?: RecommendedDeckSnapshotLike;
  isAuthenticated: boolean;
}): AggregatedRecommendedDeck[] {
  if (isAuthenticated && liveDecks.length > 0) return [...liveDecks].sort(compareAggregatedRecommendedDecksByScore);
  const snapshotDecks = snapshot?.decks ?? [];
  if (snapshotDecks.length > 0) return [...snapshotDecks].sort(compareAggregatedRecommendedDecksByScore);
  return [...liveDecks].sort(compareAggregatedRecommendedDecksByScore);
}

export function calculateRecommendationRank({
  currentUserId,
  currentTotal,
  rows,
}: {
  currentUserId: string;
  currentTotal: number;
  rows: readonly RecommendationRankRow[];
}): RecommendationRankData | null {
  if (!currentUserId.trim() || !Number.isFinite(currentTotal) || currentTotal <= 0) return null;

  const totalsByUser = new Map<string, number>();
  for (const row of rows) {
    const userId = row.userId.trim();
    if (!userId || !Number.isFinite(row.total) || row.total <= 0) continue;
    totalsByUser.set(userId, row.total);
  }
  totalsByUser.set(currentUserId.trim(), currentTotal);

  const totals = Array.from(totalsByUser.values()).sort((a, b) => b - a);
  if (totals.length === 0) return null;

  const rank = totals.findIndex((total) => total <= currentTotal) + 1;
  return {
    rank: rank === 0 ? totals.length + 1 : rank,
    total: totals.length,
  };
}

export function formatRecommendationRankLabel(rankData: RecommendationRankData): string {
  if (rankData.total <= 0) return "-";
  if (rankData.rank <= 100) return `${rankData.rank}위`;
  return `상위 ${Math.ceil((rankData.rank / rankData.total) * 100)}%`;
}

function deckCharSet(chars: readonly string[]): Set<string> {
  const set = new Set<string>();
  for (const char of chars) set.add(normToken(char));
  return set;
}

function hasOverlap(a: Set<string>, b: Set<string>) {
  for (const value of a) if (b.has(value)) return true;
  return false;
}

function toSafeScore(value: number | string | bigint | null): number | null {
  if (value === null) return null;

  if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    const score = Number(value);
    return Number.isSafeInteger(score) ? score : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const score = Number(trimmed);
    return Number.isSafeInteger(score) ? score : null;
  }

  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) return null;
  return value;
}

function normalizeChars(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const chars = value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  if (chars.length !== MAX_DECK_CHARS) return null;
  if (new Set(chars.map(normToken)).size !== MAX_DECK_CHARS) return null;
  return chars;
}

function mapDeckRow(row: DeckRow): RecommendationSourceDeck | null {
  const raidKey = typeof row.raid_key === "string" ? row.raid_key.trim() : "";
  if (!row.id || !raidKey) return null;

  const chars = normalizeChars(row.chars);
  const score = toSafeScore(row.score);
  if (!chars || score === null || score <= 0) return null;

  const createdAt = row.created_at ? Date.parse(row.created_at) : NaN;

  return {
    id: row.id,
    raidKey,
    deckKey: row.deck_key?.trim() || buildDeckKey(chars),
    chars,
    score,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}

export async function getSubmasterDecks(userId: string, raidKey?: string | null): Promise<RecommendationSourceDeck[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return [];

  let query = supabase
    .from("decks")
    .select("id,user_id,raid_key,deck_key,chars,score,created_at")
    .eq("user_id", normalizedUserId)
    .order("created_at", { ascending: false });

  const normalizedRaidKey = raidKey?.trim();
  if (normalizedRaidKey) {
    query = query.eq("raid_key", normalizedRaidKey);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as DeckRow[]).map(mapDeckRow).filter((deck): deck is RecommendationSourceDeck => deck !== null);
}

/** Character-unique decks, maximizing total score for the largest possible count up to five. */
export function pickBest5<T extends { chars: string[]; score: number }>(
  decks: readonly T[],
  options: { minScore?: number } = {}
): { picked: T[]; total: number } {
  const minScore = options.minScore ?? MIN_RECOMMENDED_DECK_SCORE;
  const clean = decks
    .filter((deck) => deck.chars.length === MAX_DECK_CHARS && Number.isFinite(deck.score) && deck.score > minScore)
    .map((deck) => ({ deck, set: deckCharSet(deck.chars) }))
    .sort((a, b) => b.deck.score - a.deck.score);

  const scores = clean.map((item) => item.deck.score);

  function upperBound(startIndex: number, need: number) {
    let sum = 0;
    for (let i = 0; i < need; i++) {
      const index = startIndex + i;
      if (index >= scores.length) return -Infinity;
      sum += scores[index];
    }
    return sum;
  }

  function solve(targetCount: number): { picked: T[]; total: number } {
    let bestTotal = -1;
    let bestPick: T[] = [];

    function dfs(index: number, picked: T[], used: Set<string>, total: number) {
      const need = targetCount - picked.length;

      if (need === 0) {
        if (total > bestTotal) {
          bestTotal = total;
          bestPick = [...picked];
        }
        return;
      }

      if (index >= clean.length) return;
      if (clean.length - index < need) return;

      const bound = total + upperBound(index, need);
      if (bound <= bestTotal) return;

      for (let i = index; i < clean.length; i++) {
        const candidate = clean[i];
        if (hasOverlap(candidate.set, used)) continue;

        const nextUsed = new Set(used);
        for (const char of candidate.set) nextUsed.add(char);

        picked.push(candidate.deck);
        dfs(i + 1, picked, nextUsed, total + candidate.deck.score);
        picked.pop();
      }
    }

    dfs(0, [], new Set<string>(), 0);

    return { picked: bestPick, total: Math.max(0, bestTotal) };
  }

  for (let targetCount = Math.min(MAX_RECOMMENDED_DECK_COUNT, clean.length); targetCount > 0; targetCount--) {
    const best = solve(targetCount);
    if (best.picked.length > 0) return best;
  }

  return { picked: [], total: 0 };
}
