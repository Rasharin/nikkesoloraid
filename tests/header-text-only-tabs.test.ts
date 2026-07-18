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
