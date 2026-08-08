# 티어 가로·세로 카탈로그 배치 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 티어 기능을 유지하면서 전체 니케 목록을 티어표 오른쪽에 배치하는 새로고침 유지형 가로 모드를 추가한다.

**Architecture:** `TierBoard`가 로컬 배치 상태와 티어표 높이 측정을 소유하고, `TierSettingsPanel`은 단일 스위치만 표시하며, `TierNikkeCatalog`는 기존 검색·필터·드래그 상태를 그대로 유지한 채 모드별 표현만 바꾼다. 배치 저장값 검증은 `lib/tier-catalog-layout.ts`의 순수 함수로 분리한다.

**Tech Stack:** TypeScript, React 18, Next.js App Router, Tailwind CSS, Node test runner, dnd-kit

## Global Constraints

- 세로 모드는 현재 티어표 아래 카탈로그 배치와 아래 방향 접힘 동작을 유지한다.
- 가로 모드는 기본 6열이며, 가용 폭이 줄어 6열 미만이 되면 카드와 글자 크기도 줄인다.
- 가로 모드 카탈로그 높이는 티어표의 실제 높이를 따르고 카드 영역만 세로 스크롤한다.
- 검색·필터는 모드 전환 후에도 유지하며 필터 버튼은 한 줄을 유지한다.
- 클릭 배치, dnd-kit 드래그, `DragOverlay`, 삽입 위치 계산, 로컬 티어 크기 조절, 서버 저장을 변경하지 않는다.
- 배치 상태는 브라우저 로컬 저장소에 저장하며 잘못된 값은 세로 모드로 복구한다.

---

## 파일 구조

- Create: `lib/tier-catalog-layout.ts` — 배치 모드 타입, 저장 키, 저장값 파서
- Create: `tests/tier-catalog-layout.test.ts` — 순수 파서 단위 테스트
- Modify: `app/components/tabs/tier/TierBoard.tsx` — 상태 영속성, 높이 관찰, 모드별 외부 배치
- Modify: `app/components/tabs/tier/TierSettingsPanel.tsx` — 가로/세로 단일 스위치
- Modify: `app/components/tabs/tier/TierNikkeCatalog.tsx` — 모드별 접힘, 6열 반응형 그리드, 내부 스크롤
- Modify: `tests/nikke-tier-tab.test.ts` — 컴포넌트 연결과 기존 기능 보존 회귀 검사

### Task 1: 배치 모드 저장값 경계

**Files:**
- Create: `lib/tier-catalog-layout.ts`
- Create: `tests/tier-catalog-layout.test.ts`

**Interfaces:**
- Consumes: 브라우저 로컬 저장소의 `string | null`
- Produces: `TIER_CATALOG_LAYOUT_KEY`, `TierCatalogLayoutMode`, `parseTierCatalogLayoutMode(value): TierCatalogLayoutMode`

- [ ] **Step 1: 실패하는 파서 테스트 작성**

```ts
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
```

- [ ] **Step 2: 테스트가 모듈 부재로 실패하는지 확인**

Run: `node --import tsx --test tests/tier-catalog-layout.test.ts`

Expected: FAIL because `../lib/tier-catalog-layout` does not exist.

- [ ] **Step 3: 최소 파서 구현**

```ts
export const TIER_CATALOG_LAYOUT_KEY = "soloraid_tier_catalog_layout_v1";

export type TierCatalogLayoutMode = "bottom" | "side";

export function parseTierCatalogLayoutMode(value: string | null): TierCatalogLayoutMode {
  return value === "side" ? "side" : "bottom";
}
```

- [ ] **Step 4: 단위 테스트 통과 확인**

Run: `node --import tsx --test tests/tier-catalog-layout.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: 커밋**

```powershell
git add -- lib/tier-catalog-layout.ts tests/tier-catalog-layout.test.ts
git commit -m "feat: add tier catalog layout preference"
```

### Task 2: 설정 스위치와 배치 상태 영속성

**Files:**
- Modify: `app/components/tabs/tier/TierSettingsPanel.tsx`
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Modify: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `TierCatalogLayoutMode`, `parseTierCatalogLayoutMode`, `TIER_CATALOG_LAYOUT_KEY`
- Produces: `layoutMode: TierCatalogLayoutMode`, `onLayoutModeChange(mode)` props and a `role="switch"` control

- [ ] **Step 1: 실패하는 연결 테스트 작성**

Add tests that assert:

```ts
assert.match(settings, /layoutMode: TierCatalogLayoutMode/);
assert.match(settings, /onLayoutModeChange: \(mode: TierCatalogLayoutMode\) => void/);
assert.match(settings, /role="switch"/);
assert.match(settings, /aria-checked=\{layoutMode === "bottom"\}/);
assert.match(settings, /가로모드/);
assert.match(settings, /세로모드/);

