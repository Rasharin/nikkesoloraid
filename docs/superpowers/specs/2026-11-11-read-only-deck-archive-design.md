# Read-only deck archive design

## Intent

NiDeck will receive no further feature updates and is expected to close around 2027-11-11. Until then, existing users need a low-risk way to sign in and review or download the deck information already stored under their account.

## Goals

- Keep Google sign-in for existing Supabase users.
- Show only the signed-in user's solo and union raid decks.
- Preserve character names, scores, notes, raid identifiers, creation dates, and union layout metadata.
- Let the user download all visible archive data as JSON and CSV before closure.
- Display the target closure date and explain that the archive is read-only.
- Show a static early-deletion contact link when `NEXT_PUBLIC_ARCHIVE_CONTACT_EMAIL` is configured.
- Remove the deployed need for `SUPABASE_SERVICE_ROLE_KEY` and every server API route that uses it.
- Enforce read-only behavior in Supabase grants and RLS, rather than relying on hidden UI controls.

## Non-goals

- Creating, editing, moving, recommending, ranking, moderating, or deleting decks.
- Community features, statistics, contact posts, BlaBlaLink synchronization, administration, or scheduled raid processing.
- Changing production Supabase or Vercel from this development task.
- Publishing or deploying the result from this chat.

## Constraints

- Continue using Next.js, React, TypeScript, and Supabase Auth.
- Use only the public Supabase URL and anon/publishable key in the deployed application.
- Keep `auth.users` identities because row ownership depends on `auth.uid()`.
- Treat the repository SQL as intended configuration; verify the live database separately before production deployment.
- Keep tracked static images available, but the archive must remain usable when a character image cannot be resolved.
- Do not create a Git worktree unless explicitly requested.

## Approaches considered

### Keep the existing application and hide write controls

This has the smallest UI change but retains twenty API routes, eleven service-role consumers, a one-minute cron, and many write paths. It does not sufficiently reduce the impact of a future credential leak.

### Static per-user exports

This removes Supabase runtime access but requires a new secure distribution mechanism for private per-user files. It also makes identity revocation and one-year access management harder.

### Selected: authenticated read-only archive

Keep existing Google authentication and query owner-scoped tables directly with the browser Supabase client. Replace the application with a single archive interface, remove all application API routes and cron configuration, and add a database migration that revokes all public-schema access except the minimum owner-scoped reads. This gives users continuing access without keeping a privileged server secret in the web deployment.

## User experience

The landing page explains that NiDeck is in read-only archive mode and targets closure on 2027-11-11. Signed-out visitors can only sign in. Signed-in users see counts and grouped cards for solo and union raid decks, can switch archive sections, and can download their full archive as JSON or CSV. Empty, loading, authentication, and query-error states are explicit. The page offers logout and contains no mutation controls.

Exports always contain the complete loaded solo and union archive, regardless of the currently selected section. Solo groups use their immutable `raid_key`; union schedules provide human-readable round labels. If configured, the public contact address provides a manual early-deletion request channel without restoring a privileged account-deletion API.

## Data flow and security

The browser authenticates through Supabase Google OAuth and receives a user session. It queries `decks`, `union_raid_decks`, and `union_raid_schedules` with the public client. RLS limits both deck tables to rows whose `user_id` equals `auth.uid()`. The application does not send a user ID chosen by the browser as an authorization mechanism; the database policy is authoritative.

The read-only migration revokes access to every table in `public` from `anon` and `authenticated`, then grants only:

- `authenticated`: `SELECT` on `decks` and `union_raid_decks`.
- `authenticated`: `SELECT` on `union_raid_schedules` for human-readable union raid labels.

It replaces deck read policies with owner-only policies and removes all insert, update, delete, and public-deck policies. No `service_role` key is referenced by deployed code. Supabase retains its internal `service_role`; it is simply absent from Vercel and application runtime.

All `anon` and `authenticated` execution privileges on functions in the `public` schema are revoked so an old RPC cannot bypass table-level hardening. Previously installed NiDeck service workers are unregistered and their caches are cleared once by the archive application so removed routes and scripts do not remain active in returning browsers.

## Closure operations

Before deploying, create and verify a recoverable database backup. Disable new sign-ups while preserving login for existing users, verify Google OAuth redirect URLs, and test with separate owner and non-owner accounts. After the archive deployment is verified, remove `SUPABASE_SERVICE_ROLE_KEY`, BlaBlaLink credentials, cron secrets, and other unused secrets from Vercel. At closure, provide a final export grace period, remove the deployment and domain routing, revoke OAuth credentials, delete the Supabase project, and expire retained backups according to the operator's stated retention period.

## Acceptance criteria

- A signed-out visitor cannot read decks.
- A signed-in user can read only their own solo and union decks.
- No application action can create, change, move, or delete data.
- JSON and CSV exports include both archive types and preserve Korean text.
- The production build contains no `/api` route and no Vercel cron.
- Application source contains no `SUPABASE_SERVICE_ROLE_KEY` reference in deployed paths.
- Existing legal pages may remain; removed product routes return 404 except `/saved-deck`, which may remain as an alias for the archive.
