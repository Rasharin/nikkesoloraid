-- 10_app_config.sql
-- Singleton app configuration. Replace the UUID below if the master account changes.

create table if not exists public.app_config (
  id int primary key default 1,
  master_user_id uuid references auth.users(id) on delete set null,
  active_raid_key text,
  solo_raid_active boolean not null default true,
  solo_raid_tabs jsonb not null default '[]'::jsonb,
  nikke_cache_version text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_config_singleton check (id = 1)
);

alter table public.app_config
  add column if not exists master_user_id uuid references auth.users(id) on delete set null;

alter table public.app_config
  add column if not exists active_raid_key text;

alter table public.app_config
  add column if not exists solo_raid_active boolean not null default true;

alter table public.app_config
  add column if not exists solo_raid_tabs jsonb not null default '[]'::jsonb;

alter table public.app_config
  add column if not exists nikke_cache_version text not null default '';

alter table public.app_config
  add column if not exists created_at timestamptz not null default now();

alter table public.app_config
  add column if not exists updated_at timestamptz not null default now();

alter table public.app_config
  alter column master_user_id drop not null;

do $$
declare
  app_config_id_type text;
begin
  select data_type
  into app_config_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'app_config'
    and column_name = 'id';

  if app_config_id_type = 'boolean' then
    insert into public.app_config (id, master_user_id, active_raid_key, solo_raid_active, solo_raid_tabs)
    values (true, '2d2e243d-a5fc-4dc9-b1a7-58b7c4464eaa'::uuid, '크리스탈-챔버', true, '[{"key":"크리스탈-챔버","label":"크리스탈 챔버"}]'::jsonb)
    on conflict (id) do update
    set
      master_user_id = coalesce(public.app_config.master_user_id, excluded.master_user_id),
      active_raid_key = coalesce(public.app_config.active_raid_key, excluded.active_raid_key),
      solo_raid_tabs = case
        when jsonb_array_length(coalesce(public.app_config.solo_raid_tabs, '[]'::jsonb)) = 0 then excluded.solo_raid_tabs
        else public.app_config.solo_raid_tabs
      end,
      updated_at = now();
  else
    insert into public.app_config (id, master_user_id, active_raid_key, solo_raid_active, solo_raid_tabs)
    values (1, '2d2e243d-a5fc-4dc9-b1a7-58b7c4464eaa'::uuid, '크리스탈-챔버', true, '[{"key":"크리스탈-챔버","label":"크리스탈 챔버"}]'::jsonb)
    on conflict (id) do update
    set
      master_user_id = coalesce(public.app_config.master_user_id, excluded.master_user_id),
      active_raid_key = coalesce(public.app_config.active_raid_key, excluded.active_raid_key),
      solo_raid_tabs = case
        when jsonb_array_length(coalesce(public.app_config.solo_raid_tabs, '[]'::jsonb)) = 0 then excluded.solo_raid_tabs
        else public.app_config.solo_raid_tabs
      end,
      updated_at = now();
  end if;
end $$;

alter table public.app_config enable row level security;

drop policy if exists "app_config_select_all" on public.app_config;
drop policy if exists "app_config_insert_bootstrap" on public.app_config;
drop policy if exists "app_config_insert_master_only" on public.app_config;
drop policy if exists "app_config_update_master_only" on public.app_config;

create policy "app_config_select_all"
on public.app_config
for select
to anon, authenticated
using (true);

create policy "app_config_insert_master_only"
on public.app_config
for insert
to authenticated
with check (auth.uid() = master_user_id);

create policy "app_config_update_master_only"
on public.app_config
for update
to authenticated
using (auth.uid() = master_user_id)
with check (auth.uid() = master_user_id or master_user_id is null);

