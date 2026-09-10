const PREFIX = "NK2-";
const MAX_DECKS = 5;
const MAX_SLOTS = 5;

export type NikkeCalcDeck = readonly (string | null | undefined)[];

export function getNikkeCalcShareSelectionError(deckCount: number): string | null {
  if (deckCount === 0) return "덱을 선택해야 합니다.(최대 5개)";
  if (deckCount > MAX_DECKS) return "계산기로 공유는 최대 5개 덱까지 가능합니다.";
  return null;
}

function nameHash(name: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash & 0xffffff;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeNikkeCalcShareCode(decks: readonly NikkeCalcDeck[]): string {
  const selectionError = getNikkeCalcShareSelectionError(decks.length);
  if (selectionError && decks.length > 0) throw new Error(selectionError);

  const normalized = (decks.length > 0 ? decks : [[]]).map((deck) =>
    Array.from({ length: MAX_SLOTS }, (_, index) => deck[index] ?? null)
  );
  while (normalized.length > 1 && normalized[normalized.length - 1]!.every((name) => !name?.trim())) {
    normalized.pop();
  }
  const bytes: number[] = [1, normalized.length];

  for (const deck of normalized) {
    let mask = 0;
    const filled: string[] = [];
    for (let slot = 0; slot < MAX_SLOTS; slot += 1) {
      const name = (deck[slot] ?? "").trim();
      if (!name) continue;
      mask |= 1 << slot;
      filled.push(name);
    }
    bytes.push(mask);
    for (const name of filled) {
      const hash = nameHash(name);
      bytes.push((hash >> 16) & 0xff, (hash >> 8) & 0xff, hash & 0xff);
    }
  }

  return PREFIX + toBase64Url(Uint8Array.from(bytes));
}
