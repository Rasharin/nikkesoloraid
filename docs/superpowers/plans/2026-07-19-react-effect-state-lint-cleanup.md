# React Effect State Lint Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all 14 `react-hooks/set-state-in-effect` errors while preserving storage restoration, editing, selection, and tab behavior.

**Architecture:** Replace effect-driven derived state with render-time derivation or user-event updates. For browser storage, use a shared hydration signal and guarded one-time render adjustment so server markup stays stable and persistence starts only after restoration.

**Tech Stack:** TypeScript, React 19, Next.js 16, ESLint 9, Node test runner

## Global Constraints

- Do not disable or weaken `react-hooks/set-state-in-effect`.
- Do not use timers or microtasks solely to evade lint.
- Preserve all existing storage keys and serialized formats.
- Preserve user-visible behavior and styling.
- Do not address the separate 23 warnings in this change.

---

### Task 1: Add a regression gate for the 14 errors

**Files:**
- Create: `tests/react-effect-state-lint.test.ts`

**Interfaces:**
- Consumes: the repository ESLint configuration and six affected source files
- Produces: an automated assertion that none of those files reports `react-hooks/set-state-in-effect`

- [ ] **Step 1: Write the failing lint regression test**

Create a Node test that runs the local ESLint executable with JSON output against:

```ts
const affectedFiles = [
  "app/components/NoticeContent.tsx",
  "app/components/PrivacyContent.tsx",
  "app/components/TermsContent.tsx",
  "app/components/tabs/HomeTab.tsx",
  "app/components/tabs/ImaginarySoloRaidTab.tsx",
  "app/components/tabs/UsageTab.tsx",
];
```

