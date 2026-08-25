"use client";

import type { Best5ChartPoint } from "@/lib/blablalink";

type Props = { points: Best5ChartPoint[]; currentSynchroLevel: number | null; fmt: (value: number) => string; compact?: boolean };

export default function Best5SynchroChart({ points, currentSynchroLevel, fmt, compact = false }: Props) {
  if (points.length === 0) return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-sm font-semibold">싱크로 레벨별 Best 5덱 합계 딜량</h2>
      <div className="mt-2 text-xs text-neutral-400">표시할 실제 저장 데이터가 없습니다.</div>
    </section>
  );
  const width = 640, height = compact ? 170 : 220, padding = 38;
  const minLevel = Math.min(...points.map((point) => point.synchroLevel));
  const maxLevel = Math.max(...points.map((point) => point.synchroLevel));
  const maxTotal = Math.max(...points.map((point) => point.total));
  const x = (level: number) => padding + (maxLevel === minLevel ? 0.5 : (level - minLevel) / (maxLevel - minLevel)) * (width - padding * 2);
  const y = (total: number) => height - padding - total / maxTotal * (height - padding * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(point.synchroLevel)},${y(point.total)}`).join(" ");
  const currentX = currentSynchroLevel !== null && currentSynchroLevel >= minLevel && currentSynchroLevel <= maxLevel ? x(currentSynchroLevel) : null;
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">싱크로 레벨별 Best 5덱 합계 딜량</h2>{currentSynchroLevel ? <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs text-sky-200">내 싱크로 {currentSynchroLevel}</span> : null}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-auto w-full" role="img" aria-label="싱크로 레벨별 Best 5덱 합계 딜량 그래프">
        <path d={`M${padding},${height-padding}H${width-padding}`} stroke="currentColor" className="text-neutral-700" />
        {currentX !== null ? <line x1={currentX} x2={currentX} y1={padding / 2} y2={height-padding} stroke="currentColor" strokeDasharray="5 5" className="text-sky-400" /> : null}
        <path d={path} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" className="text-cyan-400" />
        {points.map((point) => <g key={point.synchroLevel}><circle cx={x(point.synchroLevel)} cy={y(point.total)} r="5" fill="currentColor" className="text-cyan-200"><title>{`싱크로 ${point.synchroLevel}: ${fmt(point.total)}`}</title></circle><text x={x(point.synchroLevel)} y={height-12} textAnchor="middle" className="fill-neutral-400 text-[11px]">{point.synchroLevel}</text></g>)}
      </svg>
    </section>
  );
}
