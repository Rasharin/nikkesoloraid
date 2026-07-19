import assert from "node:assert/strict";
import test from "node:test";

import {
  clampTierSectionSize,
  getTierCardSizeClasses,
  parseTierLocalLayout,
} from "../lib/tier-local-layout.ts";

test("parses valid tier layout settings", () => {
  assert.deepEqual(
    parseTierLocalLayout('{"width":900,"height":700,"cardSize":"large"}'),
    { width: 900, height: 700, cardSize: "large" }
  );
});

test("rejects malformed tier layout settings", () => {
  assert.equal(
    parseTierLocalLayout('{"width":-1,"height":0,"cardSize":"huge"}'),
    null
  );
  assert.equal(parseTierLocalLayout("not-json"), null);
});

test("clamps tier section size to its measured minimum", () => {
  assert.deepEqual(
    clampTierSectionSize(
      { width: 500, height: 400 },
      { width: 760, height: 540 }
    ),
    { width: 760, height: 540 }
  );
});

test("keeps the current tier card dimensions as the default size", () => {
  const classes = getTierCardSizeClasses("default");

  assert.match(classes.card, /w-16/);
  assert.match(classes.card, /sm:w-20/);
  assert.match(classes.placeholder, /h-\[94px\]/);
  assert.match(classes.placeholder, /sm:h-\[110px\]/);
});

test("grows tier rows and spacing with the card size", () => {
  const small = getTierCardSizeClasses("small");
  const normal = getTierCardSizeClasses("default");
  const large = getTierCardSizeClasses("large");

  assert.deepEqual(
    [small.rowMinHeight, normal.rowMinHeight, large.rowMinHeight],
    ["min-h-[7rem]", "min-h-[8.5rem]", "min-h-[10rem]"]
  );
  assert.deepEqual(
    [small.boardGap, normal.boardGap, large.boardGap],
    ["gap-2", "gap-2.5", "gap-4"]
  );
});
