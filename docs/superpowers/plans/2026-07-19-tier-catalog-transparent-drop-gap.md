# Tier Catalog Transparent Drop Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the visible dotted catalog drop guide while preserving its layout space, insertion calculation, and drag overlay.

**Architecture:** Keep `CatalogDropPreview` and all preview state unchanged. Render the existing preview slot as a transparent, fixed-size layout spacer so neighboring tier cards still shift to expose the calculated insertion point.

**Tech Stack:** TypeScript, React, Next.js, Tailwind CSS, Node test runner, Playwright browser verification

## Global Constraints

- Do not change catalog preview target or insertion index calculations.
- Do not change `DragOverlay`, tier-to-tier dragging, or empty-row styling.
- The spacer must continue to use the active tier card-size placeholder classes.

---

### Task 1: Make the catalog insertion gap transparent

**Files:**
- Modify: `tests/nikke-tier-tab.test.ts`
- Modify: `app/components/tabs/tier/TierBoard.tsx`

**Interfaces:**
- Consumes: `CatalogDropPreview`, `getTierCardSizeClasses(cardSize).placeholder`
- Produces: A catalog preview slot that occupies card-sized layout space without a border or background

- [ ] **Step 1: Write the failing source regression test**

Update the existing catalog insertion-gap test to require a dedicated transparent spacer marker and reject the old dotted guide classes:

```typescript
assert.match(source, /data-tier-catalog-drop-gap/);
assert.doesNotMatch(
  source,
  /sizeClasses\.placeholder[^\n]*border-2 border-dashed border-cyan-400\/70 bg-cyan-400\/10/
);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
node --test --experimental-strip-types tests/nikke-tier-tab.test.ts
```

Expected: FAIL because `data-tier-catalog-drop-gap` is absent and the dotted cyan placeholder is still present.

- [ ] **Step 3: Implement the transparent spacer**

Replace the catalog preview placeholder in `TierBoard.tsx` with a layout-only element:

```tsx
<div
  key={activePreview.activeId}
  data-tier-catalog-drop-gap
  aria-hidden="true"
  className={`${sizeClasses.placeholder} shrink-0`}
/>
```

Do not modify preview state, target calculations, or drag completion.

- [ ] **Step 4: Run focused and full verification**

Run:

```powershell
node --test --experimental-strip-types tests/nikke-tier-tab.test.ts
npm test
npx eslint app/components/tabs/tier/TierBoard.tsx tests/nikke-tier-tab.test.ts
git diff --check
npm run build
```

Expected: all tests pass, ESLint and diff checks exit with code 0, and the production build succeeds.

- [ ] **Step 5: Verify catalog dragging in the browser**

At `/tier`, drag an unassigned catalog card into the start, middle, and end of a populated tier row. Confirm that neighboring cards open a gap without any dotted or colored guide, the card remains visible in the overlay, and dropping inserts at the selected location without an error overlay.

- [ ] **Step 6: Commit and synchronize**

```powershell
git add app/components/tabs/tier/TierBoard.tsx tests/nikke-tier-tab.test.ts
git commit -m "fix: hide tier catalog drop guide"
git push origin main
```
