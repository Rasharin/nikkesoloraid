"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import { formatRecommendationRankLabel } from "../../../lib/recommend";
import GiseonDeckSection from "../recommend/GiseonDeckSection";
import RecommendationRecordPanel from "../recommend/RecommendationRecordPanel";

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  role: string | null;
  aliases?: string[];
};

type RecommendedDeck = {
  deckKey: string;
  chars: string[];
  usedCount: number;
  avgScore: number;
};

type RecommendTabItem = {
  readonly key: string;
  readonly label: string;
};

type SoloRaidTip = {
  id: string;
  content: string;
  userId: string | null;
  createdAt: number;
  source: "remote" | "local";
};

type RecommendedDeckSortMode = "usedCount" | "score";

const RECOMMENDED_DECK_SORT_MODE_KEY = "soloraid_recommended_deck_sort_mode_v1";
const RECOMMENDED_DECK_PAGE_SIZE = 15;

function compareRecommendedDecksByScore(a: RecommendedDeck, b: RecommendedDeck) {
  if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
  return b.usedCount - a.usedCount;
}

function compareRecommendedDecksByUsedCount(a: RecommendedDeck, b: RecommendedDeck) {
  if (a.usedCount !== b.usedCount) return b.usedCount - a.usedCount;
  return b.avgScore - a.avgScore;
}

function readStoredRecommendedDeckSortMode(): RecommendedDeckSortMode {
  if (typeof window === "undefined") return "usedCount";

  try {
    const value = localStorage.getItem(RECOMMENDED_DECK_SORT_MODE_KEY);
    return value === "usedCount" || value === "score" ? value : "usedCount";
  } catch {
    return "usedCount";
  }
}

type RecommendTabProps = {
  raidLabel: string;
  raidKey: string;
  tipRaidLabel: string;
  tipRaidKey: string;
  deckTabs: readonly RecommendTabItem[];
  recommendDeckTab: string;
  tipDeckTab: string;
  soloRaidActive: boolean;
  onRecommendDeckTabChange: (key: string) => void;
  onTipDeckTabChange: (key: string) => void;
  recommendedDecks: RecommendedDeck[];
  loadingRecommendedDecks: boolean;
  videoEmbedUrl: string | null;
  tips: SoloRaidTip[];
  loadingTips: boolean;
  currentUserId: string | null;
  isMaster: boolean;
  localModerationPreview?: boolean;
  canWriteTips: boolean;
  editorUserId: string | null;
  onSubmitTip: (payload: { content: string }) => Promise<boolean>;
  onUpdateTip: (payload: { id: string; content: string }) => Promise<boolean>;
  onDeleteTip: (id: string) => Promise<boolean>;
  onCopyDeckToBuilder: (deck: RecommendedDeck) => void;
  onCopyDecksToBuilder: (decks: RecommendedDeck[]) => void;
  onRecommendationModerationChanged: () => void;
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  fmt: (value: number) => string;
  myRankingData: { rank: number; total: number } | null;
};

