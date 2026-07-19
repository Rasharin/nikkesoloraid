# Tier Reset and Viewport Resize Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset local tier sizing with the full reset action and keep horizontal handle resizing inside a 16px viewport margin.

**Architecture:** Extend the pure resize helper with an optional maximum width and cap the effective minimum when the viewport is narrower. At pointer start, use the section's actual rendered rectangle to calculate direction-specific bounds. Compose the existing board reset and local-layout reset callbacks for the settings full reset.

**Tech Stack:** TypeScript, React 18, Next.js, Tailwind CSS, Node test runner

## Global Constraints

- Full reset restores tier data, assignments, section size, horizontal offset, card size, and local storage.
- Left and right resizing stop 16px inside the viewport.
- Window resizing alone does not rewrite stored layout.
- Existing vertical resize, minimum sizing on sufficiently wide screens, and individual reset actions remain unchanged.

---

### Task 1: Bound horizontal resizing

**Files:**
- Modify: `lib/tier-local-layout.ts`
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/tier-local-layout.test.ts`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `resizeTierSection`, actual section `DOMRect`, `window.innerWidth`
- Produces: `resizeTierSection(..., maximumWidth?)` and direction-specific maximum width calculation

- [ ] Write failing tests proving requested width is capped at `maximumWidth`, left offset reflects only applied growth, and `TierBoard` calculates a 16px boundary from the actual section rectangle.
- [ ] Run `node --test --experimental-strip-types tests/tier-local-layout.test.ts tests/nikke-tier-tab.test.ts` and confirm the new assertions fail.
- [ ] Add optional `maximumWidth`; calculate `effectiveMinimumWidth = Math.min(minimum.width, maximumWidth)` and clamp width between it and the maximum.
- [ ] At pointer start, read the section rectangle, use its rendered width as the initial width, and calculate left maximum as `rect.right - 16` or right maximum as `window.innerWidth - 16 - rect.left`.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Include local layout in full reset

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `createDefaultTierBoard()` and `handleResetLocalLayout()`
- Produces: `handleResetAll()` passed to `TierSettingsPanel`

- [ ] Add a failing source assertion that `handleResetAll` invokes both board and local-layout resets.
- [ ] Implement `handleResetAll` and replace the inline board-only callback.
- [ ] Run focused tests.

### Task 3: Validate and synchronize

**Files:**
- Test: all changed files

- [ ] In a narrow browser viewport, drag both handles outward and verify each edge stops at 16px without an error overlay.
- [ ] Trigger full reset after changing section and card size, then verify default dimensions, zero offset, and default card size.
- [ ] Run `npm test`, `npm run build`, relevant ESLint, and `git diff --check`.
- [ ] Commit with `fix: bound tier resizing to viewport` and push `main` to `origin`.
