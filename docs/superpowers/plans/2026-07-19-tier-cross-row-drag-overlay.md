# Tier Cross-Row Drag Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep a fully opaque tier card visible under the pointer while it is dragged within or across tier rows, then settle it naturally into the destination.

**Architecture:** Split the tier card's visual markup from its sortable wrapper so the same presentation can be rendered safely inside `DragOverlay` without registering a duplicate sortable ID. Track the active tier Nikke in `TierBoard`, hide only the source card's paint while preserving its layout slot, and leave catalog dragging and persistence behavior unchanged.

**Tech Stack:** TypeScript, React, Next.js, Tailwind CSS, dnd-kit, Node test runner

## Global Constraints

- The overlay applies only to drags that originate from a tier row.
- The overlay is fully opaque; no opacity reduction or translucent ghost is allowed.
- The source card keeps its layout space while its visual paint is hidden.
- Existing collision detection, insertion preview, permission checks, and persistence remain unchanged.
- The card image and 13px name styling remain identical to the placed tier card.

---

### Task 1: Specify the cross-tier drag presentation

**Files:**
- Modify: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `app/components/tabs/tier/TierBoard.tsx` source text
- Produces: regression expectations for `TierNikkeCardVisual`, `DragOverlay`, active tier state, and source-card visibility

- [ ] **Step 1: Replace the obsolete no-overlay assertions with a failing regression test**

```ts
test("tier cards use a fully opaque overlay across row boundaries", () => {
  const source = fs.readFileSync("app/components/tabs/tier/TierBoard.tsx", "utf8");

  assert.match(source, /DragOverlay/);
  assert.match(source, /function TierNikkeCardVisual/);
  assert.match(source, /const \[activeTierNikkeName, setActiveTierNikkeName\]/);
  assert.match(source, /activeData\.source === "tier"/);
  assert.match(source, /visibility:\s*isDragging\s*\?\s*"hidden"\s*:\s*undefined/);
  assert.match(source, /<DragOverlay[\s\S]*?<TierNikkeCardVisual/);
  assert.doesNotMatch(source, /opacity:\s*isDragging/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types --test-name-pattern="fully opaque overlay" tests/nikke-tier-tab.test.ts`

Expected: FAIL because `DragOverlay`, `TierNikkeCardVisual`, and active tier overlay state do not exist.

- [ ] **Step 3: Commit the regression specification**

```bash
git add tests/nikke-tier-tab.test.ts
git commit -m "test: cover cross-tier drag overlay"
```

---

### Task 2: Render the opaque tier drag overlay

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `TierNikkeRow`, `TierBoardProps["getPublicUrl"]`, existing `DragData`
- Produces: `TierNikkeCardVisual` presentation and `activeTierNikkeName: string | null`

- [ ] **Step 1: Import `DragOverlay` and extract the shared card visual**

Add `DragOverlay` to the `@dnd-kit/core` imports. Create:

```tsx
function TierNikkeCardVisual({
  nikke,
  getPublicUrl,
  overlay = false,
}: {
  nikke: TierNikkeRow;
  getPublicUrl: TierBoardProps["getPublicUrl"];
  overlay?: boolean;
}) {
  const imageUrl = nikke.image_path
    ? getPublicUrl("nikke-images", nikke.image_path)
    : "";

  return (
    <div
      className={`w-16 overflow-hidden rounded-xl border border-black/10 bg-white/80 sm:w-20 dark:border-white/15 dark:bg-black/25 ${
        overlay ? "scale-[1.03] shadow-2xl" : ""
      }`}
    >
      <div className="relative aspect-square w-full">
        {imageUrl ? (
          <Image
            fill
            src={imageUrl}
            alt={formatNikkeDisplayName(nikke.name)}
            draggable={false}
            className="pointer-events-none object-cover"
            sizes="80px"
          />
        ) : (
          <div className="grid h-full place-items-center text-[9px] text-white/60">
            no image
          </div>
        )}
      </div>
      <div className="truncate px-1 py-1 text-[13px] text-neutral-900 dark:text-white">
        {formatNikkeDisplayName(nikke.name)}
      </div>
    </div>
  );
}
```

Update `TierNikkeCard` to render `TierNikkeCardVisual` inside its sortable button and remove duplicated image markup. Keep the button width and interaction classes while letting the visual component own border, background, image, and name styling.

- [ ] **Step 2: Preserve the source slot without displaying a duplicate card**

Add this property to the sortable button style:

```ts
visibility: isDragging ? "hidden" : undefined,
```

Keep `transform`, `transition`, `zIndex`, and `position` so same-row sortable calculations remain intact.

- [ ] **Step 3: Track only active tier drags**

Add:

```ts
const [activeTierNikkeName, setActiveTierNikkeName] = useState<string | null>(null);
const activeTierNikke = activeTierNikkeName
  ? nikkesByName.get(activeTierNikkeName) ?? null
  : null;
```

Update `handleDragStart`:

```ts
setActiveTierNikkeName(
  activeData.source === "tier" && activeData.nikkeName ? activeData.nikkeName : null
);
```

Update the shared drag cleanup path to call:

```ts
setActiveTierNikkeName(null);
```

- [ ] **Step 4: Add the always-mounted drag overlay**

Render this as the final child of `DndContext`, after the board content:

```tsx
<DragOverlay
  dropAnimation={{
    duration: 180,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  }}
>
  {activeTierNikke ? (
    <div className="pointer-events-none">
      <TierNikkeCardVisual
        nikke={activeTierNikke}
        getPublicUrl={getPublicUrl}
        overlay
      />
    </div>
  ) : null}
</DragOverlay>
```

The `DragOverlay` component must remain mounted while its child is conditional so dnd-kit can run the drop animation.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types --test-name-pattern="fully opaque overlay" tests/nikke-tier-tab.test.ts`

Expected: PASS.

- [ ] **Step 6: Run the complete tier test file**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/nikke-tier-tab.test.ts`

Expected: all tests in the file pass.

- [ ] **Step 7: Commit the implementation**

```bash
git add app/components/tabs/tier/TierBoard.tsx tests/nikke-tier-tab.test.ts
git commit -m "fix: keep tier cards visible across rows"
```

---

### Task 3: Verify interaction and production safety

**Files:**
- Verify: `app/components/tabs/tier/TierBoard.tsx`
- Verify: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: completed overlay behavior
- Produces: test, lint, build, and browser evidence

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: exit code 0 with every test passing.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0 and successful Next.js production compilation.

- [ ] **Step 4: Verify locally in a browser**

Start the local app and confirm:

1. A tier card visibly lifts at full opacity.
2. It remains under the pointer after leaving its source tier.
3. Cards in the destination tier continue to make insertion space.
4. Dropping into a different or empty tier places the card correctly.
5. Cancelling restores the source card.
6. Catalog-origin drags retain their current behavior.

- [ ] **Step 5: Inspect the final diff**

Run: `git diff HEAD~2 --check` and `git status --short`.

Expected: no whitespace errors and only the intended plan, test, and component changes.
