# Tier Catalog Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a header toggle that collapses the tier catalog search, filters, and Nikke cards while leaving the title and toggle visible.

**Architecture:** Keep collapse state local to `TierNikkeCatalog` so no parent props or persistence change is needed. Render the catalog body conditionally while preserving search and filter state in the mounted component.

**Tech Stack:** TypeScript, React, Next.js App Router, Tailwind CSS, Node test runner

## Global Constraints

- The catalog starts expanded on every new page load.
- Collapsing hides the search input, filters, card grid, and empty-result message.
- The title and toggle button remain visible in both states.
- Search text and selected filters survive a collapse and re-expand cycle.
- The toggle exposes `aria-expanded` and state-specific Korean accessible labels.
- Do not add localStorage persistence, height animation, parent state, or server changes.

---

### Task 1: Add the catalog collapse control

**Files:**
- Modify: `app/components/tabs/tier/TierNikkeCatalog.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: existing `TierNikkeCatalog` props and local search/filter state
- Produces: local `catalogCollapsed: boolean` state and a button labeled `전체 니케 목록 접기` or `전체 니케 목록 펼치기`

- [ ] **Step 1: Write the failing source regression test**

Add a test asserting that `TierNikkeCatalog.tsx` contains local collapse state, `aria-expanded`, both accessibility labels, a rotating arrow, and a conditional wrapper around the search/filter/results body:

```ts
test("tier catalog header toggles search filters and cards", () => {
  const source = fs.readFileSync(
    "app/components/tabs/tier/TierNikkeCatalog.tsx",
    "utf8",
  );

  assert.match(source, /const \[catalogCollapsed, setCatalogCollapsed\] = useState\(false\)/);
  assert.match(source, /aria-expanded=\{!catalogCollapsed\}/);
  assert.match(source, /catalogCollapsed \? "전체 니케 목록 펼치기" : "전체 니케 목록 접기"/);
  assert.match(source, /catalogCollapsed \? "rotate-180" : ""/);
  assert.match(source, /\{!catalogCollapsed \? \([\s\S]*data-tier-filter-bar[\s\S]*filteredNikkes\.length > 0/);
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```powershell
node --test tests/nikke-tier-tab.test.ts
```

Expected: FAIL because `catalogCollapsed`, the toggle button, and the conditional catalog body do not exist.

- [ ] **Step 3: Implement the minimal local collapse behavior**

In `TierNikkeCatalog`, add:

```tsx
const [catalogCollapsed, setCatalogCollapsed] = useState(false);
```

Change the header to keep the title and toggle visible, place the search input before the toggle while expanded, and add:

```tsx
<button
  type="button"
  onClick={() => setCatalogCollapsed((collapsed) => !collapsed)}
  aria-expanded={!catalogCollapsed}
  aria-label={catalogCollapsed ? "전체 니케 목록 펼치기" : "전체 니케 목록 접기"}
  title={catalogCollapsed ? "전체 니케 목록 펼치기" : "전체 니케 목록 접기"}
>
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={`h-5 w-5 transition-transform ${catalogCollapsed ? "rotate-180" : ""}`}
  >
    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
</button>
```

Wrap the search input, filter bar, and results block in:

```tsx
{!catalogCollapsed ? (
  <>
    {/* search, filters, and results */}
  </>
) : null}
```

Keep the existing `search`, `selectedBursts`, `selectedElements`, and `selectedRoles` state declarations outside the conditional so values persist while collapsed.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run:

```powershell
node --test tests/nikke-tier-tab.test.ts
```

Expected: all tier tab tests pass.

- [ ] **Step 5: Verify the running UI**

On `http://localhost:3000/tier`, confirm:

1. Expanded state shows title, search input, down arrow, filters, and cards.
2. Clicking the toggle leaves only the title and up arrow.
3. Clicking again restores search, filters, and cards.
4. Search text and active filters remain selected after the cycle.
5. Browser console shows no new errors.

- [ ] **Step 6: Run full validation**

Run:

```powershell
npm test
npx eslint app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-tier-tab.test.ts
npm run build
git diff --check
```

Expected: all commands exit successfully.

- [ ] **Step 7: Commit**

```powershell
git add -- app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-tier-tab.test.ts
git commit -m "feat: add tier catalog collapse control"
```
