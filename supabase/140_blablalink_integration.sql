-- BlaBlaLink account integration. Credentials are intentionally never stored.

alter table public.nikkes add column if not exists name_code bigint;
alter table public.nikkes add column if not exists resource_id bigint;
alter table public.nikkes add column if not exists mapping_source text;
alter table public.nikkes add column if not exists mapping_verified boolean not null default false;
alter table public.nikkes drop constraint if exists nikkes_mapping_source_check;
alter table public.nikkes add constraint nikkes_mapping_source_check
  check (mapping_source is null or mapping_source in ('auto', 'manual'));
create unique index if not exists nikkes_name_code_unique_idx on public.nikkes (name_code) where name_code is not null;
create unique index if not exists nikkes_resource_id_unique_idx on public.nikkes (resource_id) where resource_id is not null;

create table if not exists public.blablalink_integrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  server_key text not null,
  game_openid_hash text not null,
  synchro_level integer,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint blablalink_integrations_server_check
    check (server_key in ('korea', 'japan', 'global', 'north_america', 'southeast_asia')),
  constraint blablalink_integrations_synchro_level_check check (synchro_level is null or synchro_level > 0)
);

create table if not exists public.blablalink_user_characters (
  user_id uuid not null references auth.users(id) on delete cascade,
  nikke_id uuid not null references public.nikkes(id) on delete cascade,
  name_code bigint not null,
  resource_id bigint not null,
  level integer,
  breakthrough integer,
  core integer,
  details jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (user_id, nikke_id)
);

create table if not exists public.blablalink_best5_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  raid_key text not null,
  synchro_level integer not null,
  total bigint not null,
  decks jsonb not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, raid_key, synchro_level),
  constraint blablalink_best5_snapshots_level_check check (synchro_level > 0),
  constraint blablalink_best5_snapshots_total_check check (total > 0)
);

create index if not exists blablalink_user_characters_user_idx on public.blablalink_user_characters (user_id);
create index if not exists blablalink_best5_snapshots_level_idx on public.blablalink_best5_snapshots (synchro_level, total desc);

alter table public.blablalink_integrations enable row level security;
alter table public.blablalink_user_characters enable row level security;
alter table public.blablalink_best5_snapshots enable row level security;

create policy "blablalink_integrations_select_own" on public.blablalink_integrations
for select to authenticated using ((select auth.uid()) = user_id);
create policy "blablalink_integrations_insert_own" on public.blablalink_integrations
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "blablalink_integrations_update_own" on public.blablalink_integrations
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "blablalink_integrations_delete_own" on public.blablalink_integrations
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "blablalink_user_characters_select_own" on public.blablalink_user_characters
for select to authenticated using ((select auth.uid()) = user_id);
create policy "blablalink_user_characters_insert_own" on public.blablalink_user_characters
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "blablalink_user_characters_update_own" on public.blablalink_user_characters
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "blablalink_user_characters_delete_own" on public.blablalink_user_characters
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "blablalink_best5_snapshots_select_own" on public.blablalink_best5_snapshots
for select to authenticated using ((select auth.uid()) = user_id);
create policy "blablalink_best5_snapshots_insert_own" on public.blablalink_best5_snapshots
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "blablalink_best5_snapshots_update_own" on public.blablalink_best5_snapshots
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "blablalink_best5_snapshots_delete_own" on public.blablalink_best5_snapshots
for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.blablalink_integrations to authenticated;
grant select, insert, update, delete on public.blablalink_user_characters to authenticated;
grant select, insert, update, delete on public.blablalink_best5_snapshots to authenticated;
