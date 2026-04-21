"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNikkeDisplayNames } from "../../../lib/nikke-display";
import type { ScoreDisplayMode } from "../../../lib/score-format";

type RecommendationDeck = {
  chars: string[];
  score: number;
};

type RecommendationRecord = {
  raidKey: string;
  raidLabel: string;
  total: number;
  decks: RecommendationDeck[];
  updatedAt: number;
};

type DeckTabItem = {
  readonly key: string;
  readonly label: string;
};

type FilterOption = {
  readonly v: string;
  readonly label: string;
};
type ContactInquiry = {
  id: string;
  content: string;
  userId: string | null;
  createdAt: number;
  source: "remote" | "local";
};

type NikkeElementValue = "iron" | "fire" | "wind" | "water" | "electric" | null;
type NikkeRoleValue = "attacker" | "supporter" | "defender" | null;
type AdminSectionKey = "nikkes" | "bosses" | "video";

type MyPageTabProps = {
  deckTabs: readonly DeckTabItem[];
  isMaster: boolean;
  showBossManagement: boolean;
  recommendationHistory: Record<string, RecommendationRecord>;
  soloRaidActive: boolean;
  onSyncNikkes: () => Promise<void>;
  syncingNikkes: boolean;
  onAddNikke: (payload: {
    name: string;
    burst: number | null;
    element: NikkeElementValue;
    role: NikkeRoleValue;
    aliases: string[];
    imageFile: File | null;
  }) => Promise<boolean>;
  elements: readonly FilterOption[];
  roles: readonly FilterOption[];
  onAddSoloRaid: (payload: {
    title: string;
    description: string;
    imageFile: File | null;
  }) => Promise<boolean>;
  onEndSoloRaid: () => Promise<boolean>;
  onRestartSoloRaid: () => Promise<boolean>;
  recommendedVideoUrl: string;
  onSaveRecommendedVideo: (url: string) => Promise<boolean>;
  inquiries: ContactInquiry[];
  loadingInquiries: boolean;
  showInquirySection: boolean;
  onDeleteInquiry: (id: string) => Promise<boolean>;
  onDeleteAccount: () => Promise<boolean>;
  fmt: (value: number) => string;
  scoreDisplayMode: ScoreDisplayMode;
  onScoreDisplayModeChange: (mode: ScoreDisplayMode) => void;
};

function adminTabClass(active: boolean) {
  return active
    ? "rounded-2xl border border-white bg-white px-3 py-2 text-sm font-medium text-black"
    : "rounded-2xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200";
}

