create extension if not exists "pgcrypto";

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chars jsonb not null,
  score bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists decks_user_id_created_at_idx
  on public.decks (user_id, created_at desc);

alter table public.decks enable row level security;

drop policy if exists "decks_select_own" on public.decks;
create policy "decks_select_own"
on public.decks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "decks_insert_own" on public.decks;
create policy "decks_insert_own"
on public.decks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "decks_update_own" on public.decks;
create policy "decks_update_own"
on public.decks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "decks_delete_own" on public.decks;
create policy "decks_delete_own"
on public.decks
for delete
to authenticated
using (user_id = auth.uid());