export default function RecommendTab({
  raidLabel,
  raidKey,
  tipRaidLabel,
  tipRaidKey,
  deckTabs,
  recommendDeckTab,
  tipDeckTab,
  soloRaidActive,
  onRecommendDeckTabChange,
  onTipDeckTabChange,
  recommendedDecks,
  loadingRecommendedDecks,
  videoEmbedUrl,
  tips,
  loadingTips,
  currentUserId,
  isMaster,
  localModerationPreview = false,
  canWriteTips,
  editorUserId,
  onSubmitTip,
  onUpdateTip,
  onDeleteTip,
  onCopyDeckToBuilder,
  onCopyDecksToBuilder,
  onRecommendationModerationChanged,
  nikkeMap,
  getPublicUrl,
  fmt,
  myRankingData,
}: RecommendTabProps) {
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [tipContent, setTipContent] = useState("");
  const [savingTip, setSavingTip] = useState(false);
  const [openedTipId, setOpenedTipId] = useState<string | null>(null);
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingTipId, setDeletingTipId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState<RecommendedDeckSortMode>(() => readStoredRecommendedDeckSortMode());
  const [visibleRecommendedDeckCount, setVisibleRecommendedDeckCount] = useState(RECOMMENDED_DECK_PAGE_SIZE);
  const [openedRecommendationRecordKey, setOpenedRecommendationRecordKey] = useState<string | null>(null);

  const tipDateFormatter = useMemo(
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

  const filteredRecommendedDecks = useMemo(() => {
    const queries = q
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    const matchedDecks =
      queries.length === 0
        ? recommendedDecks
        : recommendedDecks.filter((deck) =>
            queries.every((query) =>
              deck.chars.some((name) => {
                const nikke = nikkeMap.get(name);
                const matchesName = name.toLowerCase().includes(query);
                const matchesAlias = nikke?.aliases?.some((alias) => alias.toLowerCase().includes(query)) ?? false;
                return matchesName || matchesAlias;
              })
            )
          );

    return [...matchedDecks].sort(sortMode === "usedCount" ? compareRecommendedDecksByUsedCount : compareRecommendedDecksByScore);
  }, [nikkeMap, q, recommendedDecks, sortMode]);

  const visibleRecommendedDecks = useMemo(
    () => filteredRecommendedDecks.slice(0, visibleRecommendedDeckCount),
    [filteredRecommendedDecks, visibleRecommendedDeckCount]
  );
  const hasMoreRecommendedDecks = visibleRecommendedDeckCount < filteredRecommendedDecks.length;

  useEffect(() => {
    try {
      localStorage.setItem(RECOMMENDED_DECK_SORT_MODE_KEY, sortMode);
    } catch { }
  }, [sortMode]);

  useEffect(() => {
    setVisibleRecommendedDeckCount(RECOMMENDED_DECK_PAGE_SIZE);
  }, [q, recommendDeckTab, sortMode, recommendedDecks]);

  async function handleSubmitTip() {
    if (savingTip || !canWriteTips) return;

    setSavingTip(true);
    try {
      const saved = await onSubmitTip({ content: tipContent });
      if (!saved) return;
      setTipContent("");
      setShowWriteForm(false);
    } finally {
      setSavingTip(false);
    }
  }

  function canManageTip(tip: SoloRaidTip) {
    return isMaster || (tip.userId !== null && tip.userId === editorUserId);
  }

  function handleTipClick(tip: SoloRaidTip) {
    if (!canManageTip(tip)) return;

    setOpenedTipId((prev) => (prev === tip.id ? null : tip.id));
    if (editingTipId !== tip.id) return;
    setEditingTipId(null);
    setEditingContent("");
  }

  function startEditingTip(tip: SoloRaidTip) {
    setOpenedTipId(tip.id);
    setEditingTipId(tip.id);
    setEditingContent(tip.content);
  }

  async function handleSaveTipEdit(tipId: string) {
    if (savingEdit) return;

    setSavingEdit(true);
    try {
      const saved = await onUpdateTip({ id: tipId, content: editingContent });
      if (!saved) return;
      setEditingTipId(null);
      setEditingContent("");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteTip(tipId: string) {
    if (deletingTipId) return;

    setDeletingTipId(tipId);
    try {
      const deleted = await onDeleteTip(tipId);
      if (!deleted) return;
      setOpenedTipId((prev) => (prev === tipId ? null : prev));
      if (editingTipId === tipId) {
        setEditingTipId(null);
        setEditingContent("");
      }
    } finally {
      setDeletingTipId(null);
    }
  }

  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <div className="order-1 space-y-2">
        <GiseonDeckSection
          raidKey={raidKey}
          soloRaidActive={soloRaidActive}
          nikkeMap={nikkeMap}
          getPublicUrl={getPublicUrl}
          fmt={fmt}
          onCopyDeckToBuilder={onCopyDeckToBuilder}
          onCopyDecksToBuilder={onCopyDecksToBuilder}
        />

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">추천 조합</h2>
            <div className="text-sm text-neutral-400">{raidLabel} 전체 사용자 저장 덱 기준 추천 조합입니다.</div>
          </div>
          <div className="text-xs text-neutral-400">
            {q.trim() ? `${filteredRecommendedDecks.length}/${recommendedDecks.length}개` : `${recommendedDecks.length}개`}
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setQ("");
                }
              }}
              placeholder="니케 이름 검색"
              className="flex-1 bg-transparent py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
            />

            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="검색어 지우기"
              disabled={!q}
              style={{ borderRadius: "9999px" }}
              className={`ml-2 flex h-9 min-w-[36px] shrink-0 items-center justify-center appearance-none overflow-hidden border-0 p-0 transition active:scale-[0.98] ${
                q ? "bg-neutral-800 text-neutral-100 hover:bg-neutral-700" : "bg-neutral-900/70 text-neutral-600"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M6 6L18 18" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-neutral-300">정렬 기준</div>
          <div className="flex rounded-2xl border border-neutral-800 bg-neutral-950/50 p-1">
            {[
              { key: "usedCount", label: "사용 횟수" },
              { key: "score", label: "점수" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSortMode(option.key as RecommendedDeckSortMode)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  sortMode === option.key
                    ? "border border-black bg-neutral-100 text-neutral-950"
                    : "inactive-sort-tab text-neutral-300 hover:bg-neutral-800/80 hover:text-neutral-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {deckTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onRecommendDeckTabChange(tab.key)}
              className={`rounded-xl border px-3 py-1 text-sm transition ${
                recommendDeckTab === tab.key
                  ? "border-white bg-white text-black"
                  : "inactive-raid-tab border-neutral-700 bg-neutral-950/40 text-neutral-200 hover:border-neutral-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3">
          {loadingRecommendedDecks ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
              추천 조합을 불러오는 중입니다.
            </div>
          ) : recommendedDecks.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
              추천 조합이 없습니다.
            </div>
          ) : filteredRecommendedDecks.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
              조건에 맞는 추천 조합이 없습니다.
            </div>
          ) : (
            <>
            {visibleRecommendedDecks.map((deck) => (
              <div key={deck.deckKey} className="space-y-2">
              <article className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid w-full grid-cols-5 gap-2 sm:max-w-[66%] sm:flex-1">
                  {deck.chars.map((name) => {
                    const nikke = nikkeMap.get(name);
                    const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                    return (
                      <div key={`${deck.deckKey}-${name}`} className="min-w-0">
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                          {imageUrl ? (
                            <Image fill src={imageUrl} alt={name} className="object-cover" sizes="(max-width: 640px) 20vw, 100px" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[10px] text-neutral-600">no image</div>
                          )}
                        </div>
                        <div className="mt-1 truncate whitespace-nowrap text-center text-[11px] leading-4 text-neutral-200">
                          {formatNikkeDisplayName(name)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 text-sm sm:min-w-[150px] sm:flex-col sm:items-end sm:justify-center sm:gap-3 sm:text-base">
                  <div className="shrink-0 whitespace-nowrap text-xs text-neutral-300 sm:text-base">사용 횟수 {deck.usedCount}회</div>
                  <div className="flex min-w-0 items-center gap-2 sm:flex-col sm:items-end">
                    <div className="min-w-0 whitespace-nowrap text-right text-base font-semibold tabular-nums text-neutral-100 sm:text-2xl">
                      <span className="mr-1 text-xs text-neutral-400 sm:text-sm">평균</span>
                      {fmt(Math.round(deck.avgScore))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onCopyDeckToBuilder(deck)}
                      className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-base font-medium leading-5 text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99]"
                    >
                      복사
                    </button>
                    {isMaster || localModerationPreview ? (
                      <button
                        type="button"
                        onClick={() => setOpenedRecommendationRecordKey((current) => current === deck.deckKey ? null : deck.deckKey)}
                        className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-base font-medium leading-5 text-sky-100 transition hover:border-sky-300/70"
                      >
                        기록
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
              {(isMaster || localModerationPreview) && openedRecommendationRecordKey === deck.deckKey ? (
                <RecommendationRecordPanel
                  raidKey={raidKey}
                  deckKey={deck.deckKey}
                  fmt={fmt}
                  onChanged={localModerationPreview ? () => {} : onRecommendationModerationChanged}
                  localPreview={localModerationPreview}
                />
              ) : null}
              </div>
            ))}

            {hasMoreRecommendedDecks ? (
              <button
                type="button"
                onClick={() => setVisibleRecommendedDeckCount((count) => count + RECOMMENDED_DECK_PAGE_SIZE)}
                className="rounded-2xl border border-neutral-700 bg-neutral-950/40 px-4 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-900 active:scale-[0.99]"
              >
                더보기 ({Math.min(RECOMMENDED_DECK_PAGE_SIZE, filteredRecommendedDecks.length - visibleRecommendedDeckCount)}개)
              </button>
            ) : null}
            </>
          )}
        </div>
        </section>
      </div>

      <div className="order-2 space-y-2">
        {videoEmbedUrl ? (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
            <div className="mb-2 text-sm font-semibold text-neutral-100">추천 영상</div>
            <div className="aspect-video overflow-hidden rounded-2xl border border-neutral-800 bg-black">
              <iframe
                src={videoEmbedUrl}
                title="추천 영상"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="mb-2 text-sm font-semibold text-neutral-100">추천 영상</div>
            <div className="text-sm text-neutral-400">등록된 추천 영상이 없습니다.</div>
          </section>
        )}

        {myRankingData && myRankingData.total >= 2 ? (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-neutral-300">내 덱 딜량 순위</span>
              <span className="text-lg font-bold tabular-nums text-neutral-100">
                {formatRecommendationRankLabel(myRankingData)}
              </span>
            </div>
            <div className="mt-1 text-[11px] tabular-nums text-neutral-500">총 참여 인원 {myRankingData.total}명</div>
            <div className="mt-1.5 text-xs text-neutral-500">본 순위는 사이트 내 딜량 순위로 인게임과 무관합니다</div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-neutral-100">솔레 팁</h3>
              <div className="mt-1 text-xs text-neutral-400">{tipRaidLabel} 팁 게시판</div>
            </div>
            <div className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] text-neutral-300">{tips.length}개 글</div>
          </div>

          <div className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {deckTabs.map((tab) => (
                  <button
                    key={`tip-${tab.key}`}
                    type="button"
                    onClick={() => onTipDeckTabChange(tab.key)}
                    className={`rounded-xl border px-3 py-1 text-sm transition ${
                      tipDeckTab === tab.key
                        ? "border-white bg-white text-black"
                        : "inactive-raid-tab border-neutral-700 bg-neutral-950/40 text-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {canWriteTips ? (
                <button
                  type="button"
                  onClick={() => setShowWriteForm((prev) => !prev)}
                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm transition hover:border-neutral-500 hover:bg-neutral-800/40 active:scale-[0.99]"
                >
                  {showWriteForm ? "닫기" : "글쓰기"}
                </button>
              ) : null}
            </div>

            {canWriteTips ? (
              <>
                <div className="mt-3 text-xs text-neutral-400">
                  {currentUserId ? "로그인한 사용자만 글을 작성할 수 있어요." : "로컬 개발 환경 테스트용 글쓰기입니다."}
                </div>

                {showWriteForm ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={tipContent}
                      onChange={(event) => setTipContent(event.target.value)}
                      placeholder={`${tipRaidKey} 기준 공략, 조합, 팁을 적어주세요.`}
                      disabled={savingTip}
                      className="h-32 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm outline-none disabled:opacity-60"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleSubmitTip()}
                        disabled={savingTip}
                        className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                      >
                        {savingTip ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-3 text-xs text-neutral-400">비로그인 상태에서는 게시글 읽기만 가능합니다.</div>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {loadingTips ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                게시글 불러오는 중...
              </div>
            ) : tips.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                아직 등록된 솔레 팁이 없습니다.
              </div>
            ) : (
              tips.map((tip) => {
                const isMine = Boolean(editorUserId) && tip.userId === editorUserId;
                const manageable = canManageTip(tip);
                const isOpened = openedTipId === tip.id;
                const isEditing = editingTipId === tip.id;

                return (
                  <article
                    key={tip.id}
                    onClick={() => handleTipClick(tip)}
                    className={`rounded-2xl border bg-neutral-950/40 p-4 ${manageable ? "cursor-pointer border-neutral-700" : "border-neutral-800"}`}
                  >
                    {isEditing ? (
                      <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                        <textarea
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                          placeholder="내용"
                          disabled={savingEdit}
                          className="h-32 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm outline-none disabled:opacity-60"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTipId(null);
                              setEditingContent("");
                            }}
                            className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99]"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveTipEdit(tip.id)}
                            disabled={savingEdit}
                            className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99] disabled:opacity-50"
                          >
                            {savingEdit ? "저장 중..." : "저장"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-neutral-400">
                          {tipDateFormatter.format(new Date(tip.createdAt))}
                          {isMaster ? " · 마스터 관리 가능" : isMine ? " · 내 글" : ""}
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-200">{tip.content}</div>

                        {manageable && isOpened ? (
                          <div className="mt-3 flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => startEditingTip(tip)}
                              className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99]"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteTip(tip.id)}
                              disabled={deletingTipId === tip.id}
                              className="rounded-2xl border border-red-800/70 px-4 py-2 text-sm text-red-300 active:scale-[0.99] disabled:opacity-50"
                            >
                              {deletingTipId === tip.id ? "삭제 중..." : "삭제"}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
