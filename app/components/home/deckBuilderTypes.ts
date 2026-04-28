"use client";

import type { UniqueIdentifier } from "@dnd-kit/core";

export const MAX_DECK_CHARS = 5;

export type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst?: number | null;
};

export type DraftSlot = string | null;
export type DragSource = "selected" | "deck" | "spare" | "recommended";

export type DragItemData = {
  source: DragSource;
  nikkeName: string;
  deckIndex?: number;
  slotIndex?: number;
  recommendedDeckId?: string;
};

export function createEmptyDraft(length = MAX_DECK_CHARS): DraftSlot[] {
  return Array.from({ length }, () => null);
}

export function buildDraftFromChars(chars: string[], length = MAX_DECK_CHARS): DraftSlot[] {
  const next = createEmptyDraft(length);

  chars.slice(0, length).forEach((name, index) => {
    next[index] = name;
  });

  return next;
}

export function getDeckSlotId(index: number, deckIndex = 0): string {
  return `deck-slot-${deckIndex}-${index}`;
}

export function parseDeckSlotTarget(id: UniqueIdentifier | null | undefined): { deckIndex: number; slotIndex: number } | null {
  if (typeof id !== "string") return null;
  if (!id.startsWith("deck-slot-")) return null;

  const parts = id.slice("deck-slot-".length).split("-");
  if (parts.length === 1) {
    const slotIndex = Number(parts[0]);
    return Number.isInteger(slotIndex) ? { deckIndex: 0, slotIndex } : null;
  }

  const deckIndex = Number(parts[0]);
  const slotIndex = Number(parts[1]);
  return Number.isInteger(deckIndex) && Number.isInteger(slotIndex) ? { deckIndex, slotIndex } : null;
}

export function parseDeckSlotIndex(id: UniqueIdentifier | null | undefined): number | null {
  return parseDeckSlotTarget(id)?.slotIndex ?? null;
}
