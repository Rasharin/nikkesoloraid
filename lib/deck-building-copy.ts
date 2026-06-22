export type DeckBuilderDraftCopyState = {
  id: number;
  draft: Array<string | null>;
  score: string;
  note: string;
  editingId: string | null;
};

export type RecommendedDeckCopySource = {
  chars: string[];
  scoreText: string;
  note?: string;
};

type BuildCopiedRecommendedDeckDraftsParams = {
  existingDrafts: DeckBuilderDraftCopyState[];
  recommendedDecks: RecommendedDeckCopySource[];
  maxDecks: number;
  deckSize: number;
};

function normalizeCopyDraft(chars: string[], deckSize: number) {
  const next = Array.from({ length: deckSize }, () => null) as Array<string | null>;
  chars.slice(0, deckSize).forEach((name, index) => {
    next[index] = name;
  });
  return next;
}

function buildCopyDeckKey(chars: string[]) {
  return chars
    .map((char) => char.trim())
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

export function buildCopiedRecommendedDeckDrafts({
  existingDrafts,
  recommendedDecks,
  maxDecks,
  deckSize,
}: BuildCopiedRecommendedDeckDraftsParams): DeckBuilderDraftCopyState[] {
  const existingDeckKeys = new Set(
    existingDrafts
      .map((deck) => {
        const chars = deck.draft.filter((slot): slot is string => typeof slot === "string" && slot.trim().length > 0);
        return chars.length === deckSize ? buildCopyDeckKey(chars) : null;
      })
      .filter((key): key is string => key !== null)
  );
  const filteredRecommendedDecks = recommendedDecks
    .slice(0, maxDecks)
    .filter((deck) => !existingDeckKeys.has(buildCopyDeckKey(deck.chars)));

  if (filteredRecommendedDecks.length === 0) return existingDrafts;

  const maxId = existingDrafts.reduce((currentMax, deck) => Math.max(currentMax, deck.id), 0);
  const copiedDecks = filteredRecommendedDecks.map((deck, index) => ({
    id: maxId + index + 1,
    draft: normalizeCopyDraft(deck.chars, deckSize),
    score: deck.scoreText,
    note: deck.note ?? "",
    editingId: null,
  }));

  return [...copiedDecks, ...existingDrafts];
}

export function copyDeckDraftAfterIndex(
  existingDrafts: DeckBuilderDraftCopyState[],
  targetIndex: number
): DeckBuilderDraftCopyState[] {
  const target = existingDrafts[targetIndex];
  if (!target) return existingDrafts;

  const maxId = existingDrafts.reduce((currentMax, deck) => Math.max(currentMax, deck.id), 0);
  const copiedDeck = {
    id: maxId + 1,
    draft: [...target.draft],
    score: target.score,
    note: target.note,
    editingId: null,
  };

  return [...existingDrafts.slice(0, targetIndex + 1), copiedDeck, ...existingDrafts.slice(targetIndex + 1)];
}
