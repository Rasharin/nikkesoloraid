"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  createDefaultTierBoard,
  normalizeTierBoard,
  type TierBoardData,
} from "../../../lib/nikke-tier";
import TierBoard from "./tier/TierBoard";
import type { TierFilterOption, TierNikkeRow } from "./tier/TierNikkeCatalog";

type TierTabProps = {
  nikkes: TierNikkeRow[];
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  bursts: readonly { readonly n: number; readonly label: string }[];
  elements: readonly TierFilterOption[];
  roles: readonly TierFilterOption[];
};

type TierBoardResponse = {
  board?: unknown;
  canEdit?: unknown;
  error?: unknown;
};

const LOCAL_TIER_PREVIEW_KEY = "soloraid_nikke_tier_preview_v1";

function TierTabContent({
  nikkes,
  getPublicUrl,
  bursts,
  elements,
  roles,
}: TierTabProps) {
  const localPreview = process.env.NODE_ENV !== "production";
  const [board, setBoard] = useState<TierBoardData>(() => createDefaultTierBoard());
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerBoardRef = useRef<TierBoardData>(createDefaultTierBoard());
  const pendingBoardRef = useRef<TierBoardData | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    async function loadBoard() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/tier-board", {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as TierBoardResponse;
        if (!response.ok) {
          throw new Error(typeof payload.error === "string" ? payload.error : "티어 정보를 불러오지 못했습니다.");
        }
        const serverBoard = normalizeTierBoard(payload.board);
        lastServerBoardRef.current = serverBoard;
        let nextBoard = serverBoard;
        if (localPreview) {
          try {
            const storedBoard = window.localStorage.getItem(LOCAL_TIER_PREVIEW_KEY);
            if (storedBoard) nextBoard = normalizeTierBoard(JSON.parse(storedBoard));
          } catch { }
        }
        setBoard(nextBoard);
        setCanEdit(localPreview || payload.canEdit === true);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        if (localPreview) {
          let localBoard = createDefaultTierBoard();
          try {
            const storedBoard = window.localStorage.getItem(LOCAL_TIER_PREVIEW_KEY);
            if (storedBoard) localBoard = normalizeTierBoard(JSON.parse(storedBoard));
          } catch { }
          setBoard(localBoard);
          setCanEdit(true);
        } else {
          setError(loadError instanceof Error ? loadError.message : "티어 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadBoard();
    return () => {
      mountedRef.current = false;
      controller.abort();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nikkes, localPreview]);

  function queueSave(nextBoard: TierBoardData) {
    pendingBoardRef.current = nextBoard;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        const boardToSave = pendingBoardRef.current;
        pendingBoardRef.current = null;
        if (!boardToSave || !mountedRef.current) return;
        setSaving(true);
        setError("");

        try {
          const response = await fetch("/api/tier-board", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionName: boardToSave.sectionName,
              rows: boardToSave.rows,
              expectedUpdatedAt: lastServerBoardRef.current.updatedAt,
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as TierBoardResponse;
          if (response.status === 409 && payload.board) {
            const currentBoard = normalizeTierBoard(payload.board);
            lastServerBoardRef.current = currentBoard;
            if (mountedRef.current) {
              setBoard(currentBoard);
              setError("다른 편집자가 먼저 수정했습니다. 최신 내용을 불러왔습니다.");
            }
            return;
          }
          if (!response.ok) {
            throw new Error(typeof payload.error === "string" ? payload.error : "티어 정보를 저장하지 못했습니다.");
          }

          const savedBoard = normalizeTierBoard(payload.board);
          lastServerBoardRef.current = savedBoard;
          if (mountedRef.current && !pendingBoardRef.current) setBoard(savedBoard);
        } catch (saveError) {
          if (mountedRef.current) {
            setBoard(lastServerBoardRef.current);
            setError(saveError instanceof Error ? saveError.message : "티어 정보를 저장하지 못했습니다.");
          }
        } finally {
          if (mountedRef.current) setSaving(false);
          if (pendingBoardRef.current) queueSave(pendingBoardRef.current);
        }
      });
    }, 350);
  }

  function handleChange(nextBoard: TierBoardData) {
    if (!canEdit) return;
    setBoard(nextBoard);
    if (localPreview) {
      try {
        localStorage.setItem(LOCAL_TIER_PREVIEW_KEY, JSON.stringify(nextBoard));
      } catch { }
      return;
    }
    queueSave(nextBoard);
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] p-10 text-center text-sm text-[var(--muted)]">
        니케 티어를 불러오는 중입니다.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {error ? (
        <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      ) : null}
      <TierBoard
        board={board}
        nikkes={nikkes}
        canEdit={canEdit}
        saving={saving}
        onChange={handleChange}
        getPublicUrl={getPublicUrl}
        bursts={bursts}
        elements={elements}
        roles={roles}
      />
    </div>
  );
}

export default memo(TierTabContent);
