export const ARCHIVE_CLOSURE_DATE = "2027-11-11";

export type SoloArchiveDeck = {
  kind: "solo";
  id: string;
  raidKey: string;
  raidLabel: string;
  deckKey: string;
  chars: string[];
  score: number;
  note: string;
  createdAt: string;
};

export type UnionArchiveDeck = {
  kind: "union";
  id: string;
  raidKey: string;
  raidLabel: string;
  deckKey: string;
  chars: string[];
  score: number;
  note: string;
  createdAt: string;
  pageId: number;
  rowIndex: number;
  deckId: number;
  element: string | null;
};

export type ArchiveDeck = SoloArchiveDeck | UnionArchiveDeck;

export type DeckArchive = {
  generatedAt: string;
  closureDate: string;
  soloDecks: SoloArchiveDeck[];
  unionDecks: UnionArchiveDeck[];
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function positiveInteger(value: unknown): number | null {
  const number = finiteNumber(value);
  return number !== null && Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInteger(value: unknown): number | null {
  const number = finiteNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function fiveNames(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length !== 5) return null;
  const names = value.map(nonEmptyString);
  return names.every((name): name is string => name !== null) ? names : null;
}

function isoDate(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (!text || !Number.isFinite(Date.parse(text))) return null;
  return new Date(text).toISOString();
}

export function normalizeSoloDeck(value: unknown): SoloArchiveDeck | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = nonEmptyString(row.id);
  const raidKey = nonEmptyString(row.raid_key);
  const deckKey = nonEmptyString(row.deck_key);
  const chars = fiveNames(row.chars);
  const score = finiteNumber(row.score);
  const createdAt = isoDate(row.created_at);
  if (!id || !raidKey || !deckKey || !chars || score === null || !createdAt) return null;

  return {
    kind: "solo",
    id,
    raidKey,
    raidLabel: raidKey,
    deckKey,
    chars,
    score,
    note: typeof row.note === "string" ? row.note : "",
    createdAt,
  };
}

export type UnionSchedule = { raidKey: string; label: string };

export function normalizeUnionSchedule(value: unknown): UnionSchedule | null {
  const row = asRecord(value);
  if (!row) return null;
  const raidKey = nonEmptyString(row.raid_key);
  const round = positiveInteger(row.round);
  if (!raidKey || round === null) return null;
  return { raidKey, label: `${round}차 유니온 레이드` };
}

export function normalizeUnionDeck(
  value: unknown,
  scheduleLabels: ReadonlyMap<string, string>,
): UnionArchiveDeck | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = nonEmptyString(row.id);
  const raidKey = nonEmptyString(row.raid_key);
  const chars = fiveNames(row.chars);
  const score = finiteNumber(row.score);
  const createdAt = isoDate(row.created_at);
  const pageId = positiveInteger(row.page_id);
  const rowIndex = nonNegativeInteger(row.row_index);
  const deckId = positiveInteger(row.deck_id);
  if (!id || !raidKey || !chars || score === null || !createdAt || pageId === null || rowIndex === null || deckId === null) {
    return null;
  }

  return {
    kind: "union",
    id,
    raidKey,
    raidLabel: scheduleLabels.get(raidKey) ?? raidKey,
    deckKey: String(deckId),
    chars,
    score,
    note: typeof row.note === "string" ? row.note : "",
    createdAt,
    pageId,
    rowIndex,
    deckId,
    element: typeof row.element === "string" && row.element.trim() ? row.element : null,
  };
}

export function buildArchive({
  soloRows,
  unionRows,
  scheduleRows,
  generatedAt,
}: {
  soloRows: readonly unknown[];
  unionRows: readonly unknown[];
  scheduleRows: readonly unknown[];
  generatedAt: string;
}): DeckArchive {
  const schedules = scheduleRows
    .map(normalizeUnionSchedule)
    .filter((schedule): schedule is UnionSchedule => schedule !== null);
  const labels = new Map(schedules.map((schedule) => [schedule.raidKey, schedule.label]));

  return {
    generatedAt: isoDate(generatedAt) ?? new Date().toISOString(),
    closureDate: ARCHIVE_CLOSURE_DATE,
    soloDecks: soloRows.map(normalizeSoloDeck).filter((deck): deck is SoloArchiveDeck => deck !== null),
    unionDecks: unionRows
      .map((row) => normalizeUnionDeck(row, labels))
      .filter((deck): deck is UnionArchiveDeck => deck !== null),
  };
}

export function archiveToJson(archive: DeckArchive): string {
  return JSON.stringify(archive, null, 2);
}

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown; count?: number | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error, count } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (typeof count === "number" && rows.length >= count) return rows;
    if (page.length === 0 || (count == null && page.length < pageSize)) return rows;
    from += page.length;
  }
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function archiveToCsv(archive: DeckArchive): string {
  const header = [
    "type",
    "raid_key",
    "raid_label",
    "deck_id",
    "slot_1",
    "slot_2",
    "slot_3",
    "slot_4",
    "slot_5",
    "score",
    "note",
    "created_at",
    "union_page",
    "union_row",
    "union_element",
  ];
  const rows = [...archive.soloDecks, ...archive.unionDecks].map((deck) => [
    deck.kind,
    deck.raidKey,
    deck.raidLabel,
    deck.deckKey,
    ...deck.chars,
    deck.score,
    deck.note,
    deck.createdAt,
    deck.kind === "union" ? deck.pageId : null,
    deck.kind === "union" ? deck.rowIndex + 1 : null,
    deck.kind === "union" ? deck.element : null,
  ]);

  return `\ufeff${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
