create table if not exists public.app_config (
  id boolean primary key default true,
  master_user_id uuid references auth.users(id) on delete set null,
  active_raid_key text,
  solo_raid_active boolean not null default true,
  solo_raid_tabs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_config_singleton check (id = true)
);

alter table public.app_config enable row level security;

drop policy if exists "app_config_select_all" on public.app_config;
create policy "app_config_select_all"
on public.app_config
for select
to anon, authenticated
using (true);

drop policy if exists "app_config_insert_bootstrap" on public.app_config;
create policy "app_config_insert_bootstrap"
on public.app_config
for insert
to authenticated
with check (
  master_user_id = auth.uid()
  and not exists (select 1 from public.app_config)
);

drop policy if exists "app_config_update_master_only" on public.app_config;
create policy "app_config_update_master_only"
on public.app_config
for update
to authenticated
using (master_user_id = auth.uid())
with check (master_user_id = auth.uid());
