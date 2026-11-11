-- Freeze NiDeck as an owner-only read-only archive.
-- Back up the project before applying this migration. It intentionally removes
-- browser-facing privileges for the archive tables except the three grants below.

begin;

revoke all privileges on table public.decks, public.union_raid_decks, public.union_raid_schedules
from public, anon, authenticated;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.is_master() set search_path = '';
alter function public.set_updated_at() set search_path = '';

grant select on table public.decks to authenticated;
grant select on table public.union_raid_decks to authenticated;
grant select on table public.union_raid_schedules to authenticated;

alter table public.decks enable row level security;

drop policy if exists "decks_select_own" on public.decks;
drop policy if exists "decks_select_all" on public.decks;
drop policy if exists "decks_select_public" on public.decks;
drop policy if exists "decks_insert_own" on public.decks;
drop policy if exists "decks_update_own" on public.decks;
drop policy if exists "decks_delete_own" on public.decks;
drop policy if exists "decks_update_master" on public.decks;
drop policy if exists "decks_delete_master" on public.decks;
drop policy if exists "decks_archive_select_own" on public.decks;

create policy "decks_archive_select_own"
on public.decks
for select
to authenticated
using ((select auth.uid()) = user_id);

alter table public.union_raid_decks enable row level security;

drop policy if exists union_deck_read on public.union_raid_decks;
drop policy if exists union_deck_insert on public.union_raid_decks;
drop policy if exists union_deck_update on public.union_raid_decks;
drop policy if exists union_deck_delete on public.union_raid_decks;
drop policy if exists union_deck_archive_select_own on public.union_raid_decks;

create policy union_deck_archive_select_own
on public.union_raid_decks
for select
to authenticated
using (user_id = (select auth.uid()));

alter table public.union_raid_schedules enable row level security;

drop policy if exists union_schedule_read on public.union_raid_schedules;
drop policy if exists union_schedule_archive_read on public.union_raid_schedules;

create policy union_schedule_archive_read
on public.union_raid_schedules
for select
to authenticated
using (true);

commit;
