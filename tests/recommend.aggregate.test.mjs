import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const jiti = createJiti(import.meta.url);
const {
  aggregateRecommendedDecks,
  calculateRecommendationRank,
  chooseDisplayedRecommendedDecks,
  formatRecommendationRankLabel,
  getCommunityRaidDecksCacheKey,
  shouldLoadRecommendationRank,
  MIN_RECOMMENDED_DECK_SCORE,
} = jiti("../lib/recommend.ts");

test("aggregateRecommendedDecks groups all users by deck and reports count with average score", () => {
  const decks = [
    {
      raidKey: "raid-1",
      deckKey: "ignored",
      chars: ["A", "B", "C", "D", "E"],
      score: MIN_RECOMMENDED_DECK_SCORE + 100,
    },
    {
      raidKey: "raid-1",
      deckKey: "ignored",
      chars: ["E", "D", "C", "B", "A"],
      score: MIN_RECOMMENDED_DECK_SCORE + 300,
    },
    {
      raidKey: "raid-1",
      deckKey: "ignored",
      chars: ["F", "G", "H", "I", "J"],
      score: MIN_RECOMMENDED_DECK_SCORE + 500,
    },
    {
      raidKey: "raid-1",
      deckKey: "ignored",
      chars: ["K", "L", "M", "N", "O"],
      score: MIN_RECOMMENDED_DECK_SCORE,
    },
  ];

  const result = aggregateRecommendedDecks(decks);

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    deckKey: "F|G|H|I|J",
    chars: ["F", "G", "H", "I", "J"],
    usedCount: 1,
    avgScore: MIN_RECOMMENDED_DECK_SCORE + 500,
  });
  assert.deepEqual(result[1], {
    deckKey: "A|B|C|D|E",
    chars: ["A", "B", "C", "D", "E"],
    usedCount: 2,
    avgScore: MIN_RECOMMENDED_DECK_SCORE + 200,
  });
});

test("chooseDisplayedRecommendedDecks prefers public snapshot over unauthenticated live subset", () => {
  const liveSubset = [
    {
      deckKey: "A|B|C|D|E",
      chars: ["A", "B", "C", "D", "E"],
      usedCount: 1,
      avgScore: MIN_RECOMMENDED_DECK_SCORE + 100,
    },
  ];
  const snapshot = {
    raidKey: "raid-1",
    raidLabel: "Raid 1",
    updatedAt: Date.now(),
    decks: [
      {
        deckKey: "F|G|H|I|J",
        chars: ["F", "G", "H", "I", "J"],
        usedCount: 4,
        avgScore: MIN_RECOMMENDED_DECK_SCORE + 500,
      },
    ],
  };

  assert.deepEqual(
    chooseDisplayedRecommendedDecks({
      liveDecks: liveSubset,
      snapshot,
      isAuthenticated: false,
    }),
    snapshot.decks
  );
});

test("chooseDisplayedRecommendedDecks falls back to live decks when current raid has no snapshot yet", () => {
  const liveDecks = [
    {
      deckKey: "A|B|C|D|E",
      chars: ["A", "B", "C", "D", "E"],
      usedCount: 2,
      avgScore: MIN_RECOMMENDED_DECK_SCORE + 300,
    },
  ];

  assert.deepEqual(
    chooseDisplayedRecommendedDecks({
      liveDecks,
      snapshot: null,
      isAuthenticated: false,
    }),
    liveDecks
  );
});

test("getCommunityRaidDecksCacheKey separates authenticated and anonymous raid caches", () => {
  assert.equal(getCommunityRaidDecksCacheKey(" raid-1 ", true), "auth:raid-1");
  assert.equal(getCommunityRaidDecksCacheKey(" raid-1 ", false), "anon:raid-1");
  assert.notEqual(getCommunityRaidDecksCacheKey("raid-1", true), getCommunityRaidDecksCacheKey("raid-1", false));
});

test("calculateRecommendationRank ranks current score against saved recommendation totals", () => {
  assert.deepEqual(
    calculateRecommendationRank({
      currentUserId: "me",
      currentTotal: 250,
      rows: [
        { userId: "u1", total: 300 },
        { userId: "me", total: 100 },
        { userId: "u2", total: 200 },
      ],
    }),
    { rank: 2, total: 3 }
  );
});

test("shouldLoadRecommendationRank requests ranking after a saved recommendation refresh tick changes", () => {
  const base = {
    soloRaidInProgress: true,
    raidKey: "raid-1",
    userId: "me",
    canRecommend: true,
    total: 500,
  };

  assert.equal(shouldLoadRecommendationRank({ ...base, refreshTick: 1 }), true);
  assert.equal(shouldLoadRecommendationRank({ ...base, refreshTick: 2 }), true);
});

test("shouldLoadRecommendationRank keeps ineligible ranking states disabled", () => {
  const base = {
    soloRaidInProgress: true,
    raidKey: "raid-1",
    userId: "me",
    canRecommend: true,
    total: 500,
    refreshTick: 1,
  };

  assert.equal(shouldLoadRecommendationRank({ ...base, canRecommend: false }), false);
  assert.equal(shouldLoadRecommendationRank({ ...base, total: 0 }), false);
  assert.equal(shouldLoadRecommendationRank({ ...base, userId: "" }), false);
});

test("formatRecommendationRankLabel shows top 100 as rank and others as percentile", () => {
  assert.equal(formatRecommendationRankLabel({ rank: 1, total: 30 }), "1위");
  assert.equal(formatRecommendationRankLabel({ rank: 100, total: 200 }), "100위");
  assert.equal(formatRecommendationRankLabel({ rank: 101, total: 200 }), "상위 51%");
});
