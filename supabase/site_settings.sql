create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select_all" on public.site_settings;
create policy "site_settings_select_all"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "site_settings_insert_master" on public.site_settings;
create policy "site_settings_insert_master"
on public.site_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_config
    where master_user_id = auth.uid()
  )
);

drop policy if exists "site_settings_update_master" on public.site_settings;
create policy "site_settings_update_master"
on public.site_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.app_config
    where master_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.app_config
    where master_user_id = auth.uid()
  )
);
