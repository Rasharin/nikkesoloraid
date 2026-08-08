import test from "node:test";
import assert from "node:assert/strict";
import {
  TIER_CATALOG_LAYOUT_KEY,
  parseTierCatalogLayoutMode,
} from "../lib/tier-catalog-layout";

test("tier catalog layout uses a versioned local key", () => {
  assert.equal(TIER_CATALOG_LAYOUT_KEY, "soloraid_tier_catalog_layout_v1");
});

test("tier catalog layout accepts side and bottom", () => {
  assert.equal(parseTierCatalogLayoutMode("side"), "side");
  assert.equal(parseTierCatalogLayoutMode("bottom"), "bottom");
});

test("tier catalog layout falls back to bottom for missing or invalid values", () => {
  assert.equal(parseTierCatalogLayoutMode(null), "bottom");
  assert.equal(parseTierCatalogLayoutMode("horizontal"), "bottom");
});
