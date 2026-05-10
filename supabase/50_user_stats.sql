-- 50_user_stats.sql
-- Visitor and raid usage statistics.

create table if not exists public.site_user_stats (
  client_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.raid_user_stats (
  raid_key text not null,
  raid_label text not null,
  client_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  ended_at timestamptz,
  primary key (raid_key, client_id)
);

create table if not exists public.raid_user_archives (
  raid_key text primary key,
  raid_label text not null,
  user_count integer not null default 0,
  ended_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_user_stats enable row level security;
alter table public.raid_user_stats enable row level security;
alter table public.raid_user_archives enable row level security;

drop policy if exists "site_user_stats_insert_all" on public.site_user_stats;
drop policy if exists "site_user_stats_update_all" on public.site_user_stats;
drop policy if exists "site_user_stats_select_master_only" on public.site_user_stats;

create policy "site_user_stats_insert_all" on public.site_user_stats for insert to anon, authenticated with check (client_id is not null and btrim(client_id) <> '');
create policy "site_user_stats_update_all" on public.site_user_stats for update to anon, authenticated using (client_id is not null) with check (client_id is not null and btrim(client_id) <> '');
create policy "site_user_stats_select_master_only" on public.site_user_stats for select to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

drop policy if exists "raid_user_stats_insert_all" on public.raid_user_stats;
drop policy if exists "raid_user_stats_update_all" on public.raid_user_stats;
drop policy if exists "raid_user_stats_select_master_only" on public.raid_user_stats;

create policy "raid_user_stats_insert_all" on public.raid_user_stats for insert to anon, authenticated with check (raid_key is not null and btrim(raid_key) <> '' and client_id is not null and btrim(client_id) <> '');
create policy "raid_user_stats_update_all" on public.raid_user_stats for update to anon, authenticated using (client_id is not null) with check (raid_key is not null and btrim(raid_key) <> '' and client_id is not null and btrim(client_id) <> '');
create policy "raid_user_stats_select_master_only" on public.raid_user_stats for select to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

drop policy if exists "raid_user_archives_select_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_insert_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_update_master_only" on public.raid_user_archives;

create policy "raid_user_archives_select_master_only" on public.raid_user_archives for select to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "raid_user_archives_insert_master_only" on public.raid_user_archives for insert to authenticated with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "raid_user_archives_update_master_only" on public.raid_user_archives for update to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
