# Header Text-Only Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the seven navigation-tab SVG icons and present compact text-only buttons.

**Architecture:** Keep the existing header component, tab keys, click handlers, active styling, and seven-column layout. Delete only the tab icon components and their render calls, then adjust button layout classes for text-only presentation.

**Tech Stack:** TypeScript, React, Next.js, Tailwind CSS, Node test runner

## Global Constraints

- Keep the logo and login/profile UI unchanged.
- Keep all seven tab labels and navigation behavior unchanged.
- Do not add dependencies.

---

### Task 1: Convert Header Tabs to Text-Only Buttons

**Files:**
- Modify: `tests/header-text-only-tabs.test.ts`
- Modify: `app/components/Header.tsx`

**Interfaces:**
- Consumes: existing `HeaderProps.onTabChange` callback and `TabKey`
- Produces: the same `HeaderContent` component API with text-only tab buttons

- [ ] **Step 1: Write the failing test**

Create a source-level regression test that reads `app/components/Header.tsx`, asserts that it contains no `<svg` markup or functions ending in `Icon`, and asserts that all seven tab labels remain.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/header-text-only-tabs.test.ts`

Expected: FAIL because the header still contains SVG icon functions.

- [ ] **Step 3: Write minimal implementation**

Delete `HomeIcon`, `SaveIcon`, `RecommendIcon`, `DeckBuildingIcon`, `UsageIcon`, `NikkeManagementIcon`, and `ContactIcon`. Delete their seven JSX calls. Change tab button classes from vertical icon-and-label layout to centered text-only buttons with compact vertical padding.

- [ ] **Step 4: Run verification**

Run:

```text
npm test
npx eslint app/components/Header.tsx tests/header-text-only-tabs.test.ts
npm run build
```

Expected: tests pass, changed files have no ESLint errors, and the production build exits successfully.
