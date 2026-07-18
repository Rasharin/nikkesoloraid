# 니케 티어 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 사용자가 열람하고 마스터와 기존 기션덱 사용자만 편집할 수 있는 공용 니케 티어 탭을 구축한다.

**Architecture:** Supabase의 단일 행 `nikke_tier_board` 테이블에 섹션명과 티어 줄 JSON을 저장하고, RLS와 Next.js 서버 API 양쪽에서 편집 권한을 검증한다. 순수 함수 모듈이 정규화·니케 이동·색상 대비를 담당하고, 메모이제이션된 `TierTab`이 `@dnd-kit` 기반 UI와 공개 니케 목록을 조합한다.

**Tech Stack:** TypeScript, React, Next.js App Router, Tailwind CSS, Supabase/PostgreSQL RLS, `@dnd-kit/core`, `@dnd-kit/sortable`, Node test runner

## Global Constraints

- 경로는 `/tier`, 헤더 순서는 `덱 빌딩 → 티어 → 사용법`이다.
- 모든 이용자는 로그인 여부와 관계없이 열람할 수 있다.
- 편집자는 `app_config.master_user_id`와 기션덱 사용자 UUID `2d455703-52fd-4239-82f8-79c5e1856f30`뿐이다.
- 한 니케는 전체 티어표에 한 번만 존재하며 드래그는 복사가 아니라 이동이다.
- 기본 줄은 S, A, B, C, D의 5줄이며 최소 1줄, 최대 20줄이다.
- 설정 패널은 줄 수·순서·이름·색상을 편집하며 색상 입력은 `input[type="color"]`를 사용한다.
- 니케 목록의 카드, 이름 검색, 버스트·코드·클래스 필터는 니케 관리 화면과 같은 형식을 따른다.
- 기존 `app/components/Header.tsx`와 `tests/header-text-only-tabs.test.ts`의 미커밋 사용자 변경을 보존하고 충돌 시 현재 작업 내용을 기준으로 최소 병합한다.
- 새 동작은 테스트가 먼저 실패한 뒤 구현한다.

---

## File Structure

- `lib/submaster.ts`: 기션덱/서브마스터 공용 UUID 상수
- `lib/nikke-tier.ts`: 티어 타입, 기본값, 정규화, 이동, 줄 편집, 대비색 순수 함수
- `supabase/120_nikke_tier_board.sql`: 단일 행 테이블, 갱신 트리거, 공개 SELECT 및 제한된 쓰기 RLS
- `app/api/tier-board/tier-board-server.ts`: 서버 환경, 세션, 권한, payload 정규화와 DB 저장
- `app/api/tier-board/route.ts`: GET/PATCH HTTP 계약
- `app/components/tabs/tier/TierBoard.tsx`: 편집 가능한 티어 줄과 드래그 대상
- `app/components/tabs/tier/TierSettingsPanel.tsx`: 줄 추가·삭제·정렬·이름·색상 UI
- `app/components/tabs/tier/TierNikkeCatalog.tsx`: 니케 관리형 검색·필터·드래그 원본 목록
- `app/components/tabs/TierTab.tsx`: 로딩·저장·충돌 복구·화면 조합
- `app/components/Header.tsx`, `app/page.tsx`, `lib/site.ts`: 탭과 라우팅 통합
- `tests/nikke-tier.test.ts`: 순수 동작 단위 테스트
- `tests/nikke-tier-api.test.mjs`: API 권한·충돌 계약 테스트
- `tests/nikke-tier-tab.test.ts`: 라우팅과 UI 정적 회귀 테스트

---

### Task 1: 티어 도메인 모델과 이동 규칙

**Files:**
- Create: `lib/submaster.ts`
- Create: `lib/nikke-tier.ts`
- Create: `tests/nikke-tier.test.ts`

**Interfaces:**
- Produces: `SUBMASTER_USER_ID: string`
- Produces: `TierRow`, `TierBoardData`, `TierMove`
- Produces: `createDefaultTierBoard()`, `normalizeTierBoard(value, validNikkeNames)`, `moveNikke(board, move)`, `removeTierRow(board, rowId)`, `getContrastingTextColor(hex)`

