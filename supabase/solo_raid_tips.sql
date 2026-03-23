create table if not exists public.solo_raid_tips (
  id uuid primary key default gen_random_uuid(),
  raid_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  author_name text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists solo_raid_tips_raid_key_created_at_idx
  on public.solo_raid_tips (raid_key, created_at desc);

create index if not exists solo_raid_tips_user_id_created_at_idx
  on public.solo_raid_tips (user_id, created_at desc);

alter table public.solo_raid_tips enable row level security;

drop policy if exists "solo_raid_tips_select_all" on public.solo_raid_tips;
drop policy if exists "solo_raid_tips_insert_authenticated" on public.solo_raid_tips;

create policy "solo_raid_tips_select_all"
on public.solo_raid_tips
for select
to anon, authenticated
using (true);

create policy "solo_raid_tips_insert_authenticated"
on public.solo_raid_tips
for insert
to authenticated
with check (auth.uid() = user_id);
