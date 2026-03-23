"use client";

import { useState } from "react";

type ContactTabProps = {
  onSubmitInquiry: (payload: { content: string }) => Promise<boolean>;
};

export default function ContactTab({ onSubmitInquiry }: ContactTabProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (saving) return;

    setSaving(true);
    try {
      const saved = await onSubmitInquiry({ content });
      if (!saved) return;
      setContent("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold">문의하기</h2>
      <div className="mt-1 text-sm text-neutral-400">
        불편한 점이나 추가했으면 하는 기능을 남겨주세요. 마스터 계정 마이페이지에서 확인합니다.
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="예) 특정 니케 별칭 추가 요청, UI 개선 의견, 버그 제보"
        disabled={saving}
        className="mt-4 h-40 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm outline-none disabled:opacity-60"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-neutral-500">로그인 없이도 전송할 수 있어요.</div>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving}
          className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? "전송 중..." : "문의 보내기"}
        </button>
      </div>
    </section>
  );
}
