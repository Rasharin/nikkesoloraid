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

  assert.equal(code, "NK2-AAEA");
});

test("marks multi-deck shares as five-deck mode", () => {
  const code = encodeNikkeCalcShareCode([
    [""],
    ["리타"],
  ]);

  assert.equal(code, "NK2-AQIAAQLt0Q");
});

test("canonicalizes legacy spacing before hashing calculator names", () => {
  const legacy = encodeNikkeCalcShareCode([["아니스:스타"]], ["아니스 : 스타"]);
  const canonical = encodeNikkeCalcShareCode([["아니스 : 스타"]], ["아니스 : 스타"]);
  assert.equal(legacy, canonical);
});

test("rejects more than five decks before producing a calculator code", () => {
  assert.throws(
    () => encodeNikkeCalcShareCode(Array.from({ length: 6 }, () => ["리타"])),
    /최대 5개 덱/
  );
});
