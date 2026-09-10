"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { parseScoreInput } from '../../lib/score-format';
import { UNION_SEASON_OFF_KEY, unionDeckStorageTarget, type UnionDeckPayload, type UnionSchedule } from '../../lib/union-raid';

type UnionDeckRow = {
  id: string; user_id: string; raid_key: string; page_id: number; row_index: number; deck_id: number;
  chars: string[]; score: number; note: string; element: string | null; created_at: string;
};
export function useUnionRaid(userId: string | null, enabled: boolean, notify: (message: string) => void) {
  const [schedules, setSchedules] = useState<UnionSchedule[]>([]);
  const [rows, setRows] = useState<UnionDeckRow[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const activeUnionRaidKey = schedules.find(schedule => schedule.status === 'active' && Date.parse(schedule.ends_at) > Date.now())?.raid_key ?? null;
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const response = await fetch('/api/union-raids', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '유니온 레이드 조회 실패');
      const decks = userId ? await supabase.from('union_raid_decks').select('*').eq('user_id', userId).order('page_id').order('row_index').order('deck_id') : { data: [], error: null };
      if (decks.error) throw new Error('저장된 유니온 덱을 불러오지 못했습니다.');
      if (current !== generation.current) return;
      setSchedules(data.schedules);
      setRows((decks.data ?? []) as UnionDeckRow[]);
      setSelectedKey(key => data.schedules.some((s: UnionSchedule) => s.raid_key === key) || key === UNION_SEASON_OFF_KEY ? key : data.activeUnionRaidKey ?? UNION_SEASON_OFF_KEY);
      setError('');
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : '조회 실패');
    }
  }, [userId]);
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
    const changed = () => { void refresh(); };
    window.addEventListener('union-raid-changed', changed);
    window.addEventListener('focus', changed);
    const invalidate = () => { ++generation.current; };
    return () => { invalidate(); clearInterval(timer); window.removeEventListener('union-raid-changed', changed); window.removeEventListener('focus', changed); };
  }, [enabled, refresh]);

  async function save(payload: UnionDeckPayload) {
    if (!userId) { notify('로그인 후 저장해주세요. 작성한 덱은 기기에 보관됩니다.'); return false; }
    const targetRaidKey = unionDeckStorageTarget(activeUnionRaidKey);
    if (!payload.union || payload.draft.length !== 5 || new Set(payload.draft).size !== 5) { notify('서로 다른 니케 5명을 선택해주세요.'); return false; }
    const score = !payload.scoreText.trim() || /^0+(?:\.0+)?$/.test(payload.scoreText.trim()) ? 0 : parseScoreInput(payload.scoreText);
    if (score === null || !Number.isFinite(score) || score < 0) { notify('점수를 확인해주세요.'); return false; }
    const meta = payload.union;
    const { error: failure } = await supabase.from('union_raid_decks').upsert({
      user_id: userId, raid_key: targetRaidKey, page_id: meta.pageId, row_index: meta.rowIndex, deck_id: meta.deckId,
      chars: payload.draft, score, note: payload.note ?? '', element: meta.element,
    }, { onConflict: 'user_id,raid_key,page_id,deck_id' });
    if (failure) { notify('유니온 덱 저장에 실패했습니다. 진행 중인 회차를 확인해주세요.'); await refresh(); return false; }
    notify('유니온 레이드 덱 저장 완료');
    await refresh();
    return true;
  }
  async function update(id: string, changes: { chars?: string[]; score?: number }) {
    if (!userId || (selectedKey !== activeUnionRaidKey && selectedKey !== UNION_SEASON_OFF_KEY)) return false;
    if (changes.chars && (changes.chars.length !== 5 || new Set(changes.chars).size !== 5)) { notify('중복된 니케는 저장할 수 없습니다.'); return false; }
    const result = await supabase.from('union_raid_decks').update(changes).eq('user_id', userId).eq('raid_key', selectedKey).eq('id', id).select('id');
    if (result.error || !result.data?.length) { notify('수정에 실패했습니다.'); return false; }
    await refresh(); return true;
  }
  async function remove(id?: string) {
    if (!userId || (selectedKey !== activeUnionRaidKey && selectedKey !== UNION_SEASON_OFF_KEY)) return;
    let query = supabase.from('union_raid_decks').delete().eq('user_id', userId).eq('raid_key', selectedKey);
    if (id) query = query.eq('id', id);
    const result = await query.select('id');
    if (result.error || !result.data?.length) notify('삭제에 실패했습니다.');
    await refresh();
  }
  async function move(id: string, targetRaidKey: string) {
    if (!userId || !targetRaidKey || targetRaidKey === selectedKey) return false;
    const validTarget = targetRaidKey === UNION_SEASON_OFF_KEY || schedules.some(schedule => schedule.raid_key === targetRaidKey);
    if (!validTarget) { notify('이동할 유니온 레이드를 찾을 수 없습니다.'); return false; }
    const result = await supabase.from('union_raid_decks').update({ raid_key: targetRaidKey }).eq('user_id', userId).eq('raid_key', selectedKey).eq('id', id).select('id');
    if (result.error || !result.data?.length) { notify('유니온 덱 이동에 실패했습니다.'); return false; }
    await refresh();
    notify('유니온 덱 이동 완료');
    return true;
  }
  return {
    schedules, activeUnionRaidKey, selectedKey, setSelectedKey, error, refresh, save, update, remove, move,
    decks: rows.filter(row => row.user_id === userId && row.raid_key === selectedKey).map(row => ({
      id: row.id, raidKey: row.raid_key, deckKey: String(row.deck_id), chars: row.chars, score: Number(row.score), note: row.note,
      createdAt: Date.parse(row.created_at), unionLabel: `${row.page_id}페이지 · ${row.row_index + 1}행${row.element ? ` · ${row.element}` : ''}`,
    })),
  };
}
