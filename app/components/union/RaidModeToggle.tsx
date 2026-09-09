"use client";
import { memo } from 'react';
import type { RaidMode } from '../../../lib/union-raid';
export default memo(function RaidModeToggle({ mode, onChange }: { mode: RaidMode; onChange: (mode: RaidMode) => void }) {
  return <div className="flex gap-2" aria-label="레이드 종류">
    {(['solo', 'union'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value}
      onClick={() => onChange(value)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${mode === value ? 'border-cyan-400/60 bg-cyan-400/15 text-[var(--text)]' : 'border-[var(--border)] text-[var(--theme-text-soft)]'}`}>
      {value === 'solo' ? '솔로레이드' : '유니온 레이드'}
    </button>)}
  </div>;
});
