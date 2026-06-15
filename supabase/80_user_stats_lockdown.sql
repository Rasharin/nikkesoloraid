-- 80_user_stats_lockdown.sql
-- Lock visitor statistics tables so browser clients cannot forge counts.
-- Writes now go through Next.js server routes using SUPABASE_SERVICE_ROLE_KEY.

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
