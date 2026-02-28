"use client";

import { useEffect, useState } from "react";
import { formatNikkeDisplayNames } from "../../../lib/nikke-display";

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

type NikkeElementValue = "iron" | "fire" | "wind" | "water" | "electric" | null;
type NikkeRoleValue = "attacker" | "supporter" | "defender" | null;

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
  fmt: (value: number) => string;
};

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
  fmt,
}: MyPageTabProps) {
  const [openRaidKey, setOpenRaidKey] = useState<string>("");
  const [newRaidName, setNewRaidName] = useState("");
  const [newRaidDescription, setNewRaidDescription] = useState("");
  const [newRaidImageFile, setNewRaidImageFile] = useState<File | null>(null);
  const [raidImageInputKey, setRaidImageInputKey] = useState(0);
  const [savingRaid, setSavingRaid] = useState(false);
  const [endingRaid, setEndingRaid] = useState(false);

  const [nikkeName, setNikkeName] = useState("");
  const [nikkeBurst, setNikkeBurst] = useState<number | null>(null);
  const [nikkeElement, setNikkeElement] = useState<NikkeElementValue>(null);
  const [nikkeRole, setNikkeRole] = useState<NikkeRoleValue>(null);
  const [nikkeImageFile, setNikkeImageFile] = useState<File | null>(null);
  const [nikkeImageInputKey, setNikkeImageInputKey] = useState(0);
  const [savingNikke, setSavingNikke] = useState(false);

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
        imageFile: nikkeImageFile,
      });
      if (!saved) return;
      setNikkeName("");
      setNikkeBurst(null);
      setNikkeElement(null);
      setNikkeRole(null);
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

  return (
    <div className="space-y-4">
      {showBossManagement ? (
        <section className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">니케 관리</h2>
            {isMaster ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300">
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-neutral-100">1. 이미지 버킷 동기화</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    `nikke-images` 버킷에 있는 파일을 니케 테이블에 자동 등록합니다.
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
                    {nikkeImageFile ? `선택된 이미지: ${nikkeImageFile.name}` : "니케 이미지 파일을 선택해줘"}
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
        </section>
      ) : null}

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
                    {newRaidImageFile ? `선택된 이미지: ${newRaidImageFile.name}` : "보스 이미지 파일을 선택해줘"}
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
                    종료하면 홈 상단 보스 정보가 기본 보스로 다시 바뀝니다.
                  </div>
                </div>
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
                          <div className="text-sm text-neutral-300">{tabRecommendation.raidLabel} 추천 기록</div>
                          <div className="text-lg font-semibold tabular-nums text-neutral-100">
                            {fmt(tabRecommendation.total)}
                          </div>
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
    </div>
  );
}
