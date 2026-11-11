# Archive Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deployed NiDeck archive read-only at the database boundary and close identified framework, function-permission, and HTTP-header risks.

**Architecture:** Keep the existing archive UI and Supabase owner-scoped reads. Apply the existing read-only migration to production, add response security headers in Next.js, and update Next.js within the current major version.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase/PostgreSQL, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-11-read-only-deck-archive-design.md`

## Global Constraints

- Do not change table structure or environment-variable names.
- Keep the existing UI and archive behavior.
- Do not add dependencies or perform unrelated refactors.
- Verify production grants, RLS policies, and Supabase security advisors after applying SQL.

## Review Focus

- Signed-in users must retain owner-only SELECT access after write grants are removed.
- Anonymous users must have no access to archive tables or public RPC functions.
- Security headers must apply to HTML routes without breaking OAuth or Supabase connections.
- The Next.js update must preserve the existing build and archive tests.
- Production SQL must match the tracked migration exactly.

---

### Task 1: HTTP security headers

**Files:**
- Modify: `next.config.ts`
- Create: `tests/security-hardening.test.mjs`

- [ ] Write a failing source-level test for the required headers.
- [ ] Add CSP, nosniff, referrer, permissions, and frame protections.
- [ ] Run the focused test.

### Task 2: Framework security update

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Update Next.js to the patched 16.x release reported by npm audit.
- [ ] Re-run production dependency audit.
- [ ] Run tests, lint, and production build.

### Task 3: Production database lockdown

**Files:**
- Use: `supabase/migrations/20261111000000_read_only_deck_archive.sql`

- [ ] Apply the tracked migration to the connected production project.
- [ ] Query live grants and policies to prove owner-only SELECT and denied writes.
- [ ] Re-run the Supabase security advisor and inspect remaining findings.

### Task 4: Delivery

- [ ] Review the diff and secret scan.
- [ ] Commit and push the minimal changes to `main`.
- [ ] Verify the production deployment and live response headers.
