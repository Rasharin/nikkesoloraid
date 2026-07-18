import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultTierBoard,
  getContrastingTextColor,
  moveNikke,
  normalizeTierBoard,
  removeTierRow,
  type TierBoardData,
} from "../lib/nikke-tier.ts";

test("creates the five default tier rows", () => {
  const board = createDefaultTierBoard();

  assert.equal(board.sectionName, "니케 티어");
  assert.deepEqual(board.rows.map((row) => row.name), ["S", "A", "B", "C", "D"]);
  assert.deepEqual(board.rows.map((row) => row.color), [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
  ]);
});

test("normalizes invalid rows and removes unknown or duplicate nikkes", () => {
  const board = normalizeTierBoard(
    {
      sectionName: "  공용 티어  ",
      rows: [
        { id: "s", name: " S ", color: "#EF4444", nikkeNames: ["라피", "라피", "없는니케"] },
        { id: "a", name: "", color: "red", nikkeNames: ["라피", "아니스"] },
      ],
      updatedAt: "2026-07-19T00:00:00.000Z",
    },
    new Set(["라피", "아니스"])
  );

  assert.equal(board.sectionName, "공용 티어");
  assert.deepEqual(board.rows[0].nikkeNames, ["라피"]);
  assert.equal(board.rows[1].name, "A");
  assert.equal(board.rows[1].color, "#f97316");
  assert.deepEqual(board.rows[1].nikkeNames, ["아니스"]);
});

test("moves a nikke between rows without copying", () => {
  const board: TierBoardData = {
    sectionName: "니케 티어",
    updatedAt: null,
    rows: [
      { id: "s", name: "S", color: "#ef4444", nikkeNames: ["라피", "아니스"] },
      { id: "a", name: "A", color: "#f97316", nikkeNames: [] },
    ],
  };

  const moved = moveNikke(board, { nikkeName: "라피", targetRowId: "a", targetIndex: 0 });

  assert.deepEqual(moved.rows[0].nikkeNames, ["아니스"]);
  assert.deepEqual(moved.rows[1].nikkeNames, ["라피"]);
});

test("reorders a nikke within the same row", () => {
  const board: TierBoardData = {
    sectionName: "니케 티어",
    updatedAt: null,
    rows: [
      { id: "s", name: "S", color: "#ef4444", nikkeNames: ["라피", "아니스", "네온"] },
    ],
  };

  const moved = moveNikke(board, { nikkeName: "라피", targetRowId: "s", targetIndex: 2 });

  assert.deepEqual(moved.rows[0].nikkeNames, ["아니스", "네온", "라피"]);
});

test("ignores a move to an unknown row", () => {
  const board = createDefaultTierBoard();
  const moved = moveNikke(board, { nikkeName: "라피", targetRowId: "missing" });

  assert.equal(moved, board);
});

test("removing a row leaves its nikkes unassigned", () => {
  const board = createDefaultTierBoard();
  board.rows[0].nikkeNames = ["라피"];

  const next = removeTierRow(board, board.rows[0].id);

  assert.equal(next.rows.length, 4);
  assert.equal(next.rows.some((row) => row.nikkeNames.includes("라피")), false);
});

test("does not remove the final tier row", () => {
  const board: TierBoardData = {
    sectionName: "니케 티어",
    updatedAt: null,
    rows: [{ id: "only", name: "S", color: "#ef4444", nikkeNames: [] }],
  };

  assert.equal(removeTierRow(board, "only"), board);
});

test("chooses readable text colors", () => {
  assert.equal(getContrastingTextColor("#ffffff"), "#111827");
  assert.equal(getContrastingTextColor("#111827"), "#ffffff");
});
