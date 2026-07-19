import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  matchesSelectedElements,
  normalizeSecondaryElement,
} from "../lib/nikke-elements.ts";

test("normalizes an empty or duplicate secondary element to null", () => {
  assert.equal(normalizeSecondaryElement("fire", null), null);
  assert.equal(normalizeSecondaryElement("fire", ""), null);
  assert.equal(normalizeSecondaryElement("fire", "  "), null);
  assert.equal(normalizeSecondaryElement("fire", "fire"), null);
  assert.equal(normalizeSecondaryElement("fire", "water"), "water");
});

test("matches a selected primary or secondary element", () => {
  const dualElementNikke = { element: "fire", element2: "water" };

  assert.equal(matchesSelectedElements(dualElementNikke, new Set()), true);
  assert.equal(matchesSelectedElements(dualElementNikke, new Set(["fire"])), true);
  assert.equal(matchesSelectedElements(dualElementNikke, new Set(["water"])), true);
  assert.equal(matchesSelectedElements(dualElementNikke, new Set(["wind"])), false);
  assert.equal(
    matchesSelectedElements({ element: "fire", element2: null }, new Set(["water"])),
    false
  );
});

test("secondary element migration adds a nullable enum column and index", () => {
  const sql = fs.readFileSync("supabase/130_nikke_secondary_element.sql", "utf8");

  assert.match(
    sql,
    /alter table public\.nikkes add column if not exists element2 public\.element_type\s*;/i
  );
  assert.match(
    sql,
    /create index if not exists idx_nikkes_element2 on public\.nikkes \(element2\)\s*;/i
  );
  assert.doesNotMatch(sql, /element2 public\.element_type\s+not null/i);
});
