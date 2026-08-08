# Tier Wide Layout and Resize Anchors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let horizontal tier mode use the browser's right-side space and keep tier resizing anchored to the original board bounds.

**Architecture:** The tier page wrapper exposes a right-side full-bleed width only to horizontal mode through the board component. Resize state is normalized as independent left and right extensions from the measured default width, so alternating handles cannot move both baseline edges.

**Tech Stack:** TypeScript, React 18, Next.js 14 App Router, Tailwind CSS, Node test runner.

## Global Constraints

- Preserve vertical catalog layout behavior.
- Preserve the versioned local layout setting and card-size persistence.
- Keep the tier board's default left edge aligned with the existing page content.
- Use test-first red-green cycles for both tasks.

---

### Task 1: Right-side full-bleed horizontal layout

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `catalogLayoutMode: "side" | "bottom"`
- Produces: a horizontal layout whose left edge stays aligned and whose width reaches the viewport's right content margin.

- [ ] **Step 1: Write the failing test** asserting that the tier page wrapper no longer caps the horizontal board at `lg:max-w-6xl` and that the side board uses a right full-bleed width class.
- [ ] **Step 2: Run `node --test tests/nikke-tier-tab.test.ts` and verify the new assertion fails.**
- [ ] **Step 3: Give the tier tab a full available wrapper and apply the viewport-right width only inside side mode.**
- [ ] **Step 4: Run `node --test tests/nikke-tier-tab.test.ts` and verify it passes.**

### Task 2: Baseline-anchored left and right resizing

**Files:**
- Modify: `lib/tier-local-layout.ts`
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/tier-local-layout.test.ts`

**Interfaces:**
- Consumes: default measured size, current size, current `offsetX`, drag delta, active edge, and viewport maximum.
- Produces: `{ size: TierSectionSize; offsetX: number }` where `offsetX` is the left extension from the default boundary and width is default width plus independent left/right extensions.

- [ ] **Step 1: Write failing tests** for alternating left/right resizes and shrinking each edge back to its default boundary.
- [ ] **Step 2: Run `node --test tests/tier-local-layout.test.ts` and verify the assertions fail for cumulative drift.**
- [ ] **Step 3: Implement baseline extension normalization and use its absolute offset result in `TierBoard`.**
- [ ] **Step 4: Run `node --test tests/tier-local-layout.test.ts` and verify it passes.**
- [ ] **Step 5: Run `npm test`, targeted ESLint, and visually verify expanded/collapsed horizontal mode and both resize handles.**
