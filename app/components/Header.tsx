"use client";

import { memo } from "react";
import Link from "next/link";
import LoginButton from "./LoginButton";

type TabKey = "home" | "saved" | "recommend" | "imaginary" | "usage" | "calculator" | "settings" | "contact" | "mypage";

type HeaderProps = {
  tab: TabKey;
  shouldShowCalculator: boolean;
  onTabChange: (tab: Exclude<TabKey, "mypage">) => void;
  onProfileClick: () => void;
};

function HomeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3h12l2 2v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 3v6h8V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecommendIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeckBuildingIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M4 5h6v6H4V5ZM14 5h6v6h-6V5ZM4 15h6v4H4v-4ZM14 15h6v4h-6v-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7.5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12h2M14 12h2M8 16h2M14 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NikkeManagementIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5c2.8 2.2 4.2 4.6 4.2 7.2A4.2 4.2 0 0 1 12 15a4.2 4.2 0 0 1-4.2-4.3C7.8 8.1 9.2 5.7 12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M6 20c1.3-2 3.3-3 6-3s4.7 1 6 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsageIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4H12v14H6.5A2.5 2.5 0 0 0 4 20.5v-14Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M20 6.5A2.5 2.5 0 0 0 17.5 4H12v14h5.5a2.5 2.5 0 0 1 2.5 2.5v-14Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeaderContent({ tab, shouldShowCalculator, onTabChange, onProfileClick }: HeaderProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 bg-[var(--bg)] px-4 py-3.5 backdrop-blur lg:-mx-8 lg:px-8 lg:py-4">
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        <div className="flex flex-col items-start">
          <Link
            href="/"
            onClick={() => onTabChange("home")}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-nideck.png" alt="니케 솔로레이드 덱 도우미" className="h-16 w-auto object-contain lg:h-20" />
          </Link>
          <h1 className="sr-only">니케(NIKKE) 솔로레이드(솔레) 덱</h1>
          <p className="sr-only">덱 조합, 추천, 기록, 솔로레이드 시즌별 기록, 솔레 팁</p>
        </div>

        <div className={`grid gap-1.5 px-1 lg:mx-auto lg:w-full ${shouldShowCalculator ? "grid-cols-8 lg:max-w-5xl" : "grid-cols-7 lg:max-w-4xl"}`}>
          <button
            onClick={() => onTabChange("home")}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
              tab === "home" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <HomeIcon />
            <div>홈</div>
          </button>

          <button
            onClick={() => onTabChange("saved")}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
              tab === "saved" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <SaveIcon />
            <div>저장된 덱</div>
          </button>

          <button
            onClick={() => onTabChange("recommend")}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
              tab === "recommend" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <RecommendIcon />
            <div>추천</div>
          </button>

          <button
            onClick={() => onTabChange("imaginary")}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
              tab === "imaginary" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <DeckBuildingIcon />
            <div>덱 빌딩</div>
          </button>

          <button
            onClick={() => onTabChange("usage")}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
              tab === "usage" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <UsageIcon />
            <div>사용법</div>
          </button>

          {shouldShowCalculator && (
            <button
              onClick={() => onTabChange("calculator")}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
                tab === "calculator" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
              }`}
            >
              <CalculatorIcon />
              <div>계산기</div>
            </button>
          )}

          <button
            onClick={() => onTabChange("settings")}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
              tab === "settings" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <NikkeManagementIcon />
            <div>니케 관리</div>
          </button>

          <button
            onClick={() => onTabChange("contact")}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] transition active:scale-[0.99] lg:text-xs ${
              tab === "contact" ? "bg-[var(--card)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--theme-text-soft)]"
            }`}
          >
            <ContactIcon />
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
