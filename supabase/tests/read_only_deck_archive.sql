-- Run after 20261111000000_read_only_deck_archive.sql.
-- All fixtures roll back; failures abort the transaction.
begin;

insert into auth.users(id)
values
  ('f32c5323-438b-4637-8447-993001234101'),
  ('f32c5323-438b-4637-8447-993001234102');

set local role service_role;
insert into public.decks(id,user_id,raid_key,deck_key,chars,score,note)
values(
  'f32c5323-438b-4637-8447-993001234111',
  'f32c5323-438b-4637-8447-993001234101',
  'archive-test',
  'A|B|C|D|E',
  array['A','B','C','D','E'],
  100,
  'owner only'
);
insert into public.union_raid_schedules(raid_key,round,starts_at,ends_at,status)
values('union-999981',999981,now()-interval '2 days',now()-interval '1 day','completed');
insert into public.union_raid_decks(id,user_id,raid_key,page_id,row_index,deck_id,chars,score,note)
values(
  'f32c5323-438b-4637-8447-993001234112',
  'f32c5323-438b-4637-8447-993001234101',
  'union-999981',
  1,
  0,
  1,
  array['A','B','C','D','E'],
  100,
  'owner only'
);

set local role authenticated;
set local request.jwt.claim.sub='f32c5323-438b-4637-8447-993001234101';
do $$
begin
  if (select count(*) from public.decks where id='f32c5323-438b-4637-8447-993001234111') <> 1 then
    raise exception 'Owner cannot read solo deck';
  end if;
  if (select count(*) from public.union_raid_decks where id='f32c5323-438b-4637-8447-993001234112') <> 1 then
    raise exception 'Owner cannot read union deck';
  end if;
  if (select count(*) from public.union_raid_schedules where raid_key='union-999981') <> 1 then
    raise exception 'Authenticated owner cannot read union label';
  end if;

  begin
    insert into public.decks(user_id,raid_key,deck_key,chars,score)
    values('f32c5323-438b-4637-8447-993001234101','blocked','A|B|C|D|E',array['A','B','C','D','E'],1);
    raise exception 'Authenticated insert was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.decks set score=200 where id='f32c5323-438b-4637-8447-993001234111';
    raise exception 'Authenticated update was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.union_raid_decks where id='f32c5323-438b-4637-8447-993001234112';
    raise exception 'Authenticated delete was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.manage_union_raid('process');
    raise exception 'Authenticated RPC execution was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;
end $$;

set local request.jwt.claim.sub='f32c5323-438b-4637-8447-993001234102';
do $$
begin
  if exists(select 1 from public.decks where id='f32c5323-438b-4637-8447-993001234111') then
    raise exception 'Cross-owner solo read was allowed';
  end if;
  if exists(select 1 from public.union_raid_decks where id='f32c5323-438b-4637-8447-993001234112') then
    raise exception 'Cross-owner union read was allowed';
  end if;
end $$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.decks;
    raise exception 'Anonymous solo read was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.union_raid_decks;
    raise exception 'Anonymous union read was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.union_raid_schedules;
    raise exception 'Anonymous schedule read was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.manage_union_raid('process');
    raise exception 'Anonymous RPC execution was allowed' using errcode='XX000';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'read-only deck archive grants, RLS, and RPC lockdown: PASS' as result;
rollback;
