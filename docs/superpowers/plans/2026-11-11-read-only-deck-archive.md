# Read-only Deck Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace NiDeck with an authenticated, owner-only, read-only deck archive that supports JSON and CSV export without a deployed privileged Supabase secret.

**Architecture:** A focused client component uses the existing Supabase browser client for Google Auth and three owner/read-only queries. Pure archive helpers normalize database rows, group display data, and serialize downloads. A Supabase migration removes public-schema privileges and restores only the required owner-scoped reads; all Next API routes and the Vercel cron are removed.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/PostgREST, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-11-read-only-deck-archive-design.md`

## Global Constraints

- Do not apply remote Supabase or Vercel changes and do not publish.
- Do not retain or introduce `SUPABASE_SERVICE_ROLE_KEY` in deployed application paths.
- Keep tracked static assets, legal pages, and the existing Google OAuth callback.
- Use optional `NEXT_PUBLIC_ARCHIVE_CONTACT_EMAIL` for manual early-deletion requests; do not restore a privileged deletion API.
- Enforce authorization through RLS and grants, not browser-supplied user IDs.
- Do not add dependencies or create a Git worktree.

## Review Focus

- Malformed database rows must be rejected without breaking valid rows; Task 1 tests invalid IDs, character arrays, scores, and dates.
- CSV values containing Korean text, commas, quotes, and newlines must round-trip safely; Task 1 tests exact escaped output with a UTF-8 BOM.
- Empty owners must see a valid empty archive rather than an error; Task 1 tests empty export and Task 2 renders the empty state.
- A stale auth request must not show a prior user's decks after logout; Task 2 clears archive state before/when auth changes.
- Owner isolation must remain effective even when a caller supplies another user ID filter; Task 3 uses database policies based only on `auth.uid()` and adds SQL assertions for cross-user denial.
- Returning browsers must not receive the retired application from an old service-worker cache; Task 2 unregisters workers and clears caches before archive use.

---

### Task 1: Archive domain and export helpers

**Files:**
- Create: `lib/archive.ts`
- Create: `tests/archive.test.ts`

**Interfaces:**
- Produces: `normalizeSoloDeck`, `normalizeUnionDeck`, `normalizeUnionSchedule`, `buildArchive`, `archiveToJson`, and `archiveToCsv` plus archive row types.

- [ ] **Step 1: Write failing normalization and export tests**
- [ ] **Step 2: Run `npm test -- tests/archive.test.ts` and verify failures are caused by the missing module**
- [ ] **Step 3: Implement the minimal pure helpers in `lib/archive.ts`**
- [ ] **Step 4: Run `npm test -- tests/archive.test.ts` and verify the new tests pass**

### Task 2: Minimal archive interface

**Files:**
- Create: `app/components/archive/ArchiveApp.tsx`
- Replace: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `lib/site.ts`
- Modify: `app/sitemap.ts`
- Delete: `app/components/ServiceWorkerRegistration.tsx`
- Delete: `public/sw.js`
- Keep: `app/auth/callback/route.ts`
- Keep as alias: `app/saved-deck/page.tsx`
- Delete: obsolete product route `page.tsx` files

**Interfaces:**
- Consumes: archive helpers and types from Task 1; `supabase` from `lib/supabase.ts`.
- Produces: the only product UI, with Google sign-in, logout, owner-scoped loading, grouping, and two download formats.

- [ ] **Step 1: Add a failing page-render integration check for signed-out archive copy and absence of mutation controls**
- [ ] **Step 2: Run the focused check and verify the old product page fails it**
- [ ] **Step 3: Implement `ArchiveApp`, including one-time service-worker/cache cleanup, and replace the main page with the archive**
- [ ] **Step 4: Update metadata, sitemap, site routes, optional deletion contact, and minimal styling, then run the focused check and TypeScript**

### Task 3: Database read-only boundary

**Files:**
- Create: `supabase/migrations/20261111000000_read_only_deck_archive.sql`
- Create: `supabase/tests/read_only_deck_archive.sql`

**Interfaces:**
- Produces: owner-only select policies and grants for `decks`, `union_raid_decks`, and union schedule labels; removes all browser write, public-deck, and public RPC access.

- [ ] **Step 1: Write SQL assertions covering owner reads, cross-owner denial, anonymous denial, denied writes, and denied RPC execution**
- [ ] **Step 2: Run the Supabase SQL test when a local test database is available; otherwise record the environment limitation**
- [ ] **Step 3: Add the idempotent read-only migration**
- [ ] **Step 4: Re-run SQL assertions when available and manually audit grants/policies against the spec**

### Task 4: Remove privileged runtime surface

**Files:**
- Delete: `app/api/**`
- Delete: `vercel.json`
- Delete: obsolete product route pages except the archive alias and legal pages
- Modify/Delete: obsolete tests whose requirements were intentionally removed

**Interfaces:**
- Consumes: archive UI from Task 2 and database boundary from Task 3.
- Produces: a build with no application API routes, cron, or privileged runtime key reference.

- [ ] **Step 1: Remove API routes, their route-only helpers, the cron configuration, and obsolete product route pages**
- [ ] **Step 2: Run repository searches for `SUPABASE_SERVICE_ROLE_KEY`, route handlers, and mutation calls reachable from the archive**
- [ ] **Step 3: Remove obsolete source-coupled tests while retaining domain tests that still describe archive dependencies**
- [ ] **Step 4: Run the complete test suite and TypeScript check**

### Task 5: Production verification

**Files:**
- Modify only if verification reveals an implementation defect.

**Interfaces:**
- Consumes: completed archive application.
- Produces: build and HTTP evidence suitable for review, without deployment.

- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Start the built app locally with public Supabase variables present by name, without printing their values**
- [ ] **Step 3: Request the page and verify archive copy, response status, and absence of server errors**
- [ ] **Step 4: Confirm tracked changes contain no secret values and summarize the unexecuted two-account owner-isolation and production steps**
