"use client";

import { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatModeratedDeckSummary,
  RECOMMENDATION_MODERATION_NOTICE,
  shouldPersistNoticeAcknowledgement,
} from "../../../lib/recommendation-moderation";

type Notice = {
  id: string;
  message: string;
  deckChars: string[];
  deckScore: number | null;
};

const LOCAL_NOTICE_ACK_KEY = "soloraid_local_moderation_notice_ack_v3";

function RecommendationModerationNoticeContent({
  userId,
  localPreview = false,
}: {
  userId: string | null;
  localPreview?: boolean;
}) {
  const router = useRouter();
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(() => {
    if (!localPreview || typeof window === "undefined") return null;
    try {
      if (localStorage.getItem(LOCAL_NOTICE_ACK_KEY) === "true") return null;
    } catch {}
    return {
      id: "local-preview",
      message: RECOMMENDATION_MODERATION_NOTICE,
      deckChars: ["라피", "나유타", "헬름", "레이븐", "이브"],
      deckScore: 30_000_000_000,
    };
  });

  useEffect(() => {
    if (!userId || localPreview) return;
    let cancelled = false;
    void fetch("/api/recommendation-notices", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() : { notice: null })
      .then((payload: { notice?: Notice | null }) => {
        if (!cancelled) setNotice(payload.notice ?? null);
      });
    return () => { cancelled = true; };
  }, [localPreview, userId]);

  if ((!userId && !localPreview) || !notice) return null;

  const hasDeckDetails =
    notice.deckChars.length > 0 &&
    notice.deckScore !== null &&
    Number.isFinite(notice.deckScore);

  async function closeNotice(): Promise<boolean> {
    const persistAcknowledgement = shouldPersistNoticeAcknowledgement(doNotShowAgain);

    if (!persistAcknowledgement) {
      setNotice(null);
      return true;
    }

    if (localPreview) {
      try {
        localStorage.setItem(LOCAL_NOTICE_ACK_KEY, "true");
      } catch {}
      setNotice(null);
      return true;
    }

    const response = await fetch("/api/recommendation-notices", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notice?.id }),
    });
    if (!response.ok) return false;
    setNotice(null);
    return true;
  }

  async function moveToSavedDeck() {
    const closed = await closeNotice();
    if (closed) router.push("/saved-deck");
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="추천 조합 적용 안내">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-neutral-950 p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-neutral-100">추천 조합 적용 안내</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-300">{notice.message}</p>
        {hasDeckDetails ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="text-xs font-semibold text-amber-200 light:text-black">숨김 조치 덱</div>
            <div className="mt-2 break-words text-sm font-medium text-neutral-100">
              {formatModeratedDeckSummary(notice.deckChars, notice.deckScore!)}
            </div>
          </div>
        ) : null}
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={doNotShowAgain}
            onChange={(event) => setDoNotShowAgain(event.target.checked)}
            className="h-4 w-4 rounded border-neutral-600"
          />
          다시 보지 않기
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void moveToSavedDeck()} className="rounded-xl border border-neutral-600 px-4 py-2.5 text-sm font-semibold text-neutral-200">
            수정하기
          </button>
          <button type="button" onClick={() => void closeNotice()} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(RecommendationModerationNoticeContent);
