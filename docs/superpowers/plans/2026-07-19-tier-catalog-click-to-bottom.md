# Tier Catalog Click-to-Bottom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move a Nikke to the final tier when an editor simply clicks its image in the full Nikke catalog.

**Architecture:** Add an image-only callback from `TierNikkeCatalog` to `TierBoard`. Reuse `moveNikke()` for single-placement movement and the existing `draggedNikkeRef` timing guard so drag completion cannot trigger the click action.

**Tech Stack:** TypeScript, React 18, Next.js App Router, dnd-kit, Node test runner

## Global Constraints

- Only the catalog image area triggers click movement.
- Unassigned and previously assigned Nikkes move to the final row's last position without duplication.
- A Nikke already in the final row moves to that row's last position without duplication.
- Dragging, name clicks, and non-editor interaction do not trigger click movement.

---

### Task 1: Add image-only catalog movement

**Files:**
- Modify: `app/components/tabs/tier/TierNikkeCatalog.tsx`
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/nikke-tier-tab.test.ts`
- Test: `tests/nikke-tier.test.ts`

**Interfaces:**
- Consumes: `moveNikke(board, { nikkeName, targetRowId, targetIndex })`, `board.rows`, and `draggedNikkeRef`
- Produces: `TierNikkeCatalogProps.onImageClick: (nikkeName: string) => void` and `handleCatalogImageClick(nikkeName: string)`

- [ ] **Step 1: Write failing tests**

Add a domain assertion showing that moving a Nikke from an upper row to the final row removes the old placement and appends exactly one copy. Add source assertions that the image container invokes `onImageClick(nikke.name)`, `TierBoard` supplies `handleCatalogImageClick`, and that handler checks `canEdit`, `draggedNikkeRef`, and the final row before calling `moveNikke`.

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
node --test --experimental-strip-types tests/nikke-tier.test.ts tests/nikke-tier-tab.test.ts
```

Expected: source assertions fail because the click callback is absent.

- [ ] **Step 3: Add the catalog callback**

Add `onImageClick` to `TierNikkeCatalogProps`, pass it into `CatalogCard`, and attach it only to the square image container:

```tsx
onClick={() => {
  if (canEdit) onImageClick(nikke.name);
}}
```

Do not attach a click handler to the card name or outer draggable button.

- [ ] **Step 4: Reuse the board movement rule**

Add:

```ts
function handleCatalogImageClick(nikkeName: string) {
  if (!canEdit || draggedNikkeRef.current === nikkeName) return;
  const finalRow = board.rows.at(-1);
  if (!finalRow) return;
  onChange(
    moveNikke(board, {
      nikkeName,
      targetRowId: finalRow.id,
      targetIndex: finalRow.nikkeNames.length,
    })
  );
}
```

Pass this callback to `TierNikkeCatalog`. The existing drag cleanup keeps `draggedNikkeRef` populated until the click event has passed.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node --test --experimental-strip-types tests/nikke-tier.test.ts tests/nikke-tier-tab.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run full validation and browser verification**

Run:

```powershell
npm test
npm run build
npx eslint app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-tier-tab.test.ts tests/nikke-tier.test.ts
git diff --check
```

In the running `/tier` page, click an unassigned image and an upper-tier assigned image, then confirm each exists only once at the end of the final row. Drag a catalog image and confirm it follows only the drag-drop destination.

- [ ] **Step 7: Commit and synchronize**

```powershell
git add app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-tier-tab.test.ts tests/nikke-tier.test.ts
git commit -m "feat: move catalog clicks to final tier"
git push origin main
```
