"use client";

import type { UniqueIdentifier } from "@dnd-kit/core";

export const MAX_DECK_CHARS = 5;

export type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
};

export type DraftSlot = string | null;
export type DragSource = "selected" | "deck" | "recommended";

export type DragItemData = {
  source: DragSource;
  nikkeName: string;
  slotIndex?: number;
  recommendedDeckId?: string;
};

export function createEmptyDraft(): DraftSlot[] {
  return Array.from({ length: MAX_DECK_CHARS }, () => null);
}

export function buildDraftFromChars(chars: string[]): DraftSlot[] {
  const next = createEmptyDraft();

  chars.slice(0, MAX_DECK_CHARS).forEach((name, index) => {
    next[index] = name;
  });

  return next;
}

export function getDeckSlotId(index: number): string {
  return `deck-slot-${index}`;
}

export function parseDeckSlotIndex(id: UniqueIdentifier | null | undefined): number | null {
  if (typeof id !== "string") return null;
  if (!id.startsWith("deck-slot-")) return null;

  const index = Number(id.slice("deck-slot-".length));
  return Number.isInteger(index) ? index : null;
}