Parse stdout even when ESLint exits non-zero, collect messages whose `ruleId` is `react-hooks/set-state-in-effect`, and assert that the resulting list is empty. Include file, line, and message in the assertion output.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/react-effect-state-lint.test.ts`

Expected: FAIL listing 14 violations.

- [ ] **Step 3: Commit the regression test**

```bash
git add tests/react-effect-state-lint.test.ts
git commit -m "test: cover effect state lint violations"
```

---

### Task 2: Remove derived and event-driven effect state

**Files:**
- Modify: `app/components/NoticeContent.tsx`
- Modify: `app/components/PrivacyContent.tsx`
- Modify: `app/components/TermsContent.tsx`
- Modify: `app/components/tabs/UsageTab.tsx`
- Test: `tests/react-effect-state-lint.test.ts`

**Interfaces:**
- Consumes: existing posts, display text, tab selection, and editor callbacks
- Produces: `effectiveOpenIds`, explicit edit-start handlers, and a tab-change wrapper

- [ ] **Step 1: Derive valid notice expansion state**

Remove the posts-dependent effect. Compute `effectiveOpenIds` from `openIds` and current post IDs; when no retained ID exists and a first post exists, include that first ID in the derived set. Use `effectiveOpenIds` for open/closed rendering while keeping click mutations in `openIds`.

- [ ] **Step 2: Initialize legal document drafts on edit**

Remove the effects in `PrivacyContent` and `TermsContent`. Add `startEditing()` in each component:

```ts
function startEditing() {
  setDraft(displayText);
  setEditing(true);
}
```

Connect the edit button to `startEditing`.

- [ ] **Step 3: Move Usage tab state changes to events**

Remove both effects and the unused `useEffect` import. Add:

```ts
function changeTab(key: string) {
  setShowWriteForm(false);
  onTabChange(key);
}
```

Use `changeTab` in tab buttons. Keep `openEditor()` as the only path that initializes blocks and use it from the master edit button.

- [ ] **Step 4: Run the focused regression test**

Expected interim result: five violations removed; only `HomeTab` and `ImaginarySoloRaidTab` remain.

- [ ] **Step 5: Commit**

```bash
git add app/components/NoticeContent.tsx app/components/PrivacyContent.tsx app/components/TermsContent.tsx app/components/tabs/UsageTab.tsx
git commit -m "fix: move derived UI state out of effects"
```

---

### Task 3: Restore Home state outside effects

**Files:**
- Create: `app/hooks/useHydrated.ts`
- Modify: `app/components/tabs/HomeTab.tsx`
- Test: `tests/react-effect-state-lint.test.ts`

**Interfaces:**
- Produces: `useHydrated(): boolean`
- Consumes: session/local storage keys and the existing `editRequest`

- [ ] **Step 1: Add the hydration signal**

Implement `useHydrated` with `useSyncExternalStore`:

```ts
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useHydrated() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
```

- [ ] **Step 2: Add safe Home storage readers**

Add a typed `readHomeDraftState()` that returns `{ draft, score, editingId }` and preserves both current and legacy serialized forms. Add `readHomeMemo()` returning `""` on failure.

- [ ] **Step 3: Perform guarded one-time restoration**

Track `storageRestored` state. When `useHydrated()` is true and restoration has not occurred, read storage and conditionally adjust `draft`, `score`, `editingId`, `memoText`, `draftStorageReady`, and `storageRestored` during render. Remove the two restoration effects.

- [ ] **Step 4: Move edit request state adjustment out of the effect**

Track the last applied request ID. When a new non-null `editRequest.id` appears, conditionally set draft, score, and editing ID during render. Keep the existing effect only for focus, toast, and `onEditRequestConsumed`.

- [ ] **Step 5: Run the focused regression test**

Expected interim result: Home violations removed; six ImaginarySoloRaid violations remain.

- [ ] **Step 6: Commit**

```bash
git add app/hooks/useHydrated.ts app/components/tabs/HomeTab.tsx
git commit -m "fix: restore home state without effect updates"
```

---

### Task 4: Restore and derive Deck Building state outside effects

**Files:**
- Modify: `app/components/tabs/ImaginarySoloRaidTab.tsx`
- Test: `tests/react-effect-state-lint.test.ts`

**Interfaces:**
- Consumes: `useHydrated`, existing normalization helpers, and storage keys
- Produces: guarded storage restoration, `effectiveSelectedDeckDraftIds`, and derived height behavior

- [ ] **Step 1: Add safe storage readers**

Create focused readers for saved pages, layout mode, recommended-open state, and memo text. Each reader catches access or parse failures and returns the current default.

- [ ] **Step 2: Replace four restoration effects**

Use `useHydrated()` plus a `storageRestored` guard to adjust pages, active page ID, layout, recommended-open state, memo, and all three readiness flags once during render. Remove the four storage-reading effects.

- [ ] **Step 3: Remove synchronous height clearing**

When wide layout is disabled or the section ref is absent, return from the effect without setting state. Keep the visible style conditional on `wideDeckLayout`, so stale measured height is ignored until a new observer measurement replaces it.

- [ ] **Step 4: Derive valid selected deck IDs**

Remove the deck-list cleanup effect. Compute:

```ts
const effectiveSelectedDeckDraftIds = new Set(
  [...selectedDeckDraftIds].filter((id) => deckDrafts.some((deck) => deck.id === id))
);
```

Use this derived set for selection rendering, counts, filtering, and score totals. User selection events continue to update `selectedDeckDraftIds`.

- [ ] **Step 5: Run the focused regression test and verify GREEN**

Expected: PASS with zero `react-hooks/set-state-in-effect` messages across all six files.

- [ ] **Step 6: Commit**

```bash
git add app/components/tabs/ImaginarySoloRaidTab.tsx
git commit -m "fix: restore deck building state without effects"
```

---

### Task 5: Full verification and delivery

**Files:**
- Verify all modified files

**Interfaces:**
- Consumes: completed cleanup
- Produces: fresh test, lint, build, browser, and Git evidence

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run full lint**

Run: `npm run lint`

Expected: zero errors; the pre-existing warnings may remain.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: successful compilation, type checking, and page generation.

- [ ] **Step 4: Verify local behavior**

Check storage restoration on Home and Deck Building, legal document editing, Usage tab switching/editor opening, notice expansion, and deck selection after deletion.

- [ ] **Step 5: Inspect and publish**

Run `git diff --check`, confirm a clean worktree after commits, pull `origin/main` with fast-forward only, push `main`, and verify `origin/main...HEAD` is `0 0`.
