import test from "node:test";
import assert from "node:assert/strict";
import { encodeNikkeCalcShareCode, getNikkeCalcShareSelectionError } from "../lib/nikke-calc-share.ts";

test("requires a deck selection before creating a calculator share code", () => {
  assert.equal(getNikkeCalcShareSelectionError(0), "덱을 선택해야 합니다.(최대 5개)");
  assert.equal(getNikkeCalcShareSelectionError(1), null);
});

test("encodes selected decks using the NK2 calculator share format", () => {
  const code = encodeNikkeCalcShareCode([
    [""],
  ]);

  assert.equal(code, "NK2-AQEA");
});

test("rejects more than five decks before producing a calculator code", () => {
  assert.throws(
    () => encodeNikkeCalcShareCode(Array.from({ length: 6 }, () => ["리타"])),
    /최대 5개 덱/
  );
});
