create extension if not exists "pgcrypto";

create table if not exists public.favorite_nikkes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nikke_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, nikke_name)
);

create index if not exists favorite_nikkes_user_id_created_at_idx
  on public.favorite_nikkes (user_id, created_at desc);

alter table public.favorite_nikkes enable row level security;

drop policy if exists "favorite_nikkes_select_own" on public.favorite_nikkes;
create policy "favorite_nikkes_select_own"
on public.favorite_nikkes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "favorite_nikkes_insert_own" on public.favorite_nikkes;
create policy "favorite_nikkes_insert_own"
on public.favorite_nikkes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "favorite_nikkes_delete_own" on public.favorite_nikkes;
create policy "favorite_nikkes_delete_own"
on public.favorite_nikkes
for delete
to authenticated
using (user_id = auth.uid());
