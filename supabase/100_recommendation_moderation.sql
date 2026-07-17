-- Recommendation source moderation, blocked contributors, and owner notices.

alter table public.decks
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_decks_updated_at()
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

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
before update on public.decks
for each row execute function public.set_decks_updated_at();

create table if not exists public.recommendation_deck_moderations (
  deck_id uuid primary key references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_by uuid not null references auth.users(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  hidden_deck_updated_at timestamptz not null
);

create index if not exists recommendation_deck_moderations_user_id_idx
  on public.recommendation_deck_moderations (user_id, hidden_at desc);
create index if not exists recommendation_deck_moderations_hidden_by_idx
  on public.recommendation_deck_moderations (hidden_by);

create table if not exists public.recommendation_blocked_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocked_by uuid not null references auth.users(id) on delete cascade,
  blocked_at timestamptz not null default now()
);
create index if not exists recommendation_blocked_users_blocked_by_idx
  on public.recommendation_blocked_users (blocked_by);

create table if not exists public.recommendation_moderation_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique (user_id, deck_id)
);

create index if not exists recommendation_moderation_notices_unread_idx
  on public.recommendation_moderation_notices (user_id, created_at desc)
  where acknowledged_at is null;
create index if not exists recommendation_moderation_notices_deck_id_idx
  on public.recommendation_moderation_notices (deck_id);

alter table public.recommendation_deck_moderations enable row level security;
alter table public.recommendation_blocked_users enable row level security;
alter table public.recommendation_moderation_notices enable row level security;

drop policy if exists "recommendation_deck_moderations_master_all" on public.recommendation_deck_moderations;
create policy "recommendation_deck_moderations_master_all"
on public.recommendation_deck_moderations
for all to authenticated
using (exists (select 1 from public.app_config where master_user_id = (select auth.uid())))
with check (exists (select 1 from public.app_config where master_user_id = (select auth.uid())));

drop policy if exists "recommendation_blocked_users_master_all" on public.recommendation_blocked_users;
create policy "recommendation_blocked_users_master_all"
on public.recommendation_blocked_users
for all to authenticated
using (exists (select 1 from public.app_config where master_user_id = (select auth.uid())))
with check (exists (select 1 from public.app_config where master_user_id = (select auth.uid())));

drop policy if exists "recommendation_moderation_notices_select_own" on public.recommendation_moderation_notices;
drop policy if exists "recommendation_moderation_notices_update_own" on public.recommendation_moderation_notices;
drop policy if exists "recommendation_moderation_notices_master_all" on public.recommendation_moderation_notices;

create policy "recommendation_moderation_notices_select_own"
on public.recommendation_moderation_notices
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "recommendation_moderation_notices_update_own"
on public.recommendation_moderation_notices
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "decks_update_own" on public.decks;
create policy "decks_update_own"
on public.decks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "decks_update_master" on public.decks;
drop policy if exists "decks_delete_master" on public.decks;
