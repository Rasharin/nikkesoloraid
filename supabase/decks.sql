create extension if not exists "pgcrypto";

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raid_key text,
  deck_key text,
  chars text[] not null,
  score bigint not null,
  created_at timestamptz not null default now()
);

alter table public.decks
  add column if not exists raid_key text;

alter table public.decks
  add column if not exists deck_key text;

alter table public.decks
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'decks'
      and column_name = 'chars'
      and udt_name = 'jsonb'
  ) then
    alter table public.decks
      alter column chars type text[]
      using (
        case
          when chars is null then null
          else array(select jsonb_array_elements_text(chars))
        end
      );
  end if;
end $$;

update public.decks
set raid_key = 'legacy'
where raid_key is null or btrim(raid_key) = '';

update public.decks
set deck_key = (
  select string_agg(value, '|' order by value)
  from unnest(chars) as value
)
where (deck_key is null or btrim(deck_key) = '')
  and chars is not null;

alter table public.decks
  alter column raid_key set not null;

alter table public.decks
  alter column deck_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'decks_chars_len_chk'
      and conrelid = 'public.decks'::regclass
  ) then
    alter table public.decks
      add constraint decks_chars_len_chk
      check (coalesce(array_length(chars, 1), 0) = 5) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'decks_score_positive_chk'
      and conrelid = 'public.decks'::regclass
  ) then
    alter table public.decks
      add constraint decks_score_positive_chk
      check (score > 0) not valid;
  end if;
end $$;

create index if not exists decks_user_id_created_at_idx
  on public.decks (user_id, created_at desc);

create index if not exists decks_user_id_raid_key_created_at_idx
  on public.decks (user_id, raid_key, created_at desc);

create index if not exists decks_raid_key_deck_key_idx
  on public.decks (raid_key, deck_key);

alter table public.decks enable row level security;

drop policy if exists "decks_select_own" on public.decks;
drop policy if exists "decks_insert_own" on public.decks;
drop policy if exists "decks_update_own" on public.decks;
drop policy if exists "decks_delete_own" on public.decks;

create policy "decks_select_own"
on public.decks
for select
to authenticated
using (auth.uid() = user_id);

create policy "decks_insert_own"
on public.decks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "decks_update_own"
on public.decks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "decks_delete_own"
on public.decks
for delete
to authenticated
using (auth.uid() = user_id);
