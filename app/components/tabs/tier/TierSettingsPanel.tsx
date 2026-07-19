"use client";

import {
  DEFAULT_TIER_COLORS,
  TIER_ROW_MAX,
  TIER_ROW_MIN,
  getDefaultTierColor,
  type TierRow,
} from "../../../../lib/nikke-tier";
import type { TierCardSize } from "../../../../lib/tier-local-layout";

type TierSettingsPanelProps = {
  rows: TierRow[];
  cardSize: TierCardSize;
  onChange: (rows: TierRow[]) => void;
  onCardSizeChange: (size: TierCardSize) => void;
  onClearAssignments: () => void;
  onResetAll: () => void;
  onResetLocalLayout: () => void;
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
  cardSize,
  onChange,
  onCardSizeChange,
  onClearAssignments,
  onResetAll,
  onResetLocalLayout,
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
          <h3 className="font-semibold text-[var(--text)]">설정</h3>
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

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--theme-panel)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-[var(--text)]">니케 카드 크기</span>
          <div role="group" aria-label="니케 카드 크기" className="flex gap-1">
            {([
              ["small", "작게"],
              ["default", "기본"],
              ["large", "크게"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onCardSizeChange(value)}
                aria-pressed={cardSize === value}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  cardSize === value
                    ? "border-cyan-400 bg-cyan-500/15 text-cyan-200"
                    : "border-[var(--border)] text-[var(--theme-text-soft)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onResetLocalLayout}
          className="mt-3 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--theme-text-soft)] transition hover:border-cyan-400"
        >
          화면 크기 설정 초기화
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

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("배치된 니케 목록을 모두 초기화할까요?")) onClearAssignments();
          }}
          className="rounded-xl border border-amber-500/40 px-3 py-2 text-sm text-amber-600 transition hover:bg-amber-500/10 dark:text-amber-300"
        >
          목록 초기화
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("티어 설정과 니케 목록을 모두 기본값으로 초기화할까요?")) onResetAll();
          }}
          className="rounded-xl border border-red-500/40 px-3 py-2 text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
        >
          전부 초기화
        </button>
      </div>

      <div className="sr-only">{DEFAULT_TIER_COLORS.join(",")}</div>
    </div>
  );
}
