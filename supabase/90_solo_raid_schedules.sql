-- 90_solo_raid_schedules.sql
-- Scheduled solo raid start/end management.

create table if not exists public.solo_raid_schedules (
  id uuid primary key default gen_random_uuid(),
  raid_key text not null unique,
  raid_label text not null,
  description text not null default '',
  image_path text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  constraint solo_raid_schedules_status_check check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  constraint solo_raid_schedules_window_check check (ends_at > starts_at)
);

alter table public.solo_raid_schedules add column if not exists raid_key text;
alter table public.solo_raid_schedules add column if not exists raid_label text;
alter table public.solo_raid_schedules add column if not exists description text not null default '';
alter table public.solo_raid_schedules add column if not exists image_path text;
alter table public.solo_raid_schedules add column if not exists starts_at timestamptz;
alter table public.solo_raid_schedules add column if not exists ends_at timestamptz;
alter table public.solo_raid_schedules add column if not exists status text not null default 'scheduled';
alter table public.solo_raid_schedules add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.solo_raid_schedules add column if not exists created_at timestamptz not null default now();
alter table public.solo_raid_schedules add column if not exists updated_at timestamptz not null default now();
alter table public.solo_raid_schedules add column if not exists started_at timestamptz;
alter table public.solo_raid_schedules add column if not exists ended_at timestamptz;

alter table public.solo_raid_schedules alter column raid_key set not null;
alter table public.solo_raid_schedules alter column raid_label set not null;
alter table public.solo_raid_schedules alter column image_path set not null;
alter table public.solo_raid_schedules alter column starts_at set not null;
alter table public.solo_raid_schedules alter column ends_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'solo_raid_schedules_raid_key_key'
      and conrelid = 'public.solo_raid_schedules'::regclass
  ) then
    alter table public.solo_raid_schedules add constraint solo_raid_schedules_raid_key_key unique (raid_key);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'solo_raid_schedules_status_check'
      and conrelid = 'public.solo_raid_schedules'::regclass
  ) then
    alter table public.solo_raid_schedules
      add constraint solo_raid_schedules_status_check
      check (status in ('scheduled', 'active', 'completed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'solo_raid_schedules_window_check'
      and conrelid = 'public.solo_raid_schedules'::regclass
  ) then
    alter table public.solo_raid_schedules
      add constraint solo_raid_schedules_window_check
      check (ends_at > starts_at);
  end if;
end $$;

create index if not exists solo_raid_schedules_status_starts_at_idx on public.solo_raid_schedules (status, starts_at);
create index if not exists solo_raid_schedules_status_ends_at_idx on public.solo_raid_schedules (status, ends_at);
create index if not exists solo_raid_schedules_created_at_idx on public.solo_raid_schedules (created_at desc);

alter table public.solo_raid_schedules enable row level security;

drop policy if exists "solo_raid_schedules_select_master_only" on public.solo_raid_schedules;
drop policy if exists "solo_raid_schedules_insert_master_only" on public.solo_raid_schedules;
drop policy if exists "solo_raid_schedules_update_master_only" on public.solo_raid_schedules;
drop policy if exists "solo_raid_schedules_delete_master_only" on public.solo_raid_schedules;

create policy "solo_raid_schedules_select_master_only"
on public.solo_raid_schedules
for select
to authenticated
using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create policy "solo_raid_schedules_insert_master_only"
on public.solo_raid_schedules
for insert
to authenticated
with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create policy "solo_raid_schedules_update_master_only"
on public.solo_raid_schedules
for update
to authenticated
using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()))
with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create policy "solo_raid_schedules_delete_master_only"
on public.solo_raid_schedules
for delete
to authenticated
using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
