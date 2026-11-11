import assert from "node:assert/strict";
import test from "node:test";

import {
  archiveToCsv,
  archiveToJson,
  buildArchive,
  fetchAllRows,
  normalizeSoloDeck,
  normalizeUnionDeck,
  normalizeUnionSchedule,
} from "../lib/archive.ts";

const soloRow = {
  id: "solo-1",
  user_id: "owner-1",
  raid_key: "solo-42",
  deck_key: "Alice|Anis|Liter|Modernia|Naga",
  chars: ["Alice", "Anis", "Liter", "Modernia", "Naga"],
  score: 123456,
  note: "메모, 줄바꿈\n\"중요\"",
  created_at: "2026-01-02T03:04:05.000Z",
};

const unionRow = {
  id: "union-1",
  user_id: "owner-1",
  raid_key: "union-17",
  page_id: 2,
  row_index: 1,
  deck_id: 3,
  chars: ["A", "B", "C", "D", "E"],
  score: "98765",
  note: "유니온",
  element: "수냉",
  created_at: "2026-02-03T04:05:06.000Z",
};

test("normalizes complete solo and union archive rows", () => {
  assert.deepEqual(normalizeSoloDeck(soloRow), {
    kind: "solo",
    id: "solo-1",
    raidKey: "solo-42",
    raidLabel: "solo-42",
    deckKey: "Alice|Anis|Liter|Modernia|Naga",
    chars: ["Alice", "Anis", "Liter", "Modernia", "Naga"],
    score: 123456,
    note: "메모, 줄바꿈\n\"중요\"",
    createdAt: "2026-01-02T03:04:05.000Z",
  });

  assert.deepEqual(normalizeUnionDeck(unionRow, new Map([["union-17", "17차 유니온 레이드"]])), {
    kind: "union",
    id: "union-1",
    raidKey: "union-17",
    raidLabel: "17차 유니온 레이드",
    deckKey: "3",
    chars: ["A", "B", "C", "D", "E"],
    score: 98765,
    note: "유니온",
    createdAt: "2026-02-03T04:05:06.000Z",
    pageId: 2,
    rowIndex: 1,
    deckId: 3,
    element: "수냉",
  });
});

test("rejects malformed rows instead of exposing partial archive records", () => {
  assert.equal(normalizeSoloDeck({ ...soloRow, id: "" }), null);
  assert.equal(normalizeSoloDeck({ ...soloRow, chars: ["A"] }), null);
  assert.equal(normalizeSoloDeck({ ...soloRow, score: Number.NaN }), null);
  assert.equal(normalizeSoloDeck({ ...soloRow, created_at: "not-a-date" }), null);
  assert.equal(normalizeUnionDeck({ ...unionRow, page_id: 0 }, new Map()), null);
});

test("normalizes union schedules and falls back to immutable raid keys", () => {
  assert.deepEqual(normalizeUnionSchedule({ raid_key: "union-17", round: 17 }), {
    raidKey: "union-17",
    label: "17차 유니온 레이드",
  });
  assert.equal(normalizeUnionSchedule({ raid_key: "", round: 17 }), null);
  assert.equal(normalizeUnionSchedule({ raid_key: "union-17", round: 0 }), null);
  assert.equal(normalizeUnionDeck(unionRow, new Map())?.raidLabel, "union-17");
});

test("builds a complete archive and serializes stable JSON", () => {
  const archive = buildArchive({
    soloRows: [soloRow, { ...soloRow, id: "", raid_key: "invalid" }],
    unionRows: [unionRow],
    scheduleRows: [{ raid_key: "union-17", round: 17 }],
    generatedAt: "2026-11-11T00:00:00.000Z",
  });

  assert.equal(archive.generatedAt, "2026-11-11T00:00:00.000Z");
  assert.equal(archive.closureDate, "2027-11-11");
  assert.equal(archive.soloDecks.length, 1);
  assert.equal(archive.unionDecks.length, 1);
  assert.deepEqual(JSON.parse(archiveToJson(archive)), archive);
});

test("escapes Korean text, commas, quotes, and newlines in CSV with a UTF-8 BOM", () => {
  const archive = buildArchive({
    soloRows: [soloRow],
    unionRows: [unionRow],
    scheduleRows: [{ raid_key: "union-17", round: 17 }],
    generatedAt: "2026-11-11T00:00:00.000Z",
  });
  const csv = archiveToCsv(archive);

  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /solo,solo-42,solo-42/);
  assert.match(csv, /"메모, 줄바꿈\n""중요"""/);
  assert.match(csv, /union,union-17,17차 유니온 레이드/);
});

test("exports an empty archive as a valid CSV header", () => {
  const archive = buildArchive({
    soloRows: [],
    unionRows: [],
    scheduleRows: [],
    generatedAt: "2026-11-11T00:00:00.000Z",
  });

  assert.equal(
    archiveToCsv(archive),
    "\ufefftype,raid_key,raid_label,deck_id,slot_1,slot_2,slot_3,slot_4,slot_5,score,note,created_at,union_page,union_row,union_element\r\n",
  );
});

test("fetches every stable page beyond the database response limit", async () => {
  const rows = Array.from({ length: 1005 }, (_, index) => ({ id: `deck-${String(index).padStart(4, "0")}` }));
  const ranges: Array<[number, number]> = [];

  const result = await fetchAllRows(async (from, to) => {
    ranges.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  }, 1000);

  assert.equal(result.length, 1005);
  assert.deepEqual(result[0], { id: "deck-0000" });
  assert.deepEqual(result[1004], { id: "deck-1004" });
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
});

test("fails the complete archive load when any database page fails", async () => {
  await assert.rejects(
    fetchAllRows(async () => ({ data: null, error: new Error("page failed") }), 1000),
    /page failed/,
  );
});

test("continues from the returned row count when the server caps pages below the request", async () => {
  const rows = Array.from({ length: 1005 }, (_, index) => ({ id: index }));
  const ranges: Array<[number, number]> = [];
  const result = await fetchAllRows(async (from, to) => {
    ranges.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + 500)), error: null, count: rows.length };
  }, 1000);

  assert.equal(result.length, 1005);
  assert.deepEqual(ranges, [[0, 999], [500, 1499], [1000, 1999]]);
});
