# Tier Card Drag Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the actual placed tier card visibly and opaquely follow the pointer during tier-to-tier dragging.

**Architecture:** Continue using the existing `useSortable` transform on `TierNikkeCard`. Use `isDragging` to disable transition delay while the pointer is moving, then retain the sortable transition only for post-drop settling; do not introduce a `DragOverlay` or duplicate card.

**Tech Stack:** TypeScript, React 18, Next.js, `@dnd-kit/sortable`, Node test runner

## Global Constraints

- The dragged card must remain fully opaque.
- Do not create a cloned card or `DragOverlay`.
- Preserve full-row drop detection, click-to-remove behavior, and native image drag prevention.

---

### Task 1: Actual Card Pointer Tracking

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `useSortable({ id, disabled, data })`
- Produces: drag-state-aware inline `CSSProperties` for the existing `TierNikkeCard`

- [ ] **Step 1: Write the failing test**

Add a test that requires `TierNikkeCard` to read `isDragging` and `transition` from `useSortable`, applies `transition: isDragging ? "none" : transition`, and continues to reject opacity changes and `DragOverlay`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/nikke-tier-tab.test.ts`

Expected: FAIL because `TierNikkeCard` does not yet use `isDragging` or the sortable transition.

- [ ] **Step 3: Write minimal implementation**

Update the sortable destructuring and style:

```tsx
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable(...);

const style: CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition: isDragging ? "none" : transition,
  zIndex: isDragging ? 20 : undefined,
  position: isDragging ? "relative" : undefined,
};
```

Do not set `opacity` and do not add a drag overlay.

- [ ] **Step 4: Run automated verification**

Run:

```powershell
npm test -- --runInBand
npx eslint app/components/tabs/tier/TierBoard.tsx tests/nikke-tier-tab.test.ts
```

Expected: all tests pass and targeted lint exits with code 0.

- [ ] **Step 5: Verify in the browser**

Drag a placed card vertically from B to A while keeping the same horizontal pointer position. Confirm the original opaque card follows the pointer and lands in A.

- [ ] **Step 6: Commit and publish**

```powershell
git add app/components/tabs/tier/TierBoard.tsx tests/nikke-tier-tab.test.ts docs/superpowers/plans/2026-07-19-tier-card-drag-animation.md
git commit --no-gpg-sign -m "feat: animate tier cards during drag"
git push origin main
```

Confirm `HEAD` equals `origin/main` and the production deployment reaches `READY`.
