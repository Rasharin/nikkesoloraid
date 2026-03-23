create table if not exists public.usage_posts (
  id uuid primary key default gen_random_uuid(),
  category_key text not null,
  title text not null,
  blocks jsonb not null default '[]'::jsonb,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usage_posts
  add column if not exists blocks jsonb not null default '[]'::jsonb;

alter table public.usage_posts
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usage_posts'
      and column_name = 'content'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usage_posts'
      and column_name = 'image_path'
  ) then
    execute $migration$
      update public.usage_posts
      set blocks = case
        when coalesce(jsonb_array_length(blocks), 0) > 0 then blocks
        else (
          jsonb_build_array(
            jsonb_build_object(
              'id', concat('text-', id::text),
              'type', 'text',
              'content', coalesce(content, '')
            ),
            jsonb_build_object(
              'id', concat('image-', id::text),
              'type', 'image',
              'imagePath', coalesce(image_path, ''),
              'caption', ''
            )
          )
        )
      end
    $migration$;
  end if;
end $$;

alter table public.usage_posts
  drop constraint if exists usage_posts_category_key_check;

alter table public.usage_posts
  add constraint usage_posts_category_key_check
  check (category_key in ('home', 'saved', 'recommend', 'settings'));

create unique index if not exists usage_posts_category_key_unique_idx
  on public.usage_posts (category_key);

create index if not exists usage_posts_category_key_created_at_idx
  on public.usage_posts (category_key, created_at desc);

create index if not exists usage_posts_user_id_created_at_idx
  on public.usage_posts (user_id, created_at desc);

alter table public.usage_posts enable row level security;

drop policy if exists "usage_posts_select_all" on public.usage_posts;
drop policy if exists "usage_posts_insert_master_only" on public.usage_posts;
drop policy if exists "usage_posts_update_master_only" on public.usage_posts;
drop policy if exists "usage_posts_delete_master_only" on public.usage_posts;

create policy "usage_posts_select_all"
on public.usage_posts
for select
to anon, authenticated
using (true);

create policy "usage_posts_insert_master_only"
on public.usage_posts
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

create policy "usage_posts_update_master_only"
on public.usage_posts
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

create policy "usage_posts_delete_master_only"
on public.usage_posts
for delete
to authenticated
using (
  exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('usage-board-images', 'usage-board-images', true)
on conflict (id) do nothing;

drop policy if exists "usage_board_images_select_all" on storage.objects;
drop policy if exists "usage_board_images_insert_master_only" on storage.objects;
drop policy if exists "usage_board_images_delete_master_only" on storage.objects;

create policy "usage_board_images_select_all"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'usage-board-images');

create policy "usage_board_images_insert_master_only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'usage-board-images'
  and exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);

create policy "usage_board_images_delete_master_only"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'usage-board-images'
  and exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);
