-- 80_user_stats_lockdown.sql
-- Lock high-risk RLS policies.
-- - Visitor statistics writes/reads now go through Next.js server routes using SUPABASE_SERVICE_ROLE_KEY.
-- - Saved deck notes must not be exposed through broad authenticated SELECT policies.

-- =============================================
-- 1. Prevent authenticated users from reading every saved deck, including note.
-- =============================================
alter table public.decks enable row level security;

drop policy if exists "decks_select_all" on public.decks;

-- Keep these expected policies from 30_decks_and_recommendations.sql:
-- - decks_select_own: authenticated users can read their own decks.
-- - decks_select_public: anon/authenticated users can read the configured public/submaster decks.
-- Do not recreate decks_select_all here.

-- =============================================
-- 2. Prevent browser clients from forging visitor statistics.
-- =============================================
alter table public.site_user_stats enable row level security;
alter table public.raid_user_stats enable row level security;
alter table public.raid_user_archives enable row level security;

drop policy if exists "site_user_stats_select_master_only" on public.site_user_stats;
drop policy if exists "site_user_stats_select_all" on public.site_user_stats;
drop policy if exists "site_user_stats_insert_all" on public.site_user_stats;
drop policy if exists "site_user_stats_update_all" on public.site_user_stats;

drop policy if exists "raid_user_stats_select_master_only" on public.raid_user_stats;
drop policy if exists "raid_user_stats_select_all" on public.raid_user_stats;
drop policy if exists "raid_user_stats_insert_all" on public.raid_user_stats;
drop policy if exists "raid_user_stats_update_all" on public.raid_user_stats;

drop policy if exists "raid_user_archives_select_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_insert_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_update_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_select_all" on public.raid_user_archives;
drop policy if exists "raid_user_archives_write_auth" on public.raid_user_archives;

-- No anon/authenticated table policies are recreated here.
-- Service-role server APIs bypass RLS for writes and admin-only reads.
