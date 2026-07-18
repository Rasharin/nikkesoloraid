"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import LoginButton from "./LoginButton";

type TabKey = "home" | "saved" | "recommend" | "imaginary" | "tier" | "usage" | "settings" | "contact" | "mypage";

type HeaderProps = {
  tab: TabKey;
  onTabChange: (tab: Exclude<TabKey, "mypage">) => void;
  onProfileClick: () => void;
};

function HeaderContent({ tab, onTabChange, onProfileClick }: HeaderProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 bg-[var(--bg)] px-4 py-3.5 backdrop-blur lg:-mx-8 lg:px-8 lg:py-4">
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        <div className="flex flex-col items-start">
          <Link
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onTabChange("home");
            }}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Image src="/logo-nideck.png" alt="니케 솔로레이드 덱 도우미" width={320} height={80} className="h-16 w-auto object-contain lg:h-20" style={{ width: "auto" }} />
          </Link>
          <h1 className="sr-only">니케(NIKKE) 솔로레이드(솔레) 덱</h1>
          <p className="sr-only">덱 조합, 추천, 기록, 솔로레이드 시즌별 기록, 솔레 팁</p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 px-1 sm:grid-cols-8 lg:mx-auto lg:w-full lg:max-w-5xl">
          <button
            onClick={() => onTabChange("home")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "home" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>홈</div>
          </button>

          <button
            onClick={() => onTabChange("saved")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "saved" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>저장된 덱</div>
          </button>

          <button
            onClick={() => onTabChange("recommend")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "recommend" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>추천</div>
          </button>

          <button
            onClick={() => onTabChange("imaginary")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "imaginary" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>덱 빌딩</div>
          </button>

          <button
            onClick={() => onTabChange("tier")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "tier" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>티어</div>
          </button>

          <button
            onClick={() => onTabChange("usage")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "usage" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>사용법</div>
          </button>

          <button
            onClick={() => onTabChange("settings")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "settings" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>니케 관리</div>
          </button>

          <button
            onClick={() => onTabChange("contact")}
            className={`flex min-w-0 items-center justify-center rounded-xl px-1 py-2.5 text-xs font-medium transition active:scale-[0.99] lg:text-sm ${
              tab === "contact" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <div>문의하기</div>
          </button>
        </div>

        <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center">
          <LoginButton onProfileClick={onProfileClick} />
          {process.env.NODE_ENV !== "production" ? (
            <button
              type="button"
              onClick={() => onProfileClick()}
              className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-400 active:scale-[0.99]"
            >
              마이페이지 테스트
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(HeaderContent);
