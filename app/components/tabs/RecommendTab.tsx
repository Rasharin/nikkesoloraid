"use client";

import { useMemo, useState } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  role: string | null;
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

type RecommendTabProps = {
  raidLabel: string;
  raidKey: string;
  deckTabs: readonly RecommendTabItem[];
  recommendDeckTab: string;
  onRecommendDeckTabChange: (key: string) => void;
  recommendedDecks: RecommendedDeck[];
  videoEmbedUrl: string | null;
  tips: SoloRaidTip[];
  loadingTips: boolean;
  currentUserId: string | null;
  isMaster: boolean;
  canWriteTips: boolean;
  editorUserId: string | null;
  onSubmitTip: (payload: { content: string }) => Promise<boolean>;
  onUpdateTip: (payload: { id: string; content: string }) => Promise<boolean>;
  onDeleteTip: (id: string) => Promise<boolean>;
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  fmt: (value: number) => string;
};

export default function RecommendTab({
  raidLabel,
  raidKey,
  deckTabs,
  recommendDeckTab,
  onRecommendDeckTabChange,
  recommendedDecks,
  videoEmbedUrl,
  tips,
  loadingTips,
  currentUserId,
  isMaster,
  canWriteTips,
  editorUserId,
  onSubmitTip,
  onUpdateTip,
  onDeleteTip,
  nikkeMap,
  getPublicUrl,
  fmt,
}: RecommendTabProps) {
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [tipContent, setTipContent] = useState("");
  const [savingTip, setSavingTip] = useState(false);
  const [openedTipId, setOpenedTipId] = useState<string | null>(null);
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingTipId, setDeletingTipId] = useState<string | null>(null);

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
      <section className="order-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 lg:order-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">추천 조합</h2>
            <div className="text-sm text-neutral-400">{raidLabel} 기준 추천 조합입니다.</div>
          </div>
          <div className="text-xs text-neutral-400">{recommendedDecks.length}개</div>
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
                  : "border-neutral-700 bg-transparent text-neutral-200 hover:border-neutral-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3">
          {recommendedDecks.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
              추천 조합이 없습니다.
            </div>
          ) : (
            recommendedDecks.map((deck) => (
              <article key={deck.deckKey} className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
                <div className="grid grid-cols-5 gap-3">
                  {deck.chars.map((name) => {
                    const nikke = nikkeMap.get(name);
                    const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                    return (
                      <div key={`${deck.deckKey}-${name}`} className="min-w-0">
                        <div className="aspect-square overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[10px] text-neutral-600">no image</div>
                          )}
                        </div>
                        <div className="mt-2 text-center text-xs leading-5 text-neutral-200">
                          {formatNikkeDisplayName(name)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between text-base">
                  <div className="text-neutral-300">사용 횟수 {deck.usedCount}회</div>
                  <div className="font-semibold text-neutral-100">평균 {fmt(Math.round(deck.avgScore))}</div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="order-1 space-y-2 lg:order-2">
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

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">솔레 팁</h3>
              <div className="mt-1 text-xs text-neutral-400">{raidLabel} 팁 게시판</div>
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
                    onClick={() => onRecommendDeckTabChange(tab.key)}
                    className={`rounded-xl border px-3 py-1 text-sm transition ${
                      recommendDeckTab === tab.key
                        ? "border-white bg-white text-black"
                        : "border-neutral-700 bg-transparent text-neutral-200 hover:border-neutral-400"
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
                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99]"
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
                      placeholder={`${raidKey} 기준 공략, 조합, 팁을 적어주세요.`}
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
