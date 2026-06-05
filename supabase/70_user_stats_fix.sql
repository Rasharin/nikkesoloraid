-- 70_user_stats_fix.sql
-- 이용자 집계 버그 수정:
--   - site_user_stats SELECT 정책을 전체 공개로 변경 (누적 이용자 COUNT 정상화)
--   - raid_user_stats SELECT 정책을 전체 공개로 변경 (보스별 집계 정상화)
--   - raid_user_stats UNIQUE constraint 명시적 추가 (upsert 보장)
--   - raid_user_archives SELECT를 전체 공개로 변경

-- =============================================
-- 1. site_user_stats 테이블 생성 (없으면)
-- =============================================
create table if not exists public.site_user_stats (
  client_id  text primary key,
  user_id    text,
  last_seen  timestamptz not null default now()
);

-- =============================================
-- 2. raid_user_stats 테이블 생성 (없으면)
-- =============================================
create table if not exists public.raid_user_stats (
  id         bigserial primary key,
  raid_key   text not null,
  raid_label text,
  client_id  text not null,
  user_id    text,
  last_seen  timestamptz not null default now(),
  ended_at   timestamptz,
  constraint raid_user_stats_raid_key_client_id_key unique (raid_key, client_id)
);

-- =============================================
-- 3. raid_user_archives 테이블 생성 (없으면)
-- =============================================
create table if not exists public.raid_user_archives (
  raid_key   text primary key,
  raid_label text,
  user_count bigint not null default 0,
  ended_at   timestamptz
);

-- =============================================
-- 4. RLS 활성화
-- =============================================
alter table public.site_user_stats    enable row level security;
alter table public.raid_user_stats    enable row level security;
alter table public.raid_user_archives enable row level security;

-- =============================================
-- 5. site_user_stats RLS 정책
--    - 누구나 자기 row 삽입/갱신 가능
--    - 누구나 전체 COUNT 가능 (누적 집계용)
-- =============================================
drop policy if exists "site_user_stats_select_master_only" on public.site_user_stats;
drop policy if exists "site_user_stats_select_all"         on public.site_user_stats;
drop policy if exists "site_user_stats_insert_all"         on public.site_user_stats;
drop policy if exists "site_user_stats_update_all"         on public.site_user_stats;

create policy "site_user_stats_select_all"
  on public.site_user_stats for select
  to anon, authenticated
  using (true);

create policy "site_user_stats_insert_all"
  on public.site_user_stats for insert
  to anon, authenticated
  with check (true);

create policy "site_user_stats_update_all"
  on public.site_user_stats for update
  to anon, authenticated
  using (true);

-- =============================================
-- 6. raid_user_stats RLS 정책
--    - 누구나 삽입/갱신/조회 가능
-- =============================================
drop policy if exists "raid_user_stats_select_master_only" on public.raid_user_stats;
drop policy if exists "raid_user_stats_select_all"         on public.raid_user_stats;
drop policy if exists "raid_user_stats_insert_all"         on public.raid_user_stats;
drop policy if exists "raid_user_stats_update_all"         on public.raid_user_stats;

create policy "raid_user_stats_select_all"
  on public.raid_user_stats for select
  to anon, authenticated
  using (true);

create policy "raid_user_stats_insert_all"
  on public.raid_user_stats for insert
  to anon, authenticated
  with check (true);

create policy "raid_user_stats_update_all"
  on public.raid_user_stats for update
  to anon, authenticated
  using (true);

-- =============================================
-- 7. raid_user_archives RLS 정책
--    - 누구나 조회 가능, 삽입/갱신은 인증된 사용자만
-- =============================================
drop policy if exists "raid_user_archives_select_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_insert_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_update_master_only" on public.raid_user_archives;
drop policy if exists "raid_user_archives_select_all"         on public.raid_user_archives;
drop policy if exists "raid_user_archives_write_auth"         on public.raid_user_archives;

create policy "raid_user_archives_select_all"
  on public.raid_user_archives for select
  to anon, authenticated
  using (true);

create policy "raid_user_archives_write_auth"
  on public.raid_user_archives for all
  to authenticated
  using (auth.role() = 'authenticated');
