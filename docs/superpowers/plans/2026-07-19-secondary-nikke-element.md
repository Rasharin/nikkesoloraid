# 니케 보조 속성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 속성을 속성 1로 유지하면서 선택형 속성 2를 저장·수정하고, 모든 속성 필터가 두 속성 중 하나의 일치를 인식하게 한다.

**Architecture:** `nikkes.element2` nullable enum 열을 추가하고, 두 속성에 대한 정규화·필터 판정을 작은 공통 유틸리티로 분리한다. 페이지 데이터 흐름과 마스터 UI에는 `element2`만 추가하며 카드·덱 데이터 구조는 바꾸지 않는다.

**Tech Stack:** TypeScript, React 19, Next.js 16 App Router, Tailwind CSS, Supabase PostgreSQL, Node test runner

## Global Constraints

- 기존 `public.nikkes.element`는 속성 1로 유지한다.
- `element2`는 비어 있거나 속성 1과 같으면 `null`로 저장한다.
- 기존 행과 이전 캐시에 없는 `element2`는 `null`로 취급한다.
- 모든 기존 속성 필터는 속성 1 또는 속성 2 중 하나가 일치하면 포함한다.
- 카드 표시, 덱 저장 형식, 추천 계산은 변경하지 않는다.
- 마스터 전용 RLS와 속성 1 필수 검증은 유지한다.

---

### Task 1: 보조 속성 데이터 규칙과 DB 열

**Files:**
- Create: `lib/nikke-elements.ts`
- Create: `supabase/130_nikke_secondary_element.sql`
- Create: `tests/nikke-secondary-element.test.ts`

**Interfaces:**
- Produces: `normalizeSecondaryElement(primary: string | null, secondary: string | null | undefined): string | null`
- Produces: `matchesSelectedElements(nikke: { element?: string | null; element2?: string | null }, selected: ReadonlySet<string>): boolean`
- Produces: nullable `public.nikkes.element2 public.element_type` and `idx_nikkes_element2`

- [ ] **Step 1: Write failing behavior and migration tests**

Add tests that require empty and duplicate secondary values to normalize to `null`, distinct secondary values to remain, filters to match either attribute, and the migration to add a nullable enum column and index.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/nikke-secondary-element.test.ts`

Expected: FAIL because `lib/nikke-elements.ts` and `supabase/130_nikke_secondary_element.sql` do not exist.

- [ ] **Step 3: Implement the minimal shared rules and migration**

Implement:

```ts
export function normalizeSecondaryElement(
  primary: string | null,
  secondary: string | null | undefined
): string | null {
  const normalized = secondary?.trim() || null;
  return normalized && normalized !== primary ? normalized : null;
}

export function matchesSelectedElements(
  nikke: { element?: string | null; element2?: string | null },
  selected: ReadonlySet<string>
): boolean {
  if (selected.size === 0) return true;
  return Boolean(
    (nikke.element && selected.has(nikke.element)) ||
      (nikke.element2 && selected.has(nikke.element2))
  );
}
```

Add an idempotent SQL migration with `add column if not exists element2 public.element_type` and `create index if not exists idx_nikkes_element2 on public.nikkes (element2)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command.

Expected: all secondary-element unit and migration tests pass.

- [ ] **Step 5: Commit**

```powershell
git add lib/nikke-elements.ts supabase/130_nikke_secondary_element.sql tests/nikke-secondary-element.test.ts
git commit -m "feat: add secondary nikke element rules"
```

