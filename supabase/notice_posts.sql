create extension if not exists "pgcrypto";

create table if not exists public.notice_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notice_posts_created_at_idx
  on public.notice_posts (created_at desc);

alter table public.notice_posts enable row level security;

drop policy if exists "notice_posts_select_all" on public.notice_posts;
drop policy if exists "notice_posts_insert_master_only" on public.notice_posts;
drop policy if exists "notice_posts_update_master_only" on public.notice_posts;
drop policy if exists "notice_posts_delete_master_only" on public.notice_posts;

create policy "notice_posts_select_all"
on public.notice_posts
for select
to anon, authenticated
using (true);

create policy "notice_posts_insert_master_only"
on public.notice_posts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);

create policy "notice_posts_update_master_only"
on public.notice_posts
for update
to authenticated
using (
  exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);

create policy "notice_posts_delete_master_only"
on public.notice_posts
for delete
to authenticated
using (
  exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);
