import { NextResponse } from 'next/server';
import { createScheduleAdminClient, getScheduleServerEnv, getScheduleMasterContext } from '../admin/solo-raid-schedules/schedule-server';
import { validateUnionSchedule } from '../../../lib/union-raid';
export const dynamic = 'force-dynamic';

export async function GET() {
  const env = getScheduleServerEnv();
  if (!env) return NextResponse.json({ error: '서버 설정을 확인해주세요.' }, { status: 503 });
  const admin = createScheduleAdminClient(env);
  const processed = await admin.rpc('manage_union_raid', { action: 'process' });
  if (processed.error) return NextResponse.json({ error: '유니온 레이드 일정을 불러오지 못했습니다.' }, { status: 503 });
  const { data, error } = await admin.from('union_raid_schedules').select('raid_key,round,starts_at,ends_at,status').order('round', { ascending: false });
  if (error) return NextResponse.json({ error: '유니온 레이드 조회 실패' }, { status: 500 });
  return NextResponse.json({ schedules: data, activeUnionRaidKey: data?.find(row => row.status === 'active')?.raid_key ?? null });
}

export async function POST(request: Request) {
  const context = await getScheduleMasterContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const body = await request.json().catch(() => null);
  if (!body || !['create','edit','start','end'].includes(body.action)) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  if (['create','edit'].includes(body.action)) {
    const reason = validateUnionSchedule(body.round, body.startsAt, body.endsAt);
    if (reason) return NextResponse.json({ error: reason }, { status: 400 });
  }
  if (body.action !== 'create' && (typeof body.raidKey !== 'string' || !/^union-\d+$/.test(body.raidKey))) return NextResponse.json({ error: '회차를 확인해주세요.' }, { status: 400 });
  const { error } = await context.admin.rpc('manage_union_raid', {
    action: body.action, target_key: body.raidKey ?? null, round_number: body.round ?? null,
    start_time: body.startsAt ?? null, end_time: body.endsAt ?? null,
  });
  if (error) return NextResponse.json({ error: error.code === 'P0001' ? error.message : '저장에 실패했습니다. 회차 중복과 입력값을 확인해주세요.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