assert.match(board, /parseTierCatalogLayoutMode/);
assert.match(board, /TIER_CATALOG_LAYOUT_KEY/);
assert.match(board, /localStorage\.setItem\(TIER_CATALOG_LAYOUT_KEY, nextMode\)/);
assert.match(board, /layoutMode=\{catalogLayoutMode\}/);
assert.match(board, /onLayoutModeChange=\{handleCatalogLayoutModeChange\}/);
```

- [ ] **Step 2: 기존 소스에 스위치와 저장 코드가 없어 실패하는지 확인**

Run: `node --import tsx --test tests/nikke-tier-tab.test.ts`

Expected: the new layout switch test fails while previous tests remain passing.

- [ ] **Step 3: 설정 패널 props와 단일 스위치 구현**

Add `layoutMode` and `onLayoutModeChange` props. Put this group immediately before the close button:

```tsx
<div className="flex items-center gap-2">
  <span>가로모드</span>
  <button
    type="button"
    role="switch"
    aria-checked={layoutMode === "bottom"}
    aria-label="전체 니케 목록 가로 세로 배치"
    onClick={() => onLayoutModeChange(layoutMode === "side" ? "bottom" : "side")}
  >
    <span className={layoutMode === "bottom" ? "translate-x-5" : "translate-x-0"} />
  </button>
  <span>세로모드</span>
</div>
```

Use existing theme variables and cyan active styling; do not change the close handler.

- [ ] **Step 4: TierBoard 상태 읽기·저장 구현**

Initialize once from local storage:

```ts
const [catalogLayoutMode, setCatalogLayoutMode] = useState<TierCatalogLayoutMode>(() => {
  if (typeof window === "undefined") return "bottom";
  try {
    return parseTierCatalogLayoutMode(window.localStorage.getItem(TIER_CATALOG_LAYOUT_KEY));
  } catch {
    return "bottom";
  }
});
```

Persist only from the explicit event transition:

```ts
function handleCatalogLayoutModeChange(nextMode: TierCatalogLayoutMode) {
  setCatalogLayoutMode(nextMode);
  try {
    window.localStorage.setItem(TIER_CATALOG_LAYOUT_KEY, nextMode);
  } catch { }
}
```

Pass state and callback to `TierSettingsPanel` and `layoutMode` to `TierNikkeCatalog`.

- [ ] **Step 5: 연결 테스트 통과 확인**

Run: `node --import tsx --test tests/nikke-tier-tab.test.ts tests/tier-catalog-layout.test.ts`

Expected: all selected tests pass.

- [ ] **Step 6: 커밋**

```powershell
git add -- app/components/tabs/tier/TierSettingsPanel.tsx app/components/tabs/tier/TierBoard.tsx tests/nikke-tier-tab.test.ts
git commit -m "feat: add tier catalog layout switch"
```

### Task 3: 가로 모드 높이 동기화와 반응형 카탈로그

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Modify: `app/components/tabs/tier/TierNikkeCatalog.tsx`
- Modify: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `layoutMode: TierCatalogLayoutMode`
- Produces: 티어표 높이와 맞는 side catalog, 가로 접힘, 6열 반응형 카드 영역

- [ ] **Step 1: 실패하는 레이아웃 회귀 테스트 작성**

Assert the new behavior and preserved behavior:

```ts
assert.match(board, /ResizeObserver/);
assert.match(board, /data-tier-layout-mode=\{catalogLayoutMode\}/);
assert.match(board, /catalogLayoutMode === "side"/);
assert.match(board, /height: tierSectionHeight/);
assert.match(catalog, /layoutMode: TierCatalogLayoutMode/);
assert.match(catalog, /data-tier-catalog-layout=\{layoutMode\}/);
assert.match(catalog, /grid-cols-6/);
assert.match(catalog, /container-type:\s*inline-size/);
assert.match(catalog, /overflow-x-auto/);
assert.match(catalog, /overflow-y-auto/);
assert.match(catalog, /layoutMode === "side"/);
assert.match(catalog, /catalogCollapsed \? "rotate-180" : ""/);
assert.match(catalog, /grid-cols-5 gap-2 sm:grid-cols-7 lg:grid-cols-12/);
```

- [ ] **Step 2: 새 가로 레이아웃 마커가 없어 실패하는지 확인**

Run: `node --import tsx --test tests/nikke-tier-tab.test.ts`

Expected: side-layout assertions fail for missing implementation.

- [ ] **Step 3: 티어표 실제 높이 관찰과 외부 2열 배치 구현**

Reuse the existing section node callback/ref. Attach a `ResizeObserver` that updates `tierSectionHeight` from `entry.contentRect.height`. In side mode render an outer grid with the tier section and catalog as siblings; set the catalog wrapper height to `tierSectionHeight` when available. In bottom mode keep the current single-column class unchanged.

Use a side layout similar to:

```tsx
<div
  data-tier-layout-mode={catalogLayoutMode}
  className={catalogLayoutMode === "side"
    ? "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)] items-start gap-5"
    : "grid grid-cols-[minmax(0,1fr)] gap-5"}
