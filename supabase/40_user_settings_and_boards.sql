-- 40_user_settings_and_boards.sql
-- Favorites, site settings, contact, usage board, and notices.

create table if not exists public.favorite_nikkes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nikke_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, nikke_name)
);

create index if not exists favorite_nikkes_user_id_created_at_idx on public.favorite_nikkes (user_id, created_at desc);
alter table public.favorite_nikkes enable row level security;

drop policy if exists "favorite_nikkes_select_own" on public.favorite_nikkes;
drop policy if exists "favorite_nikkes_insert_own" on public.favorite_nikkes;
drop policy if exists "favorite_nikkes_delete_own" on public.favorite_nikkes;

create policy "favorite_nikkes_select_own" on public.favorite_nikkes for select to authenticated using (auth.uid() = user_id);
create policy "favorite_nikkes_insert_own" on public.favorite_nikkes for insert to authenticated with check (auth.uid() = user_id);
create policy "favorite_nikkes_delete_own" on public.favorite_nikkes for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_settings add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.site_settings alter column updated_by drop not null;
alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select_all" on public.site_settings;
drop policy if exists "site_settings_insert_master" on public.site_settings;
drop policy if exists "site_settings_update_master" on public.site_settings;

create policy "site_settings_select_all" on public.site_settings for select to anon, authenticated using (true);
create policy "site_settings_insert_master" on public.site_settings for insert to authenticated with check (exists (select 1 from public.app_config where master_user_id = auth.uid()));
create policy "site_settings_update_master" on public.site_settings for update to authenticated using (exists (select 1 from public.app_config where master_user_id = auth.uid())) with check (exists (select 1 from public.app_config where master_user_id = auth.uid()));

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);
create index if not exists contact_inquiries_user_id_created_at_idx on public.contact_inquiries (user_id, created_at desc);
alter table public.contact_inquiries enable row level security;

drop policy if exists "contact_inquiries_insert_all" on public.contact_inquiries;
drop policy if exists "contact_inquiries_select_master_only" on public.contact_inquiries;
drop policy if exists "contact_inquiries_delete_master_only" on public.contact_inquiries;

create policy "contact_inquiries_insert_all" on public.contact_inquiries for insert to anon, authenticated with check (user_id is null or auth.uid() = user_id);
create policy "contact_inquiries_select_master_only" on public.contact_inquiries for select to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "contact_inquiries_delete_master_only" on public.contact_inquiries for delete to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create table if not exists public.contact_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  visibility text not null default 'private',
  status text not null default 'received',
  password_hash text,
  user_id uuid references auth.users(id) on delete set null,
  reply_content text,
  replied_by uuid references auth.users(id) on delete set null,
  replied_at timestamptz,
  migrated_from_contact_inquiry_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_posts_visibility_check check (visibility in ('public', 'private')),
  constraint contact_posts_status_check check (status in ('received', 'resolved'))
);

alter table public.contact_posts add column if not exists title text;
alter table public.contact_posts add column if not exists content text;
alter table public.contact_posts add column if not exists visibility text not null default 'private';
alter table public.contact_posts add column if not exists status text not null default 'received';
alter table public.contact_posts add column if not exists password_hash text;
alter table public.contact_posts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.contact_posts add column if not exists reply_content text;
alter table public.contact_posts add column if not exists replied_by uuid references auth.users(id) on delete set null;
alter table public.contact_posts add column if not exists replied_at timestamptz;
alter table public.contact_posts add column if not exists migrated_from_contact_inquiry_id uuid unique;
alter table public.contact_posts add column if not exists created_at timestamptz not null default now();
alter table public.contact_posts add column if not exists updated_at timestamptz not null default now();

create index if not exists contact_posts_created_at_idx on public.contact_posts (created_at desc);
create index if not exists contact_posts_user_id_created_at_idx on public.contact_posts (user_id, created_at desc);
create index if not exists contact_posts_visibility_created_at_idx on public.contact_posts (visibility, created_at desc);
create index if not exists contact_posts_status_created_at_idx on public.contact_posts (status, created_at desc);
alter table public.contact_posts enable row level security;

