import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("header renders all eight navigation tabs without SVG icons", () => {
  const headerSource = readFileSync("app/components/Header.tsx", "utf8");

  assert.doesNotMatch(headerSource, /<svg\b/);
  assert.doesNotMatch(headerSource, /function \w+Icon\s*\(/);

  for (const label of ["홈", "저장된 덱", "추천", "덱 빌딩", "티어", "사용법", "니케 관리", "문의하기"]) {
    assert.match(headerSource, new RegExp(`<div>${label}</div>`));
  }

  assert.equal(headerSource.match(/text-xs font-medium/g)?.length, 8);
  assert.equal(headerSource.match(/lg:text-sm/g)?.length, 8);
  assert.doesNotMatch(headerSource, /text-\[11px\]|lg:text-xs/);
});

test("sticky header background fills the viewport during horizontal page scrolling", () => {
  const headerSource = readFileSync("app/components/Header.tsx", "utf8");
  const globalStyles = readFileSync("app/globals.css", "utf8");

  assert.match(headerSource, /sticky top-0/);
  assert.match(headerSource, /full-width-header-bg/);
  assert.doesNotMatch(headerSource, /sticky left-0 top-0/);
  assert.doesNotMatch(headerSource, /w-screen/);
  assert.match(globalStyles, /\.full-width-header-bg\s*\{[\s\S]*isolation:\s*isolate/);
  assert.match(globalStyles, /--header-bg-translucent:\s*color-mix\(in srgb, var\(--bg\) 60%, transparent\)/);
  assert.match(globalStyles, /background:\s*var\(--header-bg-translucent\)/);
  assert.match(globalStyles, /\.full-width-header-bg::before\s*\{/);
  assert.match(globalStyles, /inset:\s*0 -100vmax/);
  assert.doesNotMatch(globalStyles, /\.full-width-header-bg::before\s*\{[\s\S]*background:\s*var\(--bg\)/);
  assert.match(globalStyles, /z-index:\s*-1/);
  assert.doesNotMatch(globalStyles, /box-shadow:\s*0 0 0 100vmax var\(--bg\)/);
});
