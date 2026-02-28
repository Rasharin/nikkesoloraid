"use client";

import { useEffect, useState } from "react";

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

type MyPageTabProps = {
  deckTabs: readonly DeckTabItem[];
  isMaster: boolean;
  showBossManagement: boolean;
  recommendationHistory: Record<string, RecommendationRecord>;
  soloRaidActive: boolean;
  onAddSoloRaid: (payload: {
    title: string;
    description: string;
    imageFile: File | null;
  }) => Promise<boolean>;
  onEndSoloRaid: () => Promise<boolean>;
  fmt: (value: number) => string;
};

export default function MyPageTab({
  deckTabs,
  isMaster,
  showBossManagement,
  recommendationHistory,
  soloRaidActive,
  onAddSoloRaid,
  onEndSoloRaid,
  fmt,
}: MyPageTabProps) {
  const [openRaidKey, setOpenRaidKey] = useState<string>("");
  const [newRaidName, setNewRaidName] = useState("");
  const [newRaidDescription, setNewRaidDescription] = useState("");
  const [newRaidImageFile, setNewRaidImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [savingRaid, setSavingRaid] = useState(false);
  const [endingRaid, setEndingRaid] = useState(false);

  useEffect(() => {
    if (!deckTabs.some((tab) => tab.key === openRaidKey)) {
      setOpenRaidKey("");
    }
  }, [deckTabs, openRaidKey]);

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
      setImageInputKey((prev) => prev + 1);
    } finally {
      setSavingRaid(false);
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

  return (
    <div className="space-y-4">
      {showBossManagement ? (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">솔로레이드 보스 관리</h2>
            {isMaster ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                마스터 계정
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                로컬 테스트
              </span>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-sm font-medium text-neutral-100">1. 솔로레이드 보스 추가</div>
              <div className="mt-2 space-y-2">
                <input
                  value={newRaidName}
                  onChange={(event) => setNewRaidName(event.target.value)}
                  placeholder="새 보스명 입력"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                />
                <textarea
                  value={newRaidDescription}
                  onChange={(event) => setNewRaidDescription(event.target.value)}
                  placeholder="보스 설명 입력"
                  className="h-24 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                />
                <input
                  key={imageInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setNewRaidImageFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-neutral-400">
                    {newRaidImageFile ? `선택된 이미지: ${newRaidImageFile.name}` : "이미지 파일을 선택해줘"}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddSoloRaid()}
                    disabled={savingRaid}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {savingRaid ? "추가 중" : "추가"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-neutral-100">2. 솔로레이드 종료</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    종료하면 홈 탭 상단 보스 정보가 기본 보스로 전환됩니다.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleEndSoloRaid()}
                  disabled={endingRaid || !soloRaidActive}
                  className="rounded-2xl border border-red-800/60 px-4 py-3 text-sm text-red-300 active:scale-[0.99] disabled:opacity-50"
                >
                  {endingRaid ? "종료 중" : "솔로레이드 종료"}
                </button>
              </div>
            </div>
          </div>
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
                    isOpen ? "border-white bg-white text-black" : "text-neutral-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-xl ${isOpen ? "text-black/70" : "text-neutral-500"}`}>
                    {isOpen ? "닫기" : "보기"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-neutral-800 px-3 py-3">
                    {tabRecommendation ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-neutral-300">{tabRecommendation.raidLabel} 마지막 추천 조합</div>
                          <div className="text-lg font-semibold tabular-nums text-neutral-100">
                            {fmt(tabRecommendation.total)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {tabRecommendation.decks.map((deck, index) => (
                            <div key={`${tabRecommendation.raidKey}-${index}`} className="rounded-xl border border-neutral-800 px-3 py-2">
                              <div className="text-sm text-neutral-100">{deck.chars.join(" / ")}</div>
                              <div className="mt-1 text-xs tabular-nums text-neutral-400">{fmt(deck.score)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">해당 레이드에 저장된 조합이 없습니다.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