>
```

The existing `sectionSize`, `sectionOffsetX`, resize handles, and `maxWidth` calculation must remain active.

- [ ] **Step 4: 카탈로그를 모드별 구조로 변경**

Add `layoutMode`. For side mode:

- make the section `h-full min-h-0 overflow-hidden` and a column flex container;
- place the collapse button first in the top-left;
- keep search and the non-wrapping filter row above the cards;
- give the card area `min-h-0 flex-1 overflow-y-auto`;
- use six columns by default;
- use CSS container queries in a small component-local `<style jsx>` or global utility classes to reduce to 5/4/3 columns and reduce card name size/gaps below six columns.

Use stable data markers for verification:

```tsx
<section data-tier-catalog-layout={layoutMode}>
<div data-tier-catalog-scroll-region>
<div data-tier-catalog-grid>
```

For bottom mode retain the current `grid-cols-5 gap-2 sm:grid-cols-7 lg:grid-cols-12` grid verbatim. Keep `CatalogCard`, `useDraggable`, `onImageClick`, filter predicates, and assigned gray overlay unchanged.

- [ ] **Step 5: 선택 테스트 통과 확인**

Run: `node --import tsx --test tests/nikke-tier-tab.test.ts tests/tier-catalog-layout.test.ts tests/tier-local-layout.test.ts tests/nikke-tier.test.ts`

Expected: all selected tier tests pass.

- [ ] **Step 6: React/TypeScript 정적 검사**

Run: `npx eslint app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierSettingsPanel.tsx app/components/tabs/tier/TierNikkeCatalog.tsx lib/tier-catalog-layout.ts tests/tier-catalog-layout.test.ts tests/nikke-tier-tab.test.ts`

Expected: 0 errors; report any pre-existing warnings separately.

- [ ] **Step 7: 커밋**

```powershell
git add -- app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-tier-tab.test.ts
git commit -m "feat: add responsive side tier catalog"
```

### Task 4: 전체 회귀 및 브라우저 검증

**Files:**
- Modify only if a verified defect is found; add a failing test before each fix.

**Interfaces:**
- Consumes: completed layout implementation
- Produces: automated and visual evidence for every accepted requirement

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`

Expected: 0 failures.

- [ ] **Step 2: 프로덕션 빌드 실행**

Run: `npm run build`

Expected: exit code 0. Record existing warnings separately from new errors.

- [ ] **Step 3: 개발 서버에서 실제 화면 검증**

Start the configured Next.js development server, open `/tier`, and verify:

- settings header order is `가로모드 [switch] 세로모드 [닫기]`;
- switching to side moves the same catalog to the right;
- refresh preserves side mode;
- desktop side width displays six cards per row;
- narrower viewports reduce columns and card/image/name size;
- side catalog height follows the left section when resizing or opening settings;
- side collapse control stays at top-left and content collapses left/expands right;
- bottom mode retains downward collapse and current responsive grid;
- filters remain one horizontal row and search/filter state survives mode toggles;
- clicking and dragging catalog cards still moves cards correctly with no pointer drift.

- [ ] **Step 4: 변경 범위와 작업 트리 확인**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors and only intended files changed.

- [ ] **Step 5: 검증 보완 커밋**

If browser verification required code fixes, commit only those tested fixes:

```powershell
git add -- <verified-files>
git commit -m "fix: refine tier side catalog layout"
```

If no fixes were required, do not create an empty commit.