insert into public.contact_posts (
  title,
  content,
  visibility,
  status,
  user_id,
  migrated_from_contact_inquiry_id,
  created_at,
  updated_at
)
select
  '이전 문의 ' || to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
  content,
  'private',
  'received',
  user_id,
  id,
  created_at,
  created_at
from public.contact_inquiries
where not exists (
  select 1
  from public.contact_posts
  where public.contact_posts.migrated_from_contact_inquiry_id = public.contact_inquiries.id
);

drop policy if exists "contact_posts_select_own_or_master" on public.contact_posts;
drop policy if exists "contact_posts_insert_own" on public.contact_posts;
drop policy if exists "contact_posts_update_master_only" on public.contact_posts;
drop policy if exists "contact_posts_delete_master_only" on public.contact_posts;

create policy "contact_posts_select_own_or_master"
on public.contact_posts
for select
to authenticated
using (
  auth.uid() is not null
  and (
    auth.uid() = user_id
    or exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())
  )
);

create policy "contact_posts_insert_own"
on public.contact_posts
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "contact_posts_update_master_only"
on public.contact_posts
for update
to authenticated
using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()))
with check (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create policy "contact_posts_delete_master_only"
on public.contact_posts
for delete
to authenticated
using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

create table if not exists public.usage_posts (
  id uuid primary key default gen_random_uuid(),
  category_key text not null,
  title text,
  blocks jsonb not null default '[]'::jsonb,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usage_posts add column if not exists title text;
alter table public.usage_posts alter column title drop not null;
alter table public.usage_posts add column if not exists blocks jsonb not null default '[]'::jsonb;
alter table public.usage_posts add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'usage_posts' and column_name = 'content')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'usage_posts' and column_name = 'image_path') then
    execute $migration$
      update public.usage_posts
      set blocks = case
        when coalesce(jsonb_array_length(blocks), 0) > 0 then blocks
        else jsonb_build_array(
          jsonb_build_object('id', concat('text-', id::text), 'type', 'text', 'content', coalesce(content, '')),
          jsonb_build_object('id', concat('image-', id::text), 'type', 'image', 'imagePath', coalesce(image_path, ''), 'caption', '')
        )
      end
    $migration$;
  end if;
end $$;

alter table public.usage_posts drop constraint if exists usage_posts_category_key_check;
alter table public.usage_posts add constraint usage_posts_category_key_check check (category_key in ('home', 'saved', 'recommend', 'deck-building', 'settings'));

create unique index if not exists usage_posts_category_key_unique_idx on public.usage_posts (category_key);
create index if not exists usage_posts_category_key_created_at_idx on public.usage_posts (category_key, created_at desc);
create index if not exists usage_posts_user_id_created_at_idx on public.usage_posts (user_id, created_at desc);

alter table public.usage_posts enable row level security;

drop policy if exists "usage_posts_select_all" on public.usage_posts;
drop policy if exists "usage_posts_insert_master_only" on public.usage_posts;
drop policy if exists "usage_posts_update_master_only" on public.usage_posts;
drop policy if exists "usage_posts_delete_master_only" on public.usage_posts;

create policy "usage_posts_select_all" on public.usage_posts for select to anon, authenticated using (true);
create policy "usage_posts_insert_master_only" on public.usage_posts for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "usage_posts_update_master_only" on public.usage_posts for update to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "usage_posts_delete_master_only" on public.usage_posts for delete to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

alter table public.usage_posts drop column if exists content;
alter table public.usage_posts drop column if exists image_path;

create table if not exists public.notice_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notice_posts_created_at_idx on public.notice_posts (created_at desc);
alter table public.notice_posts enable row level security;

drop policy if exists "notice_posts_select_all" on public.notice_posts;
drop policy if exists "notice_posts_insert_master_only" on public.notice_posts;
drop policy if exists "notice_posts_update_master_only" on public.notice_posts;
drop policy if exists "notice_posts_delete_master_only" on public.notice_posts;

create policy "notice_posts_select_all" on public.notice_posts for select to anon, authenticated using (true);
create policy "notice_posts_insert_master_only" on public.notice_posts for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "notice_posts_update_master_only" on public.notice_posts for update to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "notice_posts_delete_master_only" on public.notice_posts for delete to authenticated using (exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