- [ ] **Step 1: Write failing tests for defaults and normalization**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultTierBoard,
  normalizeTierBoard,
  type TierBoardData,
} from "../lib/nikke-tier.ts";

test("creates the five default tier rows", () => {
  const board = createDefaultTierBoard();
  assert.equal(board.sectionName, "니케 티어");
  assert.deepEqual(board.rows.map((row) => row.name), ["S", "A", "B", "C", "D"]);
  assert.deepEqual(board.rows.map((row) => row.color), [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  ]);
});

test("normalizes invalid rows and removes unknown or duplicate nikkes", () => {
  const value = {
    sectionName: "  공용 티어  ",
    rows: [
      { id: "s", name: " S ", color: "#EF4444", nikkeNames: ["라피", "라피", "없는니케"] },
      { id: "a", name: "", color: "red", nikkeNames: ["라피", "아니스"] },
    ],
    updatedAt: "2026-07-19T00:00:00.000Z",
  };
  const board = normalizeTierBoard(value, new Set(["라피", "아니스"]));
  assert.equal(board.sectionName, "공용 티어");
  assert.deepEqual(board.rows[0].nikkeNames, ["라피"]);
  assert.equal(board.rows[1].name, "A");
  assert.equal(board.rows[1].color, "#f97316");
  assert.deepEqual(board.rows[1].nikkeNames, ["아니스"]);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- tests/nikke-tier.test.ts`

Expected: FAIL because `lib/nikke-tier.ts` does not exist.

- [ ] **Step 3: Implement types, constants, defaults, and normalization**

```ts
export const TIER_ROW_MIN = 1;
export const TIER_ROW_MAX = 20;
export const DEFAULT_TIER_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"] as const;

export type TierRow = { id: string; name: string; color: string; nikkeNames: string[] };
export type TierBoardData = { sectionName: string; rows: TierRow[]; updatedAt: string | null };

export function createDefaultTierBoard(): TierBoardData {
  return {
    sectionName: "니케 티어",
    rows: ["S", "A", "B", "C", "D"].map((name, index) => ({
      id: `tier-${name.toLowerCase()}`,
      name,
      color: DEFAULT_TIER_COLORS[index],
      nikkeNames: [],
    })),
    updatedAt: null,
  };
}
```

Implement `normalizeTierBoard` with `#RRGGBB` validation, trimmed names, stable unique IDs, a 1–20 row clamp, valid-name filtering, and one global `seenNikkes` set. Export the fixed fallback name and color helpers so row creation uses the same rules.

- [ ] **Step 4: Write failing movement and color tests**

```ts
import { getContrastingTextColor, moveNikke, removeTierRow } from "../lib/nikke-tier.ts";

test("moves a nikke between rows without copying", () => {
  const board: TierBoardData = {
    sectionName: "니케 티어",
    updatedAt: null,
    rows: [
      { id: "s", name: "S", color: "#ef4444", nikkeNames: ["라피", "아니스"] },
      { id: "a", name: "A", color: "#f97316", nikkeNames: [] },
    ],
  };
  const moved = moveNikke(board, { nikkeName: "라피", targetRowId: "a", targetIndex: 0 });
  assert.deepEqual(moved.rows[0].nikkeNames, ["아니스"]);
  assert.deepEqual(moved.rows[1].nikkeNames, ["라피"]);
});

test("removing a row leaves its nikkes unassigned", () => {
  const board = createDefaultTierBoard();
  board.rows[0].nikkeNames = ["라피"];
  const next = removeTierRow(board, board.rows[0].id);
  assert.equal(next.rows.length, 4);
  assert.equal(next.rows.some((row) => row.nikkeNames.includes("라피")), false);
});

test("chooses readable text colors", () => {
  assert.equal(getContrastingTextColor("#ffffff"), "#111827");
  assert.equal(getContrastingTextColor("#111827"), "#ffffff");
});
```

- [ ] **Step 5: Run and verify the new tests fail for missing functions**

Run: `npm test -- tests/nikke-tier.test.ts`

Expected: defaults pass; movement/color tests FAIL because the exported functions are missing.

- [ ] **Step 6: Implement movement, row removal, and WCAG contrast**

```ts
export type TierMove = { nikkeName: string; targetRowId: string; targetIndex?: number };

export function moveNikke(board: TierBoardData, move: TierMove): TierBoardData {
  if (!board.rows.some((row) => row.id === move.targetRowId)) return board;
  const rows = board.rows.map((row) => ({ ...row, nikkeNames: row.nikkeNames.filter((name) => name !== move.nikkeName) }));
  const target = rows.find((row) => row.id === move.targetRowId)!;
  const index = Math.max(0, Math.min(move.targetIndex ?? target.nikkeNames.length, target.nikkeNames.length));
  target.nikkeNames.splice(index, 0, move.nikkeName);
  return { ...board, rows };
}
```

Implement `removeTierRow` as a no-op at one row and implement sRGB luminance-based `getContrastingTextColor`.

- [ ] **Step 7: Run focused and full tests**

Run: `npm test -- tests/nikke-tier.test.ts`

Expected: all tier domain tests PASS.

Run: `npm test`

Expected: all repository tests PASS.

- [ ] **Step 8: Commit**

```powershell
git add lib/submaster.ts lib/nikke-tier.ts tests/nikke-tier.test.ts
git commit -m "feat: add nikke tier domain model"
```

---

### Task 2: Supabase storage, RLS, and server API

**Files:**
- Create: `supabase/120_nikke_tier_board.sql`
- Create: `app/api/tier-board/tier-board-server.ts`
- Create: `app/api/tier-board/route.ts`
- Create: `tests/nikke-tier-api.test.mjs`
- Modify: `app/components/recommend/GiseonDeckSection.tsx`

**Interfaces:**
- Consumes: `SUBMASTER_USER_ID`, `normalizeTierBoard`, `TierBoardData`
- Produces: `GET /api/tier-board -> { board: TierBoardData; canEdit: boolean }`
- Produces: `PATCH /api/tier-board` body `{ sectionName, rows, expectedUpdatedAt }`
- Produces: PATCH success `{ board }`, 403 `{ error }`, 409 `{ error, board }`

- [ ] **Step 1: Verify current Supabase compatibility references**

Read the current Supabase changelog and official RLS/auth documentation required by the Supabase skill. Confirm no breaking change affects `@supabase/ssr` cookie auth, RLS `TO` clauses, or PostgreSQL JSONB updates. Record only implementation-impacting findings as comments in the plan execution notes; do not copy documentation into source.

- [ ] **Step 2: Write failing API contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("tier migration exposes reads and restricts writes to master or submaster", () => {
  const sql = fs.readFileSync("supabase/120_nikke_tier_board.sql", "utf8");
  assert.match(sql, /for select\s+to anon, authenticated/i);
  assert.match(sql, /master_user_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(sql, /2d455703-52fd-4239-82f8-79c5e1856f30/i);
  assert.match(sql, /with check/i);
});

test("tier API implements public GET and authenticated PATCH with conflict response", () => {
  const route = fs.readFileSync("app/api/tier-board/route.ts", "utf8");
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /status:\s*403/);
  assert.match(route, /status:\s*409/);
});
```

- [ ] **Step 3: Run and verify RED**

Run: `node --test tests/nikke-tier-api.test.mjs`

Expected: FAIL because the migration and API route do not exist.

- [ ] **Step 4: Add the table, trigger, grants, and RLS**

Create SQL that:

```sql
create table if not exists public.nikke_tier_board (
  id integer primary key default 1 check (id = 1),
  section_name text not null default '니케 티어',
  rows jsonb not null default '[]'::jsonb check (jsonb_typeof(rows) = 'array'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nikke_tier_board enable row level security;
grant select on public.nikke_tier_board to anon, authenticated;
grant insert, update on public.nikke_tier_board to authenticated;
```

Add a `security invoker` updated-at trigger function, a public SELECT policy, and INSERT/UPDATE policies whose predicate is:

```sql
exists (
  select 1 from public.app_config
  where master_user_id = (select auth.uid())
)
or (select auth.uid()) = '2d455703-52fd-4239-82f8-79c5e1856f30'::uuid
```

The UPDATE policy must contain both `USING` and `WITH CHECK`. Revoke DELETE from `anon, authenticated`.

- [ ] **Step 5: Implement server helpers and route**

Use the existing server environment/cookie patterns from `app/api/stats/heartbeat/route.ts`. `GET` reads row `id=1`, returns normalized defaults if missing, and computes `canEdit` from the authenticated UUID. `PATCH`:

1. Requires a user, returning 401 otherwise.
2. Requires master/submaster, returning 403 otherwise.
3. Loads all valid `nikkes.name` values.
4. Normalizes the request.
5. Compares `expectedUpdatedAt` with the stored row, returning 409 plus current board on mismatch.
6. Upserts `id=1`, `section_name`, `rows`, `updated_by`.
7. Returns the normalized saved row.

Keep the service role key server-only; never expose it in a `NEXT_PUBLIC_` variable.

- [ ] **Step 6: Replace the duplicated Giseon UUID**

```ts
import { SUBMASTER_USER_ID } from "../../../lib/submaster";
```

Remove the local `SUBMASTER_USER_ID` declaration from `GiseonDeckSection.tsx` so both features consume the same constant.

- [ ] **Step 7: Run API tests and repository tests**

Run: `node --test tests/nikke-tier-api.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Validate schema**

Using the connected Supabase project when available, execute the SQL, verify anonymous SELECT, verify a normal authenticated user cannot INSERT/UPDATE, and verify the master/submaster can UPDATE. Run Supabase database advisors and resolve findings caused by this migration. If no connected project is available, run the local Supabase CLI discovered through `supabase --help`; if neither is configured, report the unexecuted remote validation explicitly while continuing local build verification.

- [ ] **Step 9: Commit**

```powershell
git add supabase/120_nikke_tier_board.sql app/api/tier-board app/components/recommend/GiseonDeckSection.tsx tests/nikke-tier-api.test.mjs
git commit -m "feat: secure shared nikke tier board"
```

---

### Task 3: Tier board and settings UI

**Files:**
- Create: `app/components/tabs/tier/TierBoard.tsx`
- Create: `app/components/tabs/tier/TierSettingsPanel.tsx`
- Create: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `TierBoardData`, `TierRow`, `getContrastingTextColor`
- Produces: `TierBoardProps { board, nikkes, canEdit, saving, onChange }`
- Produces: `TierSettingsPanelProps { rows, onChange, onClose }`

- [ ] **Step 1: Write failing static UI tests**

```ts
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
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/nikke-tier-tab.test.ts`

Expected: FAIL because the tier UI files do not exist.

- [ ] **Step 3: Implement the settings panel**

Create a focused component that clones rows before every update. Add:

- controlled name input
- `<input type="color" value={row.color}>`
- uppercase HEX preview
- up/down buttons disabled at bounds
- delete button disabled at one row
- add button disabled at 20 rows

New rows use `crypto.randomUUID()` in the browser, the next `DEFAULT_TIER_COLORS` entry, `티어 N` as name, and an empty `nikkeNames`.

- [ ] **Step 4: Implement tier rows and editable names**

Render each row as:

```tsx
<div className="grid min-h-24 grid-cols-[minmax(0,1fr)_5rem] overflow-hidden rounded-2xl border">
  <div>{/* sortable nikke cards and empty drop target */}</div>
  <div style={{ backgroundColor: row.color, color: getContrastingTextColor(row.color) }}>
    {/* double-click editor for canEdit, plain text otherwise */}
  </div>
</div>
```

The section title uses the same double-click editor. Only `canEdit` renders the circular settings button, input editors, draggable listeners, and settings panel.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/nikke-tier-tab.test.ts`

Expected: tier static UI tests PASS.

Run: `npm test`

Expected: all repository tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierSettingsPanel.tsx tests/nikke-tier-tab.test.ts
git commit -m "feat: add editable tier board UI"
```

---

### Task 4: Reusable 니케 목록, 검색, 필터, 드래그

**Files:**
- Create: `app/components/tabs/tier/TierNikkeCatalog.tsx`
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Modify: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: the `NikkeRow` shape from `app/page.tsx` through explicit props, filter option arrays, `getPublicUrl`
- Produces: `TierNikkeCatalogProps { nikkes, assignedNames, canEdit, getPublicUrl, bursts, elements, roles }`
- Produces: DnD data `{ source: "catalog" | "tier"; nikkeName: string; rowId?: string; index?: number }`

- [ ] **Step 1: Add failing catalog tests**

```ts
test("tier catalog includes name search and all three filter groups", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierNikkeCatalog.tsx", "utf8");
  assert.match(source, /니케 이름 검색/);
  assert.match(source, /버스트/);
  assert.match(source, /코드/);
  assert.match(source, /클래스/);
  assert.match(source, /useDraggable/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/nikke-tier-tab.test.ts`

Expected: FAIL because `TierNikkeCatalog.tsx` does not exist.

- [ ] **Step 3: Implement catalog filtering**

Match `SettingsTab` behavior exactly:

```ts
const filteredNikkes = useMemo(() => nikkes.filter((nikke) => {
  const query = search.trim().toLowerCase();
  if (query && !nikke.name.toLowerCase().includes(query)
    && !nikke.aliases.some((alias) => alias.toLowerCase().includes(query))) return false;
  if (selectedBursts.size && !((nikke.burst ?? -1) === 0 || selectedBursts.has(nikke.burst ?? -1))) return false;
  if (selectedElements.size && (!nikke.element || !selectedElements.has(nikke.element))) return false;
  if (selectedRoles.size && (!nikke.role || !selectedRoles.has(nikke.role))) return false;
  return true;
}), [nikkes, search, selectedBursts, selectedElements, selectedRoles]);
```

Render the same image/name badge hierarchy used by `SettingsTab`. Assigned cards remain present and show their tier name. Disable `useDraggable` when `canEdit` is false.

- [ ] **Step 4: Connect sortable DnD**

Wrap board and catalog in one `DndContext` with mouse, touch, and keyboard sensors. On drag end:

- catalog → row: append through `moveNikke`
- tier → another row: insert through `moveNikke`
- tier → same row card: insert at the target index through `moveNikke`
- invalid drop: do nothing

Use `DragOverlay` for a stable image preview and `SortableContext` per row.

- [ ] **Step 5: Run focused and full tests**

Run: `npm test -- tests/nikke-tier.test.ts tests/nikke-tier-tab.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all repository tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-tier-tab.test.ts
git commit -m "feat: add tier drag and nikke catalog"
```

---

### Task 5: Data lifecycle and tab integration

**Files:**
- Create: `app/components/tabs/TierTab.tsx`
- Modify: `app/page.tsx`
- Modify: `app/components/Header.tsx`
- Modify: `lib/site.ts`
- Modify: `tests/nikke-tier-tab.test.ts`
- Modify: `tests/header-text-only-tabs.test.ts`

**Interfaces:**
- Consumes: `GET/PATCH /api/tier-board`, `TierBoard`, existing `nikkes`, `getPublicUrl`, filter option arrays
- Produces: `TierTabProps`
- Produces: `TabKey` member `"tier"` and route `/tier`

- [ ] **Step 1: Add failing routing and persistence tests**

```ts
test("tier tab is routed between deck building and usage", () => {
  const page = fs.readFileSync("app/page.tsx", "utf8");
  const header = fs.readFileSync("app/components/Header.tsx", "utf8");
  assert.match(page, /tier:\s*"\/tier"/);
  assert.ok(header.indexOf('onTabChange("imaginary")') < header.indexOf('onTabChange("tier")'));
  assert.ok(header.indexOf('onTabChange("tier")') < header.indexOf('onTabChange("usage")'));
});

test("tier tab loads and saves through the server API", () => {
  const source = fs.readFileSync("app/components/tabs/TierTab.tsx", "utf8");
  assert.match(source, /fetch\("\/api\/tier-board"/);
  assert.match(source, /method:\s*"PATCH"/);
  assert.match(source, /expectedUpdatedAt/);
  assert.match(source, /409/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/nikke-tier-tab.test.ts tests/header-text-only-tabs.test.ts`

Expected: FAIL because the route, header button, and `TierTab` are missing.

- [ ] **Step 3: Implement TierTab load/save lifecycle**

`TierTab` loads once on mount. Store:

- `board`
- `lastServerBoard`
- `canEdit`
- `loading`
- `saving`
- `error`
- monotonically increasing save request number

On user change, update immediately and debounce PATCH by 350 ms. Send `expectedUpdatedAt: lastServerBoard.updatedAt`. Ignore stale responses by request number. On 403 or other failures restore `lastServerBoard`; on 409 install the returned current board and show “다른 편집자가 먼저 수정했습니다. 최신 내용을 불러왔습니다.”

- [ ] **Step 4: Integrate page state and route**

Add `"tier"` to both page/header `TabKey` types. Add:

```ts
tier: "/tier",
```

and:

```ts
"/tier": "tier",
```

Add `/tier` to `lib/site.ts` public routes. Import and render memoized `TierTab` between the imaginary and usage branches, passing `nikkes`, `getPublicUrl`, `bursts`, `elements`, and `roles`.

- [ ] **Step 5: Merge the header button carefully**

Preserve the user's current uncommitted text-only header edits. Increase the grid column count from 7 to 8 and insert a text-only `티어` button between `덱 빌딩` and `사용법`. Update the existing header regression test to expect eight tabs without discarding its current assertions.

- [ ] **Step 6: Run focused, full, lint, and build verification**

Run: `npm test -- tests/nikke-tier-tab.test.ts tests/header-text-only-tabs.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

Run: `npm run lint`

Expected: exit code 0 with no new errors.

Run: `npm run build`

Expected: Next.js production build succeeds and `/tier` is included.

- [ ] **Step 7: Commit**

```powershell
git add app/components/tabs/TierTab.tsx app/page.tsx app/components/Header.tsx lib/site.ts tests/nikke-tier-tab.test.ts tests/header-text-only-tabs.test.ts
git commit -m "feat: integrate public nikke tier tab"
```

---

### Task 6: Browser verification and completion audit

**Files:**
- Modify only files implicated by observed defects

**Interfaces:**
- Consumes: complete `/tier` feature
- Produces: verified desktop/mobile reader and editor flows

- [ ] **Step 1: Start the development server**

Run: `npm run dev`

Expected: Next.js server starts without compilation errors.

- [ ] **Step 2: Verify anonymous reader flow**

Open `/tier` without a session and confirm:

- tier title, five default rows, and full catalog render
- search and all filters work
- no settings button, inline editor, or drag interaction is available
- header order is `덱 빌딩`, `티어`, `사용법`

- [ ] **Step 3: Verify editor flow**

Using a master or submaster session, confirm:

- section and row names edit on double-click
- settings opens from a circular gear button
- row add/delete/reorder works within 1–20 bounds
- the native color picker changes the row immediately and text remains readable
- catalog → tier, tier → tier, and same-row reorder all move without duplication
- refresh preserves the saved result

- [ ] **Step 4: Verify responsive and keyboard behavior**

Check a mobile viewport and desktop viewport. Confirm the right-side row label remains visible, catalog cards do not overflow, touch drag works, keyboard drag has focus-visible controls, and settings is operable without horizontal page scrolling.

- [ ] **Step 5: Re-run completion checks**

Run: `npm test`

Expected: PASS.

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 6: Commit browser-found fixes if any**

Run `git diff --name-only`, review every reported path, and stage only files changed to correct defects observed in Steps 2–4. Then run:

```powershell
git commit -m "fix: polish nikke tier interactions"
```

Skip this step when browser verification requires no source changes.
