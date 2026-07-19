# Tier Dual Resize Handles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mirrored bottom-left tier-section resize handle and reduce the full Nikke catalog cards by one visual size step.

**Architecture:** Extend the existing pointer-resize path with an explicit `left` or `right` edge. Track a local horizontal offset so left-edge resizing keeps the section's right edge fixed, and persist the optional offset alongside the existing backward-compatible layout data. Keep catalog sizing isolated in `TierNikkeCatalog`.

**Tech Stack:** TypeScript, React 18, Next.js App Router, Tailwind CSS, Node test runner

## Global Constraints

- Only editors (`canEdit`) can see or use either resize handle.
- Preserve the existing minimum section size, vertical resize behavior, local persistence, and `nwse-resize` cursor.
- The left handle mirrors the existing curved wedge and retains the same hover and dragging emphasis.
- Reduce only cards in the full Nikke catalog; tier-row cards keep their configured size.

---

### Task 1: Direction-aware tier section resizing

**Files:**
- Modify: `lib/tier-local-layout.ts`
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Modify: `app/globals.css`
- Test: `tests/tier-local-layout.test.ts`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: existing `TierSectionSize`, `clampTierSectionSize`, and `TIER_LOCAL_LAYOUT_KEY`
- Produces: `resizeTierSection(initial, delta, edge, minimum)` returning `{ size, offsetDeltaX }`, optional persisted `offsetX`, and left/right handle markup

- [ ] **Step 1: Write failing resize tests**

Add assertions that right-edge dragging adds `deltaX`, left-edge dragging subtracts `deltaX`, both clamp to the measured minimum, and the left result reports the horizontal offset needed to preserve the original right edge. Add source assertions for `data-resize-edge="left"` and `"right"` plus mirrored wedge CSS.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test --experimental-strip-types tests/tier-local-layout.test.ts tests/nikke-tier-tab.test.ts`

Expected: FAIL because the direction-aware helper and left handle do not exist.

- [ ] **Step 3: Implement the direction-aware resize helper**

Add:

```ts
export type TierResizeEdge = "left" | "right";

export function resizeTierSection(
  initial: TierSectionSize,
  delta: { x: number; y: number },
  edge: TierResizeEdge,
  minimum: TierSectionSize
): { size: TierSectionSize; offsetDeltaX: number } {
  const requestedWidth = initial.width + (edge === "left" ? -delta.x : delta.x);
  const size = clampTierSectionSize(
    { width: requestedWidth, height: initial.height + delta.y },
    minimum
  );
  return {
    size,
    offsetDeltaX: edge === "left" ? initial.width - size.width : 0,
  };
}
```

Extend stored layout parsing with a finite optional `offsetX` that defaults to `0`.

- [ ] **Step 4: Render and operate both handles**

Change `handleResizeStart` to accept the edge, use `resizeTierSection`, update `sectionOffsetX` for left drags, and persist the resulting size and offset. Apply `translateX(sectionOffsetX)` to the editable section. Render two editor-only buttons at `bottom-0 left-0` and `bottom-0 right-0`; give the left SVG a mirrored modifier class and keep the pointer hit areas at `h-10 w-10`.

- [ ] **Step 5: Style the mirrored wedge**

Add a left modifier that moves the wedge to the bottom-left, changes its transform origin, and horizontally mirrors the existing path. Ensure hover and active scaling compose with the mirror transform.

- [ ] **Step 6: Run focused tests**

Run: `node --test --experimental-strip-types tests/tier-local-layout.test.ts tests/nikke-tier-tab.test.ts`

Expected: PASS.

### Task 2: Reduce full Nikke catalog card size

**Files:**
- Modify: `app/components/tabs/tier/TierNikkeCatalog.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: existing responsive catalog grid and `CatalogCard`
- Produces: denser responsive grid classes and smaller Next Image `sizes` hint

- [ ] **Step 1: Write a failing catalog sizing test**

Assert that the catalog uses `grid-cols-5 sm:grid-cols-7 lg:grid-cols-12` and an image sizing hint matching the denser layout, while `TierNikkeCardVisual` still consumes `getTierCardSizeClasses(cardSize)`.

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test --experimental-strip-types tests/nikke-tier-tab.test.ts`

Expected: FAIL because the catalog still uses 4/6/10 columns.

- [ ] **Step 3: Apply the catalog-only size reduction**

Change the catalog grid from 4/6/10 columns to 5/7/12 columns and update the image `sizes` hint from `25vw, 110px` to `20vw, 88px`. Do not change tier-row card classes or the three-step tier card setting.

- [ ] **Step 4: Run focused and full validation**

Run:

```powershell
node --test --experimental-strip-types tests/tier-local-layout.test.ts tests/nikke-tier-tab.test.ts
npm test
npm run build
git diff --check
git status --short
```

Expected: all tests and build pass; only intended files and plan/spec commits are present.

- [ ] **Step 5: Commit the implementation**

```powershell
git add lib/tier-local-layout.ts app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierNikkeCatalog.tsx app/globals.css tests/tier-local-layout.test.ts tests/nikke-tier-tab.test.ts
git commit -m "feat: add dual tier resize handles"
```
