import assert from "node:assert/strict";
import test from "node:test";

import {
  clampTierSectionSize,
  getTierCardSizeClasses,
  parseTierLocalLayout,
  resizeTierSection,
} from "../lib/tier-local-layout.ts";

test("parses valid tier layout settings", () => {
  assert.deepEqual(
    parseTierLocalLayout('{"width":900,"height":700,"cardSize":"large","offsetX":-120}'),
    { width: 900, height: 700, cardSize: "large", offsetX: -120 }
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

test("resizes from either bottom edge while preserving the left handle anchor", () => {
  assert.deepEqual(
    resizeTierSection(
      { width: 800, height: 600 },
      { x: 120, y: 40 },
      "right",
      { width: 760, height: 540 }
    ),
    { size: { width: 920, height: 640 }, offsetDeltaX: 0 }
  );
  assert.deepEqual(
    resizeTierSection(
      { width: 800, height: 600 },
      { x: -120, y: 40 },
      "left",
      { width: 760, height: 540 }
    ),
    { size: { width: 920, height: 640 }, offsetDeltaX: -120 }
  );
});

test("left resize clamps width and offsets only by the applied width change", () => {
  assert.deepEqual(
    resizeTierSection(
      { width: 800, height: 600 },
      { x: 200, y: -200 },
      "left",
      { width: 760, height: 540 }
    ),
    { size: { width: 760, height: 540 }, offsetDeltaX: 40 }
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
