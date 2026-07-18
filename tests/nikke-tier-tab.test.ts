import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("tier settings uses a color picker and row controls", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierSettingsPanel.tsx", "utf8");

  assert.match(source, /type="color"/);
  assert.match(source, /줄 추가/);
  assert.match(source, /위로 이동/);
  assert.match(source, /아래로 이동/);
  assert.match(source, /줄 삭제/);
});

test("tier board restricts editing affordances with canEdit", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /canEdit/);
  assert.match(source, /onDoubleClick/);
  assert.match(source, /설정/);
  assert.match(source, /DndContext/);
  assert.match(source, /SortableContext/);
});

test("tier catalog includes name search and all three filter groups", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.match(source, /니케 이름 검색/);
  assert.match(source, /버스트/);
  assert.match(source, /코드/);
  assert.match(source, /클래스/);
  assert.match(source, /useDraggable/);
});

test("tier tab is routed between deck building and usage", () => {
  const page = fs.readFileSync("app/page.tsx", "utf8");
  const header = fs.readFileSync("app/components/Header.tsx", "utf8");

  assert.match(page, /tier:\s*"\/tier"/);
  assert.ok(header.indexOf('onTabChange("imaginary")') < header.indexOf('onTabChange("tier")'));
  assert.ok(header.indexOf('onTabChange("tier")') < header.indexOf('onTabChange("usage")'));
});

test("tier has a direct App Router entry point", () => {
  const route = fs.readFileSync("app/tier/page.tsx", "utf8");

  assert.match(route, /canonicalUrl\("\/tier"\)/);
  assert.match(route, /export \{ default \} from "\.\.\/page"/);
});

test("tier tab loads and saves through the server API", () => {
  const source = fs.readFileSync("app/components/tabs/TierTab.tsx", "utf8");

  assert.match(source, /fetch\("\/api\/tier-board"/);
  assert.match(source, /method:\s*"PATCH"/);
  assert.match(source, /expectedUpdatedAt/);
  assert.match(source, /response\.status === 409/);
  assert.doesNotMatch(source, /normalizeTierBoard\(payload\.board,\s*validNames\)/);
});
