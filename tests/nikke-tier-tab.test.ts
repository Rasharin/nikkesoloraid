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

test("tier drag completion does not trigger click removal", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /draggedNikkeRef/);
  assert.match(source, /onDragStart=\{handleDragStart\}/);
  assert.match(source, /if \(draggedNikkeRef\.current === name\) return/);
  assert.match(source, /setTimeout/);
});

test("tier card images cannot intercept sortable dragging", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(
    source,
    /<Image[\s\S]*?draggable=\{false\}[\s\S]*?className="pointer-events-none object-cover"/,
  );
});

test("tier rows accept vertical drops anywhere across the full row", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /pointerWithin/);
  assert.match(source, /<div[\s\S]*?ref=\{setNodeRef\}[\s\S]*?data-tier-row/);
  assert.match(source, /collisionDetection=\{tierCollisionDetection\}/);
});

test("dragged tier cards remain visible outside their source row", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /data-tier-row[\s\S]{0,180}?className=\{`[^`]*overflow-visible/);
  assert.match(source, /data-tier-row-label[\s\S]*?rounded-l-2xl/);
});

test("catalog dragging opens and commits a sortable insertion gap", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /type CatalogDropPreview/);
  assert.match(source, /const \[catalogPreview, setCatalogPreview\]/);
  assert.match(source, /catalogPreviewRef/);
  assert.match(source, /function updateCatalogPreview/);
  assert.match(source, /function handleDragOver\(event: DragOverEvent\)/);
  assert.match(source, /const tierCollisionDetection: CollisionDetection/);
  assert.match(source, /closestCenter/);
  assert.match(source, /onDragOver=\{handleDragOver\}/);
  assert.match(source, /data-tier-insertion-placeholder/);
  assert.match(source, /data-tier-card/);
  assert.match(source, /data-tier-row-id/);
  assert.match(source, /function getCatalogInsertionIndex/);
  assert.match(source, /sortableItems/);
  assert.match(source, /const previewTarget = catalogPreviewRef\.current/);
  assert.match(source, /const targetIndex[\s\S]*?previewTarget\?\.index/);
  assert.match(source, /moveNikke\(board,[\s\S]*?targetIndex,/);
  assert.match(source, /sameVisualLine\s*\?\s*activeCenterX < cardCenterX\s*:\s*activeCenterY < cardCenterY/);
});

test("tier cards use a fully opaque overlay across row boundaries", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /DragOverlay/);
  assert.match(source, /function TierNikkeCardVisual/);
  assert.match(source, /const \[activeTierNikkeName, setActiveTierNikkeName\]/);
  assert.match(source, /activeData\.source === "tier"/);
  assert.match(source, /visibility:\s*isDragging\s*\?\s*"hidden"\s*:\s*undefined/);
  assert.match(source, /<DragOverlay[\s\S]*?<TierNikkeCardVisual/);
  assert.doesNotMatch(source, /opacity:\s*isDragging/);
  assert.doesNotMatch(source, /니케를 여기에 놓으세요|배치된 니케가 없습니다/);
});

test("the sortable tier card preserves its layout slot while the overlay follows the pointer", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /transform,\s*transition,\s*isDragging/);
  assert.match(source, /transition:\s*isDragging\s*\?\s*"none"\s*:\s*transition/);
  assert.match(source, /zIndex:\s*isDragging\s*\?\s*20\s*:\s*undefined/);
  assert.match(source, /position:\s*isDragging\s*\?\s*"relative"\s*:\s*undefined/);
  assert.match(source, /visibility:\s*isDragging\s*\?\s*"hidden"\s*:\s*undefined/);
  assert.doesNotMatch(source, /opacity:\s*isDragging/);
  assert.match(source, /transform:\s*CSS\.Transform\.toString\(transform\)/);
});

test("placed tier cards use 13px names and a light-mode white background", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");
  const layout = fs.readFileSync("lib/tier-local-layout.ts", "utf8");

  assert.match(source, /bg-white\/80/);
  assert.match(source, /dark:bg-black\/25/);
  assert.match(layout, /default:[\s\S]*?text-\[13px\]/);
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

test("tier editors can resize their local board above the measured minimum", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");
  const styles = fs.readFileSync("app/globals.css", "utf8");

  assert.match(source, /TIER_LOCAL_LAYOUT_KEY/);
  assert.match(source, /parseTierLocalLayout/);
  assert.match(source, /clampTierSectionSize/);
  assert.match(source, /onPointerDown=\{handleResizeStart\}/);
  assert.match(source, /aria-label="티어 섹션 크기 조절"/);
  assert.match(source, /canEdit \? \(/);
  assert.match(source, /overflow-y-auto/);
  assert.match(source, /maxWidth:\s*"calc\(100vw - 2rem\)"/);
  assert.match(source, /text-\[var\(--tier-resize-handle\)\]/);
  assert.match(styles, /--tier-resize-handle:\s*#ffffff/);
  assert.match(styles, /:root\[data-theme="light"\][\s\S]*--tier-resize-handle:\s*#00b8db/);
  assert.match(source, /<svg[\s\S]*viewBox="0 0 32 32"/);
  assert.match(source, /<path d="M10 32C22 29 29 22 32 10V32Z"/);
});

test("tier settings expose three local card sizes and a separate reset", () => {
  const settings = fs.readFileSync("app/components/tabs/tier/TierSettingsPanel.tsx", "utf8");
  const board = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(settings, /cardSize/);
  assert.match(settings, /작게/);
  assert.match(settings, /기본/);
  assert.match(settings, /크게/);
  assert.match(settings, /화면 크기 설정 초기화/);
  assert.match(board, /getTierCardSizeClasses/);
  assert.match(board, /onResetLocalLayout/);
  assert.match(board, /sizeClasses\.rowMinHeight/);
  assert.match(board, /boardSizeClasses\.boardGap/);
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

test("catalog nikke names use 13px text with tighter vertical padding", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.match(source, /py-\[5px\]/);
  assert.match(source, /text-\[13px\]/);
  assert.doesNotMatch(source, /text-\[16\.5px\]/);
  assert.doesNotMatch(source, /text-\[11px\] text-\[var\(--theme-text-soft\)\]/);
});

test("catalog cards follow the pointer without transition lag at full opacity", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");

  assert.doesNotMatch(source, /opacity:\s*isDragging/);
  assert.match(source, /setNodeRef,\s*transform,\s*isDragging/);
  assert.match(source, /transform:\s*CSS\.Translate\.toString\(transform\)/);
  assert.match(source, /transition:\s*isDragging\s*\?\s*"none"\s*:\s*undefined/);
  assert.match(source, /zIndex:\s*isDragging\s*\?\s*30\s*:\s*undefined/);
  assert.match(source, /position:\s*isDragging\s*\?\s*"relative"\s*:\s*undefined/);
  assert.doesNotMatch(source, /text-left transition/);
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
