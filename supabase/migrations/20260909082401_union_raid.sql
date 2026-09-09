create table public.union_raid_schedules (
  raid_key text primary key,
  round integer not null unique check (round > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'scheduled' check (status in ('scheduled','active','completed')),
  created_at timestamptz not null default now(),
  check (raid_key = 'union-' || round::text)
);
create unique index union_one_active on public.union_raid_schedules(status) where status='active';
alter table public.app_config add column active_union_raid_key text references public.union_raid_schedules(raid_key);

create table public.union_raid_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raid_key text not null references public.union_raid_schedules(raid_key),
  page_id integer not null check(page_id > 0),
  row_index integer not null check(row_index >= 0),
  deck_id integer not null check(deck_id > 0),
  element text check(element in ('수냉','작열','풍압','전격','철갑')),
  chars text[] not null check(cardinality(chars)=5),
  score numeric not null check(score >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique(user_id, raid_key, page_id, deck_id)
);
create index union_decks_raid on public.union_raid_decks(raid_key);
alter table public.union_raid_schedules enable row level security;
alter table public.union_raid_decks enable row level security;
revoke all on public.union_raid_schedules, public.union_raid_decks from anon, authenticated;
grant select on public.union_raid_schedules to anon, authenticated;
grant select,insert,update,delete on public.union_raid_decks to authenticated;
grant all on public.union_raid_schedules, public.union_raid_decks to service_role;
create policy union_schedule_read on public.union_raid_schedules for select to anon,authenticated using(true);
create policy union_deck_read on public.union_raid_decks for select to authenticated using(user_id=(select auth.uid()));
create policy union_deck_insert on public.union_raid_decks for insert to authenticated with check(
  user_id=(select auth.uid()) and exists(select 1 from public.union_raid_schedules s where s.raid_key=union_raid_decks.raid_key and s.status='active' and s.starts_at<=now() and s.ends_at>now())
);
create policy union_deck_update on public.union_raid_decks for update to authenticated using(
  user_id=(select auth.uid()) and exists(select 1 from public.union_raid_schedules s where s.raid_key=union_raid_decks.raid_key and s.status='active' and s.starts_at<=now() and s.ends_at>now())
) with check(
  user_id=(select auth.uid()) and exists(select 1 from public.union_raid_schedules s where s.raid_key=union_raid_decks.raid_key and s.status='active' and s.starts_at<=now() and s.ends_at>now())
);
create policy union_deck_delete on public.union_raid_decks for delete to authenticated using(
  user_id=(select auth.uid()) and exists(select 1 from public.union_raid_schedules s where s.raid_key=union_raid_decks.raid_key and s.status='active' and s.ends_at>now())
);

-- Service-only, invoker-rights transaction: the API authenticates the master.
create function public.manage_union_raid(action text, target_key text default null, round_number integer default null, start_time timestamptz default null, end_time timestamptz default null)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare candidate public.union_raid_schedules; active_key text;
begin
  perform pg_advisory_xact_lock(927461031);
  update public.union_raid_schedules set status='completed' where status in ('scheduled','active') and ends_at<=now();
  if action in ('create','edit') then
    if round_number is null or round_number<1 or start_time is null or end_time is null or end_time<=start_time or end_time<=now() then raise exception '회차와 시작·종료 일시를 확인해주세요.'; end if;
    if action='edit' then
      select * into candidate from public.union_raid_schedules where raid_key=target_key;
      if not found or candidate.status='completed' then raise exception '종료된 회차는 수정할 수 없습니다.'; end if;
      if candidate.status='active' and (candidate.starts_at<>start_time or candidate.round<>round_number) then raise exception '진행 중에는 종료 일시만 수정할 수 있습니다.'; end if;
      if candidate.round<>round_number then raise exception '등록된 회차 번호는 변경할 수 없습니다.'; end if;
    end if;
    if exists(select 1 from public.union_raid_schedules where status in ('scheduled','active') and raid_key is distinct from case when action='edit' then target_key else null end and starts_at<end_time and ends_at>start_time) then raise exception '다른 유니온 레이드 일정과 겹칩니다.'; end if;
    if action='create' then
      insert into public.union_raid_schedules(raid_key,round,starts_at,ends_at) values('union-'||round_number,round_number,start_time,end_time);
    else
      update public.union_raid_schedules set starts_at=start_time,ends_at=end_time where raid_key=target_key;
    end if;
  elsif action='start' then
    select * into candidate from public.union_raid_schedules where raid_key=target_key and status='scheduled';
    if not found then raise exception '개시할 예약이 없습니다.'; end if;
    if exists(select 1 from public.union_raid_schedules where raid_key<>target_key and status in ('scheduled','active') and starts_at<candidate.ends_at and ends_at>now()) then raise exception '다른 유니온 레이드 일정과 겹칩니다.'; end if;
    update public.union_raid_schedules set starts_at=now(),status='active' where raid_key=target_key;
  elsif action='end' then
    update public.union_raid_schedules set status='completed',ends_at=now() where raid_key=target_key and status='active';
    if not found then raise exception '진행 중인 회차가 없습니다.'; end if;
  elsif action<>'process' then raise exception '지원하지 않는 작업입니다.';
  end if;
  if not exists(select 1 from public.union_raid_schedules where status='active') then
    select * into candidate from public.union_raid_schedules where status='scheduled' and starts_at<=now() and ends_at>now() order by starts_at limit 1;
    if found then update public.union_raid_schedules set status='active' where raid_key=candidate.raid_key; end if;
  end if;
  select raid_key into active_key from public.union_raid_schedules where status='active';
  update public.app_config set active_union_raid_key=active_key where active_union_raid_key is distinct from active_key;
end $$;
revoke all on function public.manage_union_raid(text,text,integer,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.manage_union_raid(text,text,integer,timestamptz,timestamptz) to service_role;
