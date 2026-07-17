"use client";

import { memo, useEffect, useState } from "react";

type Notice = { id: string; message: string };

function RecommendationModerationNoticeContent({
  userId,
  localPreview = false,
}: {
  userId: string | null;
  localPreview?: boolean;
}) {
  const [notice, setNotice] = useState<Notice | null>(null);

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

  if (!userId || localPreview || !notice) return null;

  async function acknowledge() {
    const response = await fetch("/api/recommendation-notices", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notice?.id }),
    });
    if (response.ok) setNotice(null);
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="추천 조합 적용 안내">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-neutral-950 p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-neutral-100">추천 조합 적용 안내</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-300">{notice.message}</p>
        <button type="button" onClick={() => void acknowledge()} className="mt-5 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">
          확인
        </button>
      </div>
    </div>
  );
}

export default memo(RecommendationModerationNoticeContent);
