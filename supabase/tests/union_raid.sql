-- Transactional integration checks. All fixtures and configuration changes roll back.
begin;
create temporary table union_solo_before as select solo_raid_active,solo_raid_tabs,active_raid_key from public.app_config;
insert into auth.users(id) values('f32c5323-438b-4637-8447-993001234001'),('f32c5323-438b-4637-8447-993001234002');
set local role service_role;
select public.manage_union_raid('create',null,999991,now()+interval '1 day',now()+interval '2 days');
do $$ begin
  begin
    perform public.manage_union_raid('create',null,999992,now()+interval '1 day',now()+interval '3 days');
    raise exception 'Overlap was allowed' using errcode='XX000';
  exception when raise_exception then null; end;
end $$;
select public.manage_union_raid('edit','union-999991',999991,now()+interval '2 days',now()+interval '3 days');
select public.manage_union_raid('start','union-999991');
select public.manage_union_raid('edit','union-999991',999991,(select starts_at from public.union_raid_schedules where raid_key='union-999991'),now()+interval '4 days');
reset role;
do $$ begin
  if not exists(select 1 from public.app_config where active_union_raid_key='union-999991') then raise exception 'Active key not set'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='f32c5323-438b-4637-8447-993001234001';
insert into public.union_raid_decks(user_id,raid_key,page_id,row_index,deck_id,chars,score,element) values('f32c5323-438b-4637-8447-993001234001','union-999991',1,0,1,array['A','B','C','D','E'],0,'수냉');
update public.union_raid_decks set score=100 where raid_key='union-999991';
do $$ begin
  if (select count(*) from public.union_raid_decks where raid_key='union-999991' and score=100)<>1 then raise exception 'Owner update failed'; end if;
  begin
    perform public.manage_union_raid('end','union-999991');
    raise exception 'Member called admin RPC' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub='f32c5323-438b-4637-8447-993001234002';
do $$ declare affected integer; begin
  if exists(select 1 from public.union_raid_decks where raid_key='union-999991') then raise exception 'Other user can read'; end if;
  update public.union_raid_decks set score=999 where raid_key='union-999991';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Other user can update'; end if;
  begin
    insert into public.union_raid_decks(user_id,raid_key,page_id,row_index,deck_id,chars,score) values('f32c5323-438b-4637-8447-993001234001','union-999991',1,0,2,array['A','B','C','D','E'],0);
    raise exception 'Spoofed owner accepted' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform 1 from public.union_raid_decks; raise exception 'Anon can read decks' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin perform public.manage_union_raid('process'); raise exception 'Anon can execute RPC' using errcode='XX000'; exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
-- Give immediate end a positive duration inside this single transaction.
update public.union_raid_schedules set starts_at=now()-interval '1 minute' where raid_key='union-999991';
select public.manage_union_raid('end','union-999991');
set local role authenticated;
set local request.jwt.claim.sub='f32c5323-438b-4637-8447-993001234001';
do $$ declare affected integer; begin
  if not exists(select 1 from public.union_raid_decks where raid_key='union-999991') then raise exception 'Archive not readable'; end if;
  delete from public.union_raid_decks where raid_key='union-999991';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Archive writable'; end if;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.app_config where active_union_raid_key is not null) then raise exception 'Active key not cleared'; end if;
  if exists((select solo_raid_active,solo_raid_tabs,active_raid_key from public.app_config) except (select * from union_solo_before)) then raise exception 'Solo config changed'; end if;
end $$;
select 'union lifecycle, overlap, active edit, owner isolation, anonymous access, archive, solo isolation: PASS' as result;
rollback;
