-- 20_catalog.sql
-- Nikke and boss catalog tables.

create table if not exists public.nikkes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_path text not null,
  created_at timestamptz not null default now(),
  burst integer,
  element public.element_type,
  role public.nikke_role,
  aliases text[] not null default '{}'
);

alter table public.nikkes alter column id set default gen_random_uuid();
alter table public.nikkes alter column created_at set default now();
alter table public.nikkes add column if not exists burst integer;
alter table public.nikkes add column if not exists element public.element_type;
alter table public.nikkes add column if not exists role public.nikke_role;
alter table public.nikkes add column if not exists aliases text[] not null default '{}';
alter table public.nikkes drop constraint if exists burst_check;
alter table public.nikkes add constraint burst_check check (burst in (0, 1, 2, 3));

create index if not exists idx_nikkes_burst on public.nikkes (burst);
create index if not exists idx_nikkes_element on public.nikkes (element);
create index if not exists idx_nikkes_role on public.nikkes (role);
create index if not exists idx_nikkes_filters on public.nikkes (burst, element, role);
create index if not exists idx_nikkes_aliases_gin on public.nikkes using gin (aliases);

alter table public.nikkes enable row level security;

drop policy if exists "nikkes_select_all" on public.nikkes;
drop policy if exists "nikkes_insert_master_only" on public.nikkes;
drop policy if exists "nikkes_update_master_only" on public.nikkes;
drop policy if exists "nikkes_delete_master_only" on public.nikkes;

create policy "nikkes_select_all"
on public.nikkes for select to anon, authenticated
using (true);

create policy "nikkes_insert_master_only"
on public.nikkes for insert to authenticated
with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create policy "nikkes_update_master_only"
on public.nikkes for update to authenticated
using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()))
with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create policy "nikkes_delete_master_only"
on public.nikkes for delete to authenticated
using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create table if not exists public.bosses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_path text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.boss_default (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_path text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bosses enable row level security;
alter table public.boss_default enable row level security;

drop policy if exists "bosses_select_all" on public.bosses;
drop policy if exists "bosses_insert_master_only" on public.bosses;
drop policy if exists "bosses_update_master_only" on public.bosses;
drop policy if exists "bosses_delete_master_only" on public.bosses;

create policy "bosses_select_all" on public.bosses for select to anon, authenticated using (true);
create policy "bosses_insert_master_only" on public.bosses for insert to authenticated with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "bosses_update_master_only" on public.bosses for update to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "bosses_delete_master_only" on public.bosses for delete to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

drop policy if exists "boss_default_select_all" on public.boss_default;
drop policy if exists "boss_default_insert_master_only" on public.boss_default;
drop policy if exists "boss_default_update_master_only" on public.boss_default;
drop policy if exists "boss_default_delete_master_only" on public.boss_default;

create policy "boss_default_select_all" on public.boss_default for select to anon, authenticated using (true);
create policy "boss_default_insert_master_only" on public.boss_default for insert to authenticated with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "boss_default_update_master_only" on public.boss_default for update to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "boss_default_delete_master_only" on public.boss_default for delete to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
