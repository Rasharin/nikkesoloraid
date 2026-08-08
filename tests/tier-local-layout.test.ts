import assert from "node:assert/strict";
import test from "node:test";

import {
  clampTierSectionSize,
  getTierSectionLayoutWidth,
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
    { size: { width: 920, height: 640 }, offsetX: 0 }
  );
  assert.deepEqual(
    resizeTierSection(
      { width: 800, height: 600 },
      { x: -120, y: 40 },
      "left",
      { width: 760, height: 540 }
    ),
    { size: { width: 920, height: 640 }, offsetX: -120 }
  );
});

test("left resize cannot shrink past the default left edge", () => {
  assert.deepEqual(
    resizeTierSection(
      { width: 800, height: 600 },
      { x: 200, y: -200 },
      "left",
      { width: 760, height: 540 }
    ),
    { size: { width: 800, height: 540 }, offsetX: 0 }
  );
});

test("caps horizontal resizing at the viewport maximum width", () => {
  assert.deepEqual(
    resizeTierSection(
      { width: 800, height: 600 },
      { x: 200, y: 20 },
      "right",
      { width: 760, height: 540 },
      850
    ),
    { size: { width: 850, height: 620 }, offsetX: 0 }
  );
  assert.deepEqual(
    resizeTierSection(
      { width: 800, height: 600 },
      { x: -200, y: 20 },
      "left",
      { width: 760, height: 540 },
      850
    ),
    { size: { width: 850, height: 620 }, offsetX: -50 }
  );
});

test("allows a viewport maximum narrower than the measured desktop minimum", () => {
  assert.deepEqual(
    resizeTierSection(
      { width: 700, height: 600 },
      { x: 100, y: 0 },
      "right",
      { width: 760, height: 540 },
      700
    ),
    { size: { width: 700, height: 600 }, offsetX: 0 }
  );
});

test("alternating resize handles stay anchored to the default left and right edges", () => {
  const minimum = { width: 800, height: 600 };
  const leftExpanded = resizeTierSection(
    minimum,
    { x: -100, y: 0 },
    "left",
    minimum,
    1200,
    0
  );
  assert.deepEqual(leftExpanded, {
    size: { width: 900, height: 600 },
    offsetX: -100,
  });

  const bothExpanded = resizeTierSection(
    leftExpanded.size,
    { x: 100, y: 0 },
    "right",
    minimum,
    1200,
    leftExpanded.offsetX
  );
  assert.deepEqual(bothExpanded, {
    size: { width: 1000, height: 600 },
    offsetX: -100,
  });

  const rightReset = resizeTierSection(
    bothExpanded.size,
    { x: -300, y: 0 },
    "right",
    minimum,
    1200,
    bothExpanded.offsetX
  );
  assert.deepEqual(rightReset, {
    size: { width: 900, height: 600 },
    offsetX: -100,
  });

  const fullyReset = resizeTierSection(
    rightReset.size,
    { x: 200, y: 0 },
    "left",
    minimum,
    1200,
    rightReset.offsetX
  );
  assert.deepEqual(fullyReset, {
    size: minimum,
    offsetX: 0,
  });
});

test("left resize applies only the remaining extension at the configured maximum", () => {
  assert.deepEqual(
    resizeTierSection(
      { width: 1192, height: 600 },
      { x: -40, y: 0 },
      "left",
      { width: 1152, height: 600 },
      1206,
      0
    ),
    {
      size: { width: 1206, height: 600 },
      offsetX: -14,
    }
  );
});

test("left extension does not move the catalog track while right extension does", () => {
  const minimumWidth = 800;

  assert.equal(
    getTierSectionLayoutWidth({ width: 1000, height: 600 }, -200, minimumWidth),
    800
  );
  assert.equal(
    getTierSectionLayoutWidth({ width: 1000, height: 600 }, 0, minimumWidth),
    1000
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
