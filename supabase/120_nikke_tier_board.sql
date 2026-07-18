-- Shared public Nikke tier board.

create table if not exists public.nikke_tier_board (
  id integer primary key default 1 check (id = 1),
  section_name text not null default '니케 티어',
  rows jsonb not null default '[]'::jsonb check (jsonb_typeof(rows) = 'array'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_nikke_tier_board_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists nikke_tier_board_set_updated_at on public.nikke_tier_board;
create trigger nikke_tier_board_set_updated_at
before update on public.nikke_tier_board
for each row execute function public.set_nikke_tier_board_updated_at();

alter table public.nikke_tier_board enable row level security;

create index if not exists nikke_tier_board_updated_by_idx
on public.nikke_tier_board (updated_by);

revoke all on public.nikke_tier_board from anon, authenticated;
grant select on public.nikke_tier_board to anon, authenticated;
grant insert, update on public.nikke_tier_board to authenticated;
revoke delete on public.nikke_tier_board from anon, authenticated;

drop policy if exists "nikke_tier_board_select_all" on public.nikke_tier_board;
drop policy if exists "nikke_tier_board_insert_editors" on public.nikke_tier_board;
drop policy if exists "nikke_tier_board_update_editors" on public.nikke_tier_board;

create policy "nikke_tier_board_select_all"
on public.nikke_tier_board
for select
to anon, authenticated
using (true);

create policy "nikke_tier_board_insert_editors"
on public.nikke_tier_board
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_config
    where master_user_id = (select auth.uid())
  )
  or (select auth.uid()) = '2d455703-52fd-4239-82f8-79c5e1856f30'::uuid
);

create policy "nikke_tier_board_update_editors"
on public.nikke_tier_board
for update
to authenticated
using (
  exists (
    select 1
    from public.app_config
    where master_user_id = (select auth.uid())
  )
  or (select auth.uid()) = '2d455703-52fd-4239-82f8-79c5e1856f30'::uuid
)
with check (
  exists (
    select 1
    from public.app_config
    where master_user_id = (select auth.uid())
  )
  or (select auth.uid()) = '2d455703-52fd-4239-82f8-79c5e1856f30'::uuid
);
