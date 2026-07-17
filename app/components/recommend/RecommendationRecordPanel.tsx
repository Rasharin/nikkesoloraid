"use client";

import { memo, useCallback, useEffect, useState } from "react";

export type RecommendationSourceRecord = {
  id: string;
  userId: string;
  userLabel: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  hidden: boolean;
  blocked: boolean;
};

type Props = {
  raidKey: string;
  deckKey: string;
  fmt: (value: number) => string;
  onChanged: () => void;
  localPreview?: boolean;
};

function RecommendationRecordPanelContent({ raidKey, deckKey, fmt, onChanged, localPreview = false }: Props) {
  const [records, setRecords] = useState<RecommendationSourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scoreText, setScoreText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (localPreview) {
        setRecords((current) => current.length > 0 ? current : [{
          id: `local-preview-${deckKey}`,
          userId: "local-preview-user",
          userLabel: "local-preview@example.com",
          score: 123456789,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          hidden: false,
          blocked: false,
        }]);
        return;
      }
      const response = await fetch(
        `/api/admin/recommendations?raidKey=${encodeURIComponent(raidKey)}&deckKey=${encodeURIComponent(deckKey)}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      if (!response.ok) throw new Error(`records failed: ${response.status}`);
      const payload = (await response.json()) as { records?: RecommendationSourceRecord[] };
      setRecords(payload.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [deckKey, localPreview, raidKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(record: RecommendationSourceRecord, action: "hide" | "update_score" | "delete" | "block_user") {
    if (busyId) return;
    if (action === "delete" && !window.confirm("이 저장 덱을 영구 삭제하시겠습니까?")) return;
    if (action === "block_user" && !window.confirm("이 사용자의 기존 및 향후 데이터를 추천에서 차단하시겠습니까?")) return;
    setBusyId(record.id);
    try {
      if (localPreview) {
        if (action === "delete") {
          setRecords((current) => current.filter((item) => item.id !== record.id));
        } else if (action === "hide") {
          setRecords((current) => current.map((item) => item.id === record.id ? { ...item, hidden: true } : item));
        } else if (action === "block_user") {
          setRecords((current) => current.map((item) => item.userId === record.userId ? { ...item, blocked: true } : item));
        } else {
          const score = Number(scoreText);
          if (!Number.isSafeInteger(score) || score <= 0) return;
          setRecords((current) => current.map((item) => item.id === record.id ? { ...item, score, hidden: false } : item));
        }
        setEditingId(null);
        setScoreText("");
        onChanged();
        return;
      }
      const response = await fetch("/api/admin/recommendations", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          deckId: record.id,
          ...(action === "update_score" ? { score: scoreText } : {}),
        }),
      });
      if (!response.ok) throw new Error(`moderation failed: ${response.status}`);
      setEditingId(null);
      setScoreText("");
      await load();
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="rounded-xl border border-neutral-800 p-3 text-xs text-neutral-400">기록을 불러오는 중입니다.</div>;

  return (
    <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
      <div className="text-sm font-semibold text-sky-100">추천 적용 기록 {records.length}건</div>
      {localPreview ? <div className="text-[11px] text-amber-300">로컬 미리보기 · 서버에 반영되지 않습니다.</div> : null}
      {records.length === 0 ? <div className="text-xs text-neutral-400">적용된 원본 데이터가 없습니다.</div> : null}
      {records.map((record) => (
        <div key={record.id} className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs text-neutral-300">{record.userLabel}</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-neutral-100">{fmt(record.score)}</div>
              <div className="mt-1 text-[11px] text-neutral-500">{new Date(record.createdAt).toLocaleString("ko-KR")}</div>
              {record.hidden ? <span className="mr-1 text-[11px] text-amber-300">숨김</span> : null}
              {record.blocked ? <span className="text-[11px] text-red-300">차단 유저</span> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <button disabled={Boolean(busyId) || record.hidden} onClick={() => void act(record, "hide")} className="rounded-lg border border-amber-500/40 px-2.5 py-1.5 text-xs text-amber-200 disabled:opacity-40">숨김</button>
              <button disabled={Boolean(busyId)} onClick={() => { setEditingId(record.id); setScoreText(String(record.score)); }} className="rounded-lg border border-sky-500/40 px-2.5 py-1.5 text-xs text-sky-200">수정</button>
              <button disabled={Boolean(busyId) || record.blocked} onClick={() => void act(record, "block_user")} className="rounded-lg border border-red-500/40 px-2.5 py-1.5 text-xs text-red-200 disabled:opacity-40">차단</button>
              <button disabled={Boolean(busyId)} onClick={() => void act(record, "delete")} className="rounded-lg border border-neutral-600 px-2.5 py-1.5 text-xs text-neutral-300">삭제</button>
            </div>
          </div>
          {editingId === record.id ? (
            <div className="mt-2 flex gap-2">
              <input value={scoreText} onChange={(event) => setScoreText(event.target.value.replace(/[^\d]/g, ""))} className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none" />
              <button disabled={!scoreText || Boolean(busyId)} onClick={() => void act(record, "update_score")} className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">저장</button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default memo(RecommendationRecordPanelContent);
