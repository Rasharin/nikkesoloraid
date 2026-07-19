# Tier Board Local Size Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let tier-board editors resize their local board and choose a local three-step card size while keeping the public default layout unchanged.

**Architecture:** Put local layout parsing, clamping, and card-class selection in a small pure utility module. `TierBoard` owns browser-only layout state and pointer resizing; `TierSettingsPanel` only renders the card-size and reset controls. No tier API or database type changes are needed.

**Tech Stack:** TypeScript, React, Next.js App Router, Tailwind CSS, Node test runner

## Global Constraints

- Only users with the existing `canEdit` permission may read, apply, or change local layout settings.
- Non-editors always see the current default dimensions and card size.
- Current card dimensions are the `default` size.
- The initial rendered board dimensions are the minimum resize dimensions.
- Overflowing tier rows scroll vertically inside the resized section.
- Local settings use a versioned `localStorage` key and never enter tier API payloads.
- No Supabase schema or API changes.

---

### Task 1: Local tier layout model

**Files:**
- Create: `lib/tier-local-layout.ts`
- Create: `tests/tier-local-layout.test.ts`

**Interfaces:**
- Produces: `TierCardSize`, `TierLocalLayout`, `TIER_LOCAL_LAYOUT_KEY`, `parseTierLocalLayout(value)`, `clampTierSectionSize(size, minimum)`, and `getTierCardSizeClasses(size)`.

- [ ] **Step 1: Write failing tests**

```ts
test("parses valid settings and rejects malformed settings", () => {
  assert.deepEqual(parseTierLocalLayout('{"width":900,"height":700,"cardSize":"large"}'), {
    width: 900, height: 700, cardSize: "large",
  });
  assert.equal(parseTierLocalLayout('{"width":-1,"height":0,"cardSize":"huge"}'), null);
});

test("clamps section size to the measured minimum", () => {
  assert.deepEqual(
    clampTierSectionSize({ width: 500, height: 400 }, { width: 760, height: 540 }),
    { width: 760, height: 540 },
  );
});

test("keeps the current card classes as default", () => {
  assert.match(getTierCardSizeClasses("default").card, /sm:w-20/);
  assert.match(getTierCardSizeClasses("default").placeholder, /sm:h-\[110px\]/);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/tier-local-layout.test.ts`
Expected: FAIL because `lib/tier-local-layout.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

Create strict runtime validation for finite positive width and height and the exact sizes `"small" | "default" | "large"`. Define complete card, visual, name, and placeholder Tailwind class sets for all three sizes. Clamp both dimensions with `Math.max`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tier-local-layout.ts tests/tier-local-layout.test.ts
git commit -m "feat: add tier local layout model"
```

### Task 2: Editor-only section resizing

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`

**Interfaces:**
- Consumes: Task 1 local layout parser, clamp function, key, and types.
- Produces: editor-only pointer resize handle and local persistence.

- [ ] **Step 1: Add local layout state and safe storage helpers**

Read local storage only after `canEdit` is true. Measure the section through a ref after mount, use the measured dimensions as `minimumSize`, and clamp any restored dimensions to it. Catch all storage errors.

- [ ] **Step 2: Add pointer resize behavior**

On `pointerdown`, capture starting coordinates and size. Listen for pointer movement until `pointerup`, clamp the new size to the measured minimum, update the section immediately, and persist only the final value. Apply `maxWidth: "100%"`.

- [ ] **Step 3: Add internal overflow and handle UI**

Keep the section header and settings outside the scrolling region. Give the tier-row container the remaining height and `overflow-y-auto`. Render an editor-only, accessible bottom-right diagonal handle with `touch-action: none`.

- [ ] **Step 4: Run static checks**

Run: `npm run lint -- app/components/tabs/tier/TierBoard.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/tabs/tier/TierBoard.tsx
git commit -m "feat: add editor tier board resizing"
```

### Task 3: Three-step local card sizing

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Modify: `app/components/tabs/tier/TierSettingsPanel.tsx`

**Interfaces:**
- Consumes: Task 1 `TierCardSize` and `getTierCardSizeClasses`.
- Produces: settings button group and consistent card/placeholder/overlay sizing.

- [ ] **Step 1: Thread the card size through card renderers**

Add `cardSize: TierCardSize` to `TierRowView`, `TierNikkeCard`, and `TierNikkeCardVisual`. Use the shared classes for card width, name text, and insertion placeholder dimensions. Pass the same size to `DragOverlay`.

- [ ] **Step 2: Add settings controls**

Add `cardSize`, `onCardSizeChange`, and `onResetLocalLayout` props to `TierSettingsPanel`. Render `작게`, `기본`, `크게` as an accessible button group with selected-state styling and a separate `화면 크기 설정 초기화` button.

- [ ] **Step 3: Persist and reset**

Update local state and storage immediately when a card-size button is selected. Reset section dimensions to the measured minimum and card size to `default`, then remove the local storage key.

- [ ] **Step 4: Run tests and lint**

Run: `npm test`
Expected: all tests PASS.

Run: `npm run lint -- app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierSettingsPanel.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierSettingsPanel.tsx
git commit -m "feat: add local tier card sizing"
```

### Task 4: Full verification

**Files:**
- Verify only

**Interfaces:**
- Consumes: completed feature.
- Produces: evidence that tests, lint, types, and production build pass.

- [ ] **Step 1: Run unit tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS with no errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Next.js production build completes successfully.

- [ ] **Step 4: Review the diff**

Run: `git diff --check HEAD~3..HEAD`
Expected: no whitespace errors. Confirm no API, database, or unrelated files changed.
