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

test("tier settings offers confirmed assignment and full reset actions", () => {
  const settings = fs.readFileSync("app/components/tabs/tier/TierSettingsPanel.tsx", "utf8");
  const board = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(settings, />설정</);
  assert.doesNotMatch(settings, />티어 설정</);
  assert.match(settings, /목록 초기화/);
  assert.match(settings, /전부 초기화/);
  assert.match(settings, /window\.confirm/);
  assert.match(board, /clearTierAssignments\(board\)/);
  assert.match(board, /createDefaultTierBoard\(\)/);
});

test("clicking an editable tier nikke removes it from the tier", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /onRemove/);
  assert.match(source, /onClick=\{onRemove\}/);
  assert.match(source, /removeNikkeFromTier\(board, name\)/);
});

test("tier dragging has no follower overlay or empty-row instruction text", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.doesNotMatch(source, /DragOverlay/);
  assert.doesNotMatch(source, /activeNikkeName|activeImageUrl/);
  assert.doesNotMatch(source, /니케를 여기에 놓으세요|배치된 니케가 없습니다/);
  assert.match(source, /DndContext/);
  assert.match(source, /useDroppable/);
  assert.match(source, /moveNikke/);
});

test("dragged tier cards stay opaque and move without transition lag", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.doesNotMatch(source, /opacity:\s*isDragging/);
  assert.doesNotMatch(source, /transform,\s*transition,\s*isDragging/);
  assert.match(source, /transform:\s*CSS\.Transform\.toString\(transform\)/);
});

test("placed tier cards use larger names and a light-mode white background", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /bg-white\/80/);
  assert.match(source, /dark:bg-black\/25/);
  assert.match(source, /text-\[11px\]/);
  assert.doesNotMatch(source, /text-\[10px\] text-white/);
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
  assert.match(source, /bursts\.map/);
  assert.match(source, /elements\.map/);
  assert.match(source, /roles\.map/);
  assert.match(source, /useDraggable/);
});

test("assigned catalog nikkes use a gray image treatment without tier badges", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.match(source, /grayscale/);
  assert.match(source, /bg-neutral-500\/35/);
  assert.doesNotMatch(source, /\{tierName\}\s*<\/span>/);
});

test("catalog nikkes drag at full opacity", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.doesNotMatch(source, /opacity:\s*isDragging/);
  assert.doesNotMatch(source, /transform,\s*isDragging/);
  assert.match(source, /transform:\s*CSS\.Translate\.toString\(transform\)/);
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

test("tier row renders its label before the nikke content", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.ok(source.indexOf("data-tier-row-label") < source.indexOf("data-tier-row-content"));
  assert.match(source, /grid-cols-\[4\.5rem_minmax\(0,1fr\)\]/);
});

test("tier row name editor stays inside the narrow label column", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /data-tier-row-label[\s\S]*?overflow-hidden/);
  assert.match(
    source,
    /<EditableLabel[\s\S]*?value=\{row\.name\}[\s\S]*?className="w-full max-w-full text-center"/,
  );
});

test("tier filters share one left-aligned scrolling row without group titles", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.match(source, /data-tier-filter-bar/);
  assert.match(source, /overflow-x-auto/);
  assert.doesNotMatch(source, />버스트<|>코드<|>클래스</);
});

test("selected tier filters match the deck-building score apply mint style", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.match(source, /border-cyan-500\/40 bg-cyan-500\/10/);
  assert.match(source, /text-\[var\(--text\)\]/);
  assert.doesNotMatch(source, /border-emerald-300 bg-emerald-300/);
});

test("tier sections do not render descriptive copy", () => {
  const board = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");
  const catalog = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.doesNotMatch(board, /이름은 더블클릭|공용 니케 티어표/);
  assert.doesNotMatch(catalog, /니케를 위 티어 줄|현재 공용 티어 배치/);
});

test("development tier editing persists locally without PATCH requests", () => {
  const source = fs.readFileSync("app/components/tabs/TierTab.tsx", "utf8");

  assert.match(source, /process\.env\.NODE_ENV !== "production"/);
  assert.match(source, /soloraid_nikke_tier_preview_v1/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /if \(localPreview\)/);
});
