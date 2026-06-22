import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildCopiedRecommendedDeckDrafts, copyDeckDraftAfterIndex } = jiti("../lib/deck-building-copy.ts");

test("buildCopiedRecommendedDeckDrafts prepends non-duplicate recommended decks for the builder", () => {
  const existingDrafts = [
    {
      id: 3,
      draft: ["A", "B", "C", "D", "E"],
      score: "11",
      note: "already",
      editingId: null,
    },
  ];
  const recommendedDecks = [
    { chars: ["E", "D", "C", "B", "A"], scoreText: "99", note: "duplicate" },
    { chars: ["F", "G", "H", "I", "J"], scoreText: "88", note: "copy me" },
  ];

  const result = buildCopiedRecommendedDeckDrafts({
    existingDrafts,
    recommendedDecks,
    maxDecks: 5,
    deckSize: 5,
  });

  assert.deepEqual(result, [
    {
      id: 4,
      draft: ["F", "G", "H", "I", "J"],
      score: "88",
      note: "copy me",
      editingId: null,
    },
    existingDrafts[0],
  ]);
});

test("buildCopiedRecommendedDeckDrafts treats trimmed deck names as duplicates", () => {
  const existingDrafts = [
    {
      id: 1,
      draft: ["A ", "B", "C", "D", "E"],
      score: "",
      note: "",
      editingId: null,
    },
  ];

  const result = buildCopiedRecommendedDeckDrafts({
    existingDrafts,
    recommendedDecks: [{ chars: ["E", "D", "C", "B", "A"], scoreText: "88" }],
    maxDecks: 5,
    deckSize: 5,
  });

  assert.equal(result, existingDrafts);
});

test("copyDeckDraftAfterIndex duplicates the target deck after itself with a new id", () => {
  const existingDrafts = [
    {
      id: 4,
      draft: ["A", "B", "C", "D", "E"],
      score: "123",
      note: "memo",
      editingId: "saved-id",
    },
    {
      id: 8,
      draft: ["F", "G", "H", "I", "J"],
      score: "456",
      note: "",
      editingId: null,
    },
  ];

  const result = copyDeckDraftAfterIndex(existingDrafts, 0);

  assert.deepEqual(result, [
    existingDrafts[0],
    {
      id: 9,
      draft: ["A", "B", "C", "D", "E"],
      score: "123",
      note: "memo",
      editingId: null,
    },
    existingDrafts[1],
  ]);
  assert.notEqual(result[1].draft, existingDrafts[0].draft);
});