export default function MyPageTab({
  deckTabs,
  isMaster,
  showBossManagement,
  recommendationHistory,
  soloRaidActive,
  onSyncNikkes,
  syncingNikkes,
  onAddNikke,
  elements,
  roles,
  onAddSoloRaid,
  onEndSoloRaid,
  onRestartSoloRaid,
  recommendedVideoUrl,
  onSaveRecommendedVideo,
  inquiries,
  loadingInquiries,
  showInquirySection,
  onDeleteInquiry,
  onDeleteAccount,
  fmt,
  scoreDisplayMode,
  onScoreDisplayModeChange,
}: MyPageTabProps) {
  const [openRaidKey, setOpenRaidKey] = useState<string>("");
  const [adminSection, setAdminSection] = useState<AdminSectionKey>("nikkes");
  const [newRaidName, setNewRaidName] = useState("");
  const [newRaidDescription, setNewRaidDescription] = useState("");
  const [newRaidImageFile, setNewRaidImageFile] = useState<File | null>(null);
  const [raidImageInputKey, setRaidImageInputKey] = useState(0);
  const [savingRaid, setSavingRaid] = useState(false);
  const [endingRaid, setEndingRaid] = useState(false);
  const [restartingRaid, setRestartingRaid] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState(recommendedVideoUrl);
  const [savingVideo, setSavingVideo] = useState(false);
  const [deletingInquiryId, setDeletingInquiryId] = useState<string | null>(null);
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);
  const [accountDeleteText, setAccountDeleteText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState("");
  const inquiryDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const [nikkeName, setNikkeName] = useState("");
  const [nikkeBurst, setNikkeBurst] = useState<number | null>(null);
  const [nikkeElement, setNikkeElement] = useState<NikkeElementValue>(null);
  const [nikkeRole, setNikkeRole] = useState<NikkeRoleValue>(null);
  const [nikkeAliases, setNikkeAliases] = useState("");
  const [nikkeImageFile, setNikkeImageFile] = useState<File | null>(null);
  const [nikkeImageInputKey, setNikkeImageInputKey] = useState(0);
  const [savingNikke, setSavingNikke] = useState(false);

  useEffect(() => {
    if (!deckTabs.some((tab) => tab.key === openRaidKey)) {
      setOpenRaidKey("");
    }
  }, [deckTabs, openRaidKey]);

  useEffect(() => {
    setVideoUrlInput(recommendedVideoUrl);
  }, [recommendedVideoUrl]);

  function toggleRaid(key: string) {
    setOpenRaidKey((prev) => (prev === key ? "" : key));
  }

  async function handleAddSoloRaid() {
    if (savingRaid) return;
    setSavingRaid(true);
    try {
      const saved = await onAddSoloRaid({
        title: newRaidName,
        description: newRaidDescription,
        imageFile: newRaidImageFile,
      });
      if (!saved) return;
      setNewRaidName("");
      setNewRaidDescription("");
      setNewRaidImageFile(null);
      setRaidImageInputKey((prev) => prev + 1);
    } finally {
      setSavingRaid(false);
    }
  }

  async function handleAddNikke() {
    if (savingNikke) return;
    setSavingNikke(true);
    try {
      const saved = await onAddNikke({
        name: nikkeName,
        burst: nikkeBurst,
        element: nikkeElement,
        role: nikkeRole,
        aliases: nikkeAliases
          .split(",")
          .map((alias) => alias.trim())
          .filter((alias, index, list) => alias.length > 0 && list.indexOf(alias) === index),
        imageFile: nikkeImageFile,
      });
      if (!saved) return;
      setNikkeName("");
      setNikkeBurst(null);
      setNikkeElement(null);
      setNikkeRole(null);
      setNikkeAliases("");
      setNikkeImageFile(null);
      setNikkeImageInputKey((prev) => prev + 1);
    } finally {
      setSavingNikke(false);
    }
  }

  async function handleEndSoloRaid() {
    if (endingRaid) return;
    setEndingRaid(true);
    try {
      await onEndSoloRaid();
    } finally {
      setEndingRaid(false);
    }
  }

  async function handleRestartSoloRaid() {
    if (restartingRaid) return;
    setRestartingRaid(true);
    try {
      await onRestartSoloRaid();
    } finally {
      setRestartingRaid(false);
    }
  }

  async function handleSaveRecommendedVideo() {
    if (savingVideo) return;
    setSavingVideo(true);
    try {
      const saved = await onSaveRecommendedVideo(videoUrlInput);
      if (!saved) return;
      setVideoUrlInput((prev) => prev.trim());
    } finally {
      setSavingVideo(false);
    }
  }

  async function handleDeleteInquiry(id: string) {
    if (deletingInquiryId) return;

    setDeletingInquiryId(id);
    try {
      await onDeleteInquiry(id);
    } finally {
      setDeletingInquiryId(null);
    }
  }

  async function handleDeleteAccount() {
    if (deletingAccount || accountDeleteText !== "탈퇴하기") return;

    setDeletingAccount(true);
    setAccountDeleteError("");
    try {
      const deleted = await onDeleteAccount();
      if (!deleted) {
        setAccountDeleteError("탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setAccountDeleteOpen(false);
      setAccountDeleteText("");
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">설정</h2>
            <div className="mt-1 text-sm text-neutral-400">점수 표기 방법을 전체 화면에 바로 적용합니다.</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
          <div>
            <div className="text-sm font-medium text-neutral-100">점수 표기 방법</div>
            <div className="mt-1 text-xs text-neutral-400">기본값은 숫자 표기입니다.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onScoreDisplayModeChange("eok")}
              className={adminTabClass(scoreDisplayMode === "eok")}
            >
              00억
            </button>
            <button
              type="button"
              onClick={() => onScoreDisplayModeChange("number")}
              className={adminTabClass(scoreDisplayMode === "number")}
            >
              숫자 표기
            </button>
          </div>
        </div>
      </section>

      {showBossManagement ? (
        <section className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">마스터 관리</h2>
            {isMaster ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300">
                마스터 계정
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                로그인 테스트
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setAdminSection("nikkes")} className={adminTabClass(adminSection === "nikkes")}>
              니케 관리
            </button>
            <button type="button" onClick={() => setAdminSection("bosses")} className={adminTabClass(adminSection === "bosses")}>
              보스 관리
            </button>
            <button type="button" onClick={() => setAdminSection("video")} className={adminTabClass(adminSection === "video")}>
              추천 영상
            </button>
          </div>

          {adminSection === "nikkes" ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-100">1. 이미지 버킷 동기화</div>
                    <div className="mt-1 text-xs text-neutral-400">
                      `nikke-images` 버킷에 있는 파일들을 니케 테이블에 자동 등록합니다.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onSyncNikkes()}
                    disabled={syncingNikkes}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {syncingNikkes ? "동기화 중..." : "이미지 동기화"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="text-sm font-medium text-neutral-100">2. 니케 등록/수정</div>
                <div className="mt-2 space-y-2">
                  <input
                    value={nikkeName}
                    onChange={(event) => setNikkeName(event.target.value)}
                    placeholder="니케 이름"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />

                  <input
                    value={nikkeAliases}
                    onChange={(event) => setNikkeAliases(event.target.value)}
                    placeholder="aliases (comma separated)"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={nikkeBurst ?? ""}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setNikkeBurst(Number.isFinite(value) && value > 0 ? value : null);
                      }}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                    >
                      <option value="">버스트</option>
                      <option value="1">I</option>
                      <option value="2">II</option>
                      <option value="3">III</option>
                    </select>

                    <select
                      value={nikkeElement ?? ""}
                      onChange={(event) => setNikkeElement((event.target.value || null) as NikkeElementValue)}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                    >
                      <option value="">속성</option>
                      {elements.map((element) => (
                        <option key={element.v} value={element.v}>
                          {element.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={nikkeRole ?? ""}
                      onChange={(event) => setNikkeRole((event.target.value || null) as NikkeRoleValue)}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                    >
                      <option value="">역할</option>
                      {roles.map((role) => (
                        <option key={role.v} value={role.v}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    key={nikkeImageInputKey}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setNikkeImageFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-neutral-400">
                      {nikkeImageFile ? `선택된 이미지: ${nikkeImageFile.name}` : "니케 이미지 파일을 선택해주세요"}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddNikke()}
                      disabled={savingNikke}
                      className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                    >
                      {savingNikke ? "저장 중..." : "니케 저장"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {adminSection === "bosses" ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="text-sm font-medium text-neutral-100">1. 솔로레이드 보스 추가</div>
                <div className="mt-2 space-y-2">
                  <input
                    value={newRaidName}
                    onChange={(event) => setNewRaidName(event.target.value)}
                    placeholder="보스 이름"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />
                  <textarea
                    value={newRaidDescription}
                    onChange={(event) => setNewRaidDescription(event.target.value)}
                    placeholder="보스 설명"
                    className="h-24 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />
                  <input
                    key={raidImageInputKey}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setNewRaidImageFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-neutral-400">
                      {newRaidImageFile ? `선택된 이미지: ${newRaidImageFile.name}` : "보스 이미지 파일을 선택해주세요"}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddSoloRaid()}
                      disabled={savingRaid}
                      className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                    >
                      {savingRaid ? "저장 중..." : "보스 추가"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-100">2. 솔로레이드 종료</div>
                    <div className="mt-1 text-xs text-neutral-400">
                      종료하면 현재 활성 레이드가 비활성화되고 기본 화면으로 돌아갑니다.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRestartSoloRaid()}
                      disabled={restartingRaid || soloRaidActive}
                      className="rounded-2xl border border-emerald-800/60 px-4 py-3 text-sm text-emerald-300 active:scale-[0.99] disabled:opacity-50"
                    >
                      {restartingRaid ? "재시작 중..." : "레이드 재시작"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleEndSoloRaid()}
                      disabled={endingRaid || !soloRaidActive}
                      className="rounded-2xl border border-red-800/60 px-4 py-3 text-sm text-red-300 active:scale-[0.99] disabled:opacity-50"
                    >
                      {endingRaid ? "종료 중..." : "레이드 종료"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {adminSection === "video" ? (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-sm font-medium text-neutral-100">추천 영상</div>
              <div className="mt-1 text-xs text-neutral-400">
                유튜브 링크 1개만 저장되며, 저장하면 기존 추천 영상이 바로 교체됩니다.
              </div>

              <div className="mt-3 space-y-2">
                <input
                  value={videoUrlInput}
                  onChange={(event) => setVideoUrlInput(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs text-neutral-400">
                    {recommendedVideoUrl ? `현재 저장된 링크: ${recommendedVideoUrl}` : "현재 저장된 추천 영상이 없습니다."}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveRecommendedVideo()}
                    disabled={savingVideo}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {savingVideo ? "저장 중..." : "영상 저장"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="text-lg font-semibold">솔로레이드 기록</h2>

        <div className="mt-3 space-y-2">
          {deckTabs.map((tab) => {
            const isOpen = openRaidKey === tab.key;
            const tabRecommendation = recommendationHistory[tab.key] ?? null;

            return (
              <div key={tab.key} className="rounded-2xl border border-neutral-800 bg-neutral-950/30">
                <button
                  type="button"
                  onClick={() => toggleRaid(tab.key)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-lg transition ${
                    isOpen ? "bg-white text-black" : "text-neutral-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-xl ${isOpen ? "text-black/70" : "text-neutral-500"}`}>{isOpen ? "닫기" : "보기"}</span>
                </button>

                {isOpen ? (
                  <div className="border-t border-neutral-800 px-3 py-3">
                    {tabRecommendation ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-neutral-300">{tabRecommendation.raidLabel} 추천 기록</div>
                          <div className="text-lg font-semibold tabular-nums text-neutral-100">{fmt(tabRecommendation.total)}</div>
                        </div>

                        <div className="space-y-2">
                          {tabRecommendation.decks.map((deck, index) => (
                            <div key={`${tabRecommendation.raidKey}-${index}`} className="rounded-xl border border-neutral-800 px-3 py-2">
                              <div className="text-sm text-neutral-100">{formatNikkeDisplayNames(deck.chars)}</div>
                              <div className="mt-1 text-xs tabular-nums text-neutral-400">{fmt(deck.score)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">해당 레이드에 저장된 추천 기록이 없습니다.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {showInquirySection ? (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">문의</h2>
              <div className="mt-1 text-sm text-neutral-400">하단 문의하기 탭에서 보낸 메시지입니다.</div>
            </div>
            <div className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">{inquiries.length}개</div>
          </div>

          <div className="mt-3 space-y-3">
            {loadingInquiries ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                문의 불러오는 중...
              </div>
            ) : inquiries.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                아직 들어온 문의가 없습니다.
              </div>
            ) : (
              inquiries.map((inquiry) => (
                <article key={inquiry.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs text-neutral-400">
                      {inquiryDateFormatter.format(new Date(inquiry.createdAt))}
                      {inquiry.userId ? " · 로그인 사용자" : " · 익명"}
                      {inquiry.source === "local" ? " · 로컬 테스트" : ""}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteInquiry(inquiry.id)}
                      disabled={deletingInquiryId === inquiry.id}
                      className="shrink-0 rounded-xl border border-red-800/70 px-3 py-1 text-xs text-red-300 active:scale-[0.99] disabled:opacity-50"
                    >
                      {deletingInquiryId === inquiry.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-200">{inquiry.content}</div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-red-200">계정</h2>
            <div className="mt-1 text-sm leading-6 text-neutral-400">
              계정을 탈퇴하면 저장된 계정 정보와 개인 덱 데이터가 삭제됩니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAccountDeleteOpen(true);
              setAccountDeleteText("");
              setAccountDeleteError("");
            }}
            className="rounded-2xl border border-red-700/70 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-950/60 active:scale-[0.99]"
          >
            탈퇴
          </button>
        </div>
      </section>

      {accountDeleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-900/70 bg-neutral-950 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-red-200">계정 탈퇴</h3>
            <div className="mt-3 space-y-2 text-sm leading-6 text-neutral-300">
              <p>탈퇴하면 로그인 계정과 저장된 개인 데이터가 삭제됩니다.</p>
              <p>
                계속하려면 아래 입력창에 <span className="font-semibold text-red-200">탈퇴하기</span>를 입력해 주세요.
              </p>
            </div>

            <input
              value={accountDeleteText}
              onChange={(event) => setAccountDeleteText(event.target.value)}
              placeholder="탈퇴하기"
              className="mt-4 w-full rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-red-500"
            />

            {accountDeleteError ? <div className="mt-3 text-sm text-red-300">{accountDeleteError}</div> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (deletingAccount) return;
                  setAccountDeleteOpen(false);
                  setAccountDeleteText("");
                  setAccountDeleteError("");
                }}
                disabled={deletingAccount}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deletingAccount || accountDeleteText !== "탈퇴하기"}
                className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-red-900 disabled:text-red-300"
              >
                {deletingAccount ? "탈퇴 처리 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
