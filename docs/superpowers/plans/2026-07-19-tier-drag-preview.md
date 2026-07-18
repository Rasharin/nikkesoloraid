# Tier Drag Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the real tier card visible across row boundaries and preview catalog insertion by opening a card-sized sortable gap.

**Architecture:** Remove clipping from the tier-row container while preserving its rounded label styling. Track catalog drag-over state in `TierBoard`, insert the active catalog ID into the hovered row's `SortableContext`, render a same-sized placeholder at that index, and use the stored preview index for the final `moveNikke` call.

**Tech Stack:** TypeScript, React 18, Next.js, `@dnd-kit/core`, `@dnd-kit/sortable`, Node test runner

## Global Constraints

- Do not add `DragOverlay`, a cloned card, or reduced drag opacity.
- Preserve whole-row pointer collision detection.
- Dropping must use the same row and index shown by the preview gap.
- Existing click removal and tier-to-tier moves must continue to work.

---

### Task 1: Prevent Tier Card Clipping

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

- [ ] Add a failing source-contract test requiring `data-tier-row` to use `overflow-visible` and its label to retain left-side rounding.
- [ ] Run the tier-tab test and confirm it fails because the row still uses `overflow-hidden`.
- [ ] Change the row to `overflow-visible` and add rounded left corners to the colored label.
- [ ] Run the tier-tab test and targeted lint.

### Task 2: Catalog Insertion Gap

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

- [ ] Add a failing test requiring `onDragOver`, catalog preview state, insertion of the active catalog ID into sortable items, a `data-tier-insertion-placeholder` element, and final use of the preview index.
- [ ] Run the tier-tab test and confirm it fails for missing preview state.
- [ ] Track `{ activeId, nikkeName, rowId, index }` for catalog drags in `handleDragOver`.
- [ ] Pass preview data into `TierRowView`, insert the active ID into `SortableContext.items`, and render the card-sized placeholder at the same index.
- [ ] In `handleDragEnd`, use the preview row and index for catalog sources, then clear preview state.
- [ ] Clear preview state on drag cancellation and when no row is under the pointer.
- [ ] Run the full tests and targeted lint.

### Task 3: Browser Verification and Publication

**Files:**
- Verify: `app/components/tabs/tier/TierBoard.tsx`

- [ ] In the local browser, drag a tier card across a row boundary and confirm the opaque card remains visible.
- [ ] Drag a catalog card between two placed tier cards and confirm a card-sized gap opens and the final order matches it.
- [ ] Commit the implementation and plan to `main`, push `origin/main`, confirm the production deployment reaches `READY`, and confirm `HEAD` equals `origin/main`.
