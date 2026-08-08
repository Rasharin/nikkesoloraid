import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TIER_CATALOG_SETTINGS,
  TIER_CATALOG_SETTINGS_KEY,
  groupNikkesByBurst,
  parseTierCatalogSettings,
} from "../lib/tier-catalog-settings.ts";

test("tier catalog settings use a versioned local key and defaults", () => {
  assert.equal(TIER_CATALOG_SETTINGS_KEY, "soloraid_tier_catalog_settings_v1");
  assert.deepEqual(DEFAULT_TIER_CATALOG_SETTINGS, {
    imageSize: 64.4,
    sortMode: "name",
  });
});

test("tier catalog settings parse valid persisted values", () => {
  assert.deepEqual(
    parseTierCatalogSettings('{"imageSize":72,"sortMode":"burst"}'),
    { imageSize: 72, sortMode: "burst" }
  );
});

test("tier catalog settings reject malformed or out-of-range values", () => {
  assert.equal(parseTierCatalogSettings(null), null);
  assert.equal(parseTierCatalogSettings("bad json"), null);
  assert.equal(parseTierCatalogSettings('{"imageSize":20,"sortMode":"name"}'), null);
  assert.equal(parseTierCatalogSettings('{"imageSize":64,"sortMode":"unknown"}'), null);
});

test("burst grouping preserves name order inside I, II, and III groups", () => {
  const grouped = groupNikkesByBurst([
    { id: "a", name: "가", burst: 2 },
    { id: "b", name: "나", burst: 1 },
    { id: "c", name: "다", burst: 3 },
    { id: "d", name: "라", burst: 1 },
  ]);

  assert.deepEqual(
    grouped.map((group) => ({ burst: group.burst, names: group.nikkes.map((nikke) => nikke.name) })),
    [
      { burst: 1, names: ["나", "라"] },
      { burst: 2, names: ["가"] },
      { burst: 3, names: ["다"] },
    ]
  );
});

test("burst grouping keeps unknown burst entries in a final group", () => {
  const grouped = groupNikkesByBurst([
    { id: "a", name: "가", burst: null },
    { id: "b", name: "나", burst: 1 },
    { id: "c", name: "다", burst: 0 },
  ]);

  assert.deepEqual(grouped.map((group) => group.burst), [1, null]);
  assert.deepEqual(grouped[1]?.nikkes.map((nikke) => nikke.name), ["가", "다"]);
});
