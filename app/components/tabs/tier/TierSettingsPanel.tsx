"use client";

import {
  DEFAULT_TIER_COLORS,
  TIER_ROW_MAX,
  TIER_ROW_MIN,
  getDefaultTierColor,
  type TierRow,
} from "../../../../lib/nikke-tier";

type TierSettingsPanelProps = {
  rows: TierRow[];
  onChange: (rows: TierRow[]) => void;
  onClose: () => void;
};

function createTierRow(index: number): TierRow {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `tier-${Date.now()}-${index}`,
    name: `티어 ${index + 1}`,
    color: getDefaultTierColor(index),
    nikkeNames: [],
  };
}

export default function TierSettingsPanel({
  rows,
  onChange,
  onClose,
}: TierSettingsPanelProps) {
  function updateRow(index: number, patch: Partial<TierRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    const nextRows = rows.slice();
    [nextRows[index], nextRows[targetIndex]] = [nextRows[targetIndex], nextRows[index]];
    onChange(nextRows);
  }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--text)]">티어 설정</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">줄 이름, 순서와 색상을 변경할 수 있습니다.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--theme-text-soft)]"
        >
          닫기
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--theme-panel)] p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <input
              value={row.name}
              onChange={(event) => updateRow(index, { name: event.target.value })}
              aria-label={`${index + 1}번째 줄 이름`}
              className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-cyan-400"
            />

            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5">
              <input
                type="color"
                value={row.color}
                onChange={(event) => updateRow(index, { color: event.target.value })}
                aria-label={`${row.name} 색상`}
                className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="w-16 text-xs tabular-nums text-[var(--muted)]">
                {row.color.toUpperCase()}
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-1">
              <button
                type="button"
                onClick={() => moveRow(index, -1)}
                disabled={index === 0}
                aria-label={`${row.name} 위로 이동`}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveRow(index, 1)}
                disabled={index === rows.length - 1}
                aria-label={`${row.name} 아래로 이동`}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                disabled={rows.length <= TIER_ROW_MIN}
                aria-label={`${row.name} 줄 삭제`}
                className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 disabled:opacity-30"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...rows, createTierRow(rows.length)])}
        disabled={rows.length >= TIER_ROW_MAX}
        className="mt-3 w-full rounded-xl border border-dashed border-cyan-500/50 px-3 py-2 text-sm text-cyan-200 disabled:opacity-30"
      >
        줄 추가 ({rows.length}/{TIER_ROW_MAX})
      </button>

      <div className="sr-only">{DEFAULT_TIER_COLORS.join(",")}</div>
    </div>
  );
}