### Task 2: 니케 조회·캐시·등록·수정 데이터 흐름

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/components/home/deckBuilderTypes.ts`
- Modify: `app/components/tabs/SavedTab.tsx`
- Modify: `app/components/tabs/RecommendTab.tsx`
- Modify: `app/components/recommend/GiseonDeckSection.tsx`
- Test: `tests/nikke-secondary-element.test.ts`

**Interfaces:**
- Consumes: `normalizeSecondaryElement`
- Produces: `NikkeRow.element2` as nullable element value through fetch, cache, props, insert, and update payloads

- [ ] **Step 1: Add failing source-integration tests**

Require the main query to select `element2`, normalized rows to default it to `null`, add/update payloads to include a normalized `element2`, and shared consumer row types to accept `element2`.

- [ ] **Step 2: Run the focused test and verify RED**

Run the Task 1 focused test command.

Expected: FAIL on missing `element2` data-flow assertions.

- [ ] **Step 3: Implement minimal data-flow changes**

Extend `AddNikkePayload`, `NikkeRow`, cache normalization, Supabase select, insert, and update types/payloads with `element2`. Apply:

```ts
const element2 = normalizeSecondaryElement(payload.element, payload.element2) as NikkeElement;
```

before insert/update. Add optional or nullable `element2` to downstream row types without changing their rendering.

- [ ] **Step 4: Run the focused test and TypeScript build**

Run the focused test command, then `npm run build`.

Expected: focused tests pass and production compilation succeeds.

- [ ] **Step 5: Commit**

```powershell
git add app/page.tsx app/components/home/deckBuilderTypes.ts app/components/tabs/SavedTab.tsx app/components/tabs/RecommendTab.tsx app/components/recommend/GiseonDeckSection.tsx tests/nikke-secondary-element.test.ts
git commit -m "feat: carry secondary nikke element"
```

### Task 3: 마스터 등록·수정 UI와 전체 속성 필터

**Files:**
- Modify: `app/components/tabs/MyPageTab.tsx`
- Modify: `app/components/tabs/SettingsTab.tsx`
- Modify: `app/components/tabs/ImaginarySoloRaidTab.tsx`
- Modify: `app/components/tabs/tier/TierNikkeCatalog.tsx`
- Test: `tests/nikke-secondary-element.test.ts`

**Interfaces:**
- Consumes: `normalizeSecondaryElement` and `matchesSelectedElements`
- Produces: 속성 1·속성 2 마스터 입력/수정 UI와 모든 기존 속성 필터의 OR 매칭

- [ ] **Step 1: Add failing UI and filter wiring tests**

Require registration state and selects for `속성 1` and `속성 2 (선택)`, edit state and editable `속성 2`, and shared `matchesSelectedElements` calls in every existing filter surface.

- [ ] **Step 2: Run the focused test and verify RED**

Run the Task 1 focused test command.

Expected: FAIL because master UI and filter surfaces are not wired.

- [ ] **Step 3: Implement the registration and edit UI**

Add `nikkeElement2` and `editingNikkeValues.element2`, send both values, reset both after registration, and render the second select/edit field. After update success, store the normalized value:

```ts
element2: normalizeSecondaryElement(
  editingNikkeValues.element || null,
  editingNikkeValues.element2 || null
)
```

- [ ] **Step 4: Replace each element predicate with the shared matcher**

In MyPageTab’s three filters, SettingsTab, ImaginarySoloRaidTab’s two filters, and TierNikkeCatalog use:

```ts
if (!matchesSelectedElements(nikke, selectedElements)) return false;
```

with the local selected-set variable for each surface.

- [ ] **Step 5: Run focused and full verification**

Run:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/nikke-secondary-element.test.ts
npm test
npx eslint app/page.tsx app/components/tabs/MyPageTab.tsx app/components/tabs/SettingsTab.tsx app/components/tabs/ImaginarySoloRaidTab.tsx app/components/tabs/tier/TierNikkeCatalog.tsx lib/nikke-elements.ts tests/nikke-secondary-element.test.ts
npm run build
```

Expected: all tests pass, ESLint has no errors, and production build succeeds.

- [ ] **Step 6: Verify the running UI**

Open the master 니케 등록/수정 화면, confirm both selects render, confirm blank and duplicate 속성 2 behave as 없음, and confirm a 니케 is returned when only its 속성 2 matches a filter.

- [ ] **Step 7: Commit**

```powershell
git add app/components/tabs/MyPageTab.tsx app/components/tabs/SettingsTab.tsx app/components/tabs/ImaginarySoloRaidTab.tsx app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-secondary-element.test.ts
git commit -m "feat: support dual nikke element filters"
```
