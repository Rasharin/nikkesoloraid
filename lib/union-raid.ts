export type RaidMode = 'solo' | 'union';
export const UNION_ELEMENTS = ['수냉', '작열', '풍압', '전격', '철갑'] as const;
export type UnionElement = typeof UNION_ELEMENTS[number];
export type UnionSchedule = {
  raid_key: string; round: number; starts_at: string; ends_at: string;
  status: 'scheduled' | 'active' | 'completed';
};
export type UnionDeckMeta = { pageId: number; rowIndex: number; deckId: number; element: string | null };
export type UnionDeckPayload = { draft: string[]; scoreText: string; note?: string; editingId: string | null; union?: UnionDeckMeta };
export function unionRaidKey(round: number) { return `union-${round}`; }
export function validateUnionSchedule(round: number, startsAt: string, endsAt: string): string | null {
  if (!Number.isSafeInteger(round) || round < 1) return '회차는 1 이상의 정수로 입력해주세요.';
  const start = Date.parse(startsAt), end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '종료 일시는 시작 일시보다 늦어야 합니다.';
  return null;
}
export function crossRowDuplicates(decks: readonly (readonly (string | null)[])[]): Set<string> {
  const rows = new Map<string, number>();
  const duplicates = new Set<string>();
  decks.forEach((deck, index) => deck.forEach(name => {
    if (!name) return;
    const row = Math.floor(index / 3);
    if (rows.has(name) && rows.get(name) !== row) duplicates.add(name);
    else rows.set(name, row);
  }));
  return duplicates;
}
