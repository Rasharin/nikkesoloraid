"use client";
import { memo, useCallback, useEffect, useState } from 'react';
import { validateUnionSchedule, type UnionSchedule } from '../../../lib/union-raid';
function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0,16);
}
const field = 'min-w-0 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)]';
export default memo(function UnionRaidManager() {
  const [schedules, setSchedules] = useState<UnionSchedule[]>([]);
  const [editing, setEditing] = useState<UnionSchedule | null>(null);
  const [round, setRound] = useState('1');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/union-raids', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSchedules(data.schedules);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : '일정 조회 실패'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(action: string, schedule?: UnionSchedule) {
    if (busy) return;
    if (action === 'create' || action === 'edit') {
      const reason = validateUnionSchedule(Number(round), start, end);
      if (reason) { setMessage(reason); return; }
    }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/union-raids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        action, raidKey: schedule?.raid_key ?? editing?.raid_key,
        ...(['create','edit'].includes(action) ? { round: Number(round), startsAt: editing?.status === 'active' ? editing.starts_at : new Date(start).toISOString(), endsAt: new Date(end).toISOString() } : {}),
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEditing(null); setStart(''); setEnd('');
      setMessage('반영했습니다.'); await load();
      window.dispatchEvent(new Event('union-raid-changed'));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : '처리 실패'); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-4">
    <h3 className="font-semibold">유레 관리</h3>
    <form onSubmit={event => { event.preventDefault(); void submit(editing ? 'edit' : 'create'); }} className="grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm">회차<input aria-label="유니온 레이드 회차" type="number" min="1" step="1" required disabled={busy || Boolean(editing)} value={round} onChange={e => setRound(e.target.value)} className={field}/></label>
      <label className="flex flex-col gap-1 text-sm">시작 일시<input aria-label="유니온 시작 일시" type="datetime-local" required disabled={busy || editing?.status === 'active'} value={start} onChange={e => setStart(e.target.value)} className={field}/></label>
      <label className="flex flex-col gap-1 text-sm">종료 일시<input aria-label="유니온 종료 일시" type="datetime-local" required disabled={busy} value={end} onChange={e => setEnd(e.target.value)} className={field}/></label>
      <button disabled={busy} className={field}>{editing ? '수정 저장' : '예약 등록'}</button>
      {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setStart(''); setEnd(''); }} className={field}>수정 취소</button>}
    </form>
    <p role="status" className="text-sm text-[var(--theme-text-soft)]">{message}</p>
    {schedules.length === 0 && <p className="text-sm">등록된 유니온 레이드가 없습니다.</p>}
    {schedules.map(schedule => <div key={schedule.raid_key} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] p-3">
      <div className="mr-auto"><strong>{schedule.round}차 유니온 레이드</strong><p className="text-xs text-[var(--theme-text-soft)]">{new Date(schedule.starts_at).toLocaleString('ko-KR')} ~ {new Date(schedule.ends_at).toLocaleString('ko-KR')}</p></div>
      <span className="text-sm">{{ scheduled: '예약', active: '진행 중', completed: '종료' }[schedule.status]}</span>
      {schedule.status !== 'completed' && <button disabled={busy} className={field} onClick={() => { setEditing(schedule); setRound(String(schedule.round)); setStart(localDate(schedule.starts_at)); setEnd(localDate(schedule.ends_at)); }}>수정</button>}
      {schedule.status === 'scheduled' && <button disabled={busy} className={field} onClick={() => void submit('start', schedule)}>개시</button>}
      {schedule.status === 'active' && <button disabled={busy} className={field} onClick={() => void submit('end', schedule)}>종료</button>}
    </div>)}
  </div>;
});
