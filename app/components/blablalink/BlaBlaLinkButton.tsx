"use client";

import { useState } from "react";
import Image from "next/image";
import type { BlaBlaLinkIntegration } from "@/lib/blablalink";
import { BLABLALINK_SERVERS, type BlaBlaLinkServerKey } from "@/lib/blablalink/constants";

type Props = {
  integration: BlaBlaLinkIntegration | null;
  disabled?: boolean;
  deckToolbar?: boolean;
  groupedDeckToolbar?: boolean;
  onSynced: (integration: BlaBlaLinkIntegration) => void;
};

export default function BlaBlaLinkButton({ integration, disabled = false, deckToolbar = false, groupedDeckToolbar = false, onSynced }: Props) {
  const [open, setOpen] = useState(false);
  const [server, setServer] = useState<BlaBlaLinkServerKey>(integration?.server ?? "korea");
  const [profileUrl, setProfileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const profileInputUrl = process.env.NEXT_PUBLIC_BLABLALINK_PROFILE_URL?.trim() || "https://www.blablalink.com/user";

  async function sync() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/blablalink", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server, profileUrl }),
      });
      const payload = await response.json().catch(() => ({})) as { integration?: BlaBlaLinkIntegration; error?: string; unmappedCount?: number };
      if (!response.ok || !payload.integration) throw new Error(payload.error ?? "연동에 실패했습니다.");
      onSynced(payload.integration);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "연동에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {deckToolbar ? (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={groupedDeckToolbar
          ? "flex h-full items-center gap-2 border-0 border-l border-[var(--border)] bg-transparent px-3 text-xs font-bold text-[var(--theme-text-soft)] transition hover:bg-[var(--theme-panel)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          : "flex h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 transition hover:border-[var(--theme-border-strong)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"}>
          {!groupedDeckToolbar ? <Image src="/blablalink-icon.png" alt="blablalink" width={24} height={24} className="h-6 w-6 rounded-full object-contain" /> : null}
          <span className="whitespace-nowrap">BlaBlalink 동기화</span>
        </button>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="rounded-xl border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-50">
          {integration ? "블라블라링크 다시 동기화" : "블라블라링크 연동"}
        </button>
      )}
      {open ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="blablalink-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 id="blablalink-dialog-title" className="text-lg font-semibold">블라블라링크 연동</h2>
              <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm">닫기</button>
            </div>
            <label className="mt-5 block text-sm font-medium">서버 선택
              <select value={server} onChange={(event) => setServer(event.target.value as BlaBlaLinkServerKey)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)]">
                {BLABLALINK_SERVERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium">내 프로필 링크
              <input type="text" value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} autoComplete="off" placeholder="프로필 공유 링크 또는 UID 숫자" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2" />
            </label>
            <div className="mt-2 text-xs text-[var(--muted)]">
              내 프로필 입력 링크의 BlaBlalink 주소를 입력 해주세요 &quot;<strong className="font-semibold text-[var(--text)]">프로필과 니케 목록은 공개</strong>&quot; 상태여야 합니다. 연동까지 다소 시간이 걸릴 수 있습니다.
            </div>
            <div className="mt-4 min-h-8 rounded-xl border border-dashed border-[var(--border)] p-2" aria-label="연동 안내 메시지" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {profileInputUrl ? <a href={profileInputUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-300 underline underline-offset-4">내 프로필 입력 링크</a> : <span className="text-sm text-[var(--muted)]">내 프로필 입력 링크</span>}
              <button type="button" disabled={saving || !profileUrl.trim()} onClick={() => void sync()} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">{saving ? "동기화 중…" : "연동 및 동기화"}</button>
            </div>
            {error ? <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
