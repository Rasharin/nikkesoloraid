alter table public.union_raid_decks drop constraint if exists union_raid_decks_raid_key_fkey;

drop policy if exists union_deck_insert on public.union_raid_decks;
drop policy if exists union_deck_update on public.union_raid_decks;
drop policy if exists union_deck_delete on public.union_raid_decks;

create policy union_deck_insert on public.union_raid_decks for insert to authenticated with check(
  user_id=(select auth.uid()) and (
    raid_key='__season_off__' or
    exists(select 1 from public.union_raid_schedules s where s.raid_key=union_raid_decks.raid_key and s.status='active' and s.starts_at<=now() and s.ends_at>now())
  )
);
create policy union_deck_update on public.union_raid_decks for update to authenticated using(
  user_id=(select auth.uid())
) with check(
  user_id=(select auth.uid()) and (
    raid_key='__season_off__' or exists(select 1 from public.union_raid_schedules s where s.raid_key=union_raid_decks.raid_key)
  )
);
create policy union_deck_delete on public.union_raid_decks for delete to authenticated using(user_id=(select auth.uid()));
