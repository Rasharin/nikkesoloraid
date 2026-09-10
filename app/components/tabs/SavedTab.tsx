"use client";

import Image from "next/image";
import RaidModeToggle from '../union/RaidModeToggle';
import type { RaidMode } from '../../../lib/union-raid';
import { useMemo, useState } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import { formatPlainScoreText } from "../../../lib/score-format";

type Deck = {
  unionLabel?: string;
  id: string;
  raidKey: string;
  deckKey: string;
  chars: string[];
  score: number;
  note: string;
  createdAt: number;
};

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  element2: string | null;
  role: string | null;
};

type SavedTabItem = {
  readonly key: string;
  readonly label: string;
};

type SavedTabProps = {
  raidMode?: RaidMode;
  onRaidModeChange?: (mode: RaidMode) => void;
  visibleSavedDecks: Deck[];
  deckTabs: readonly SavedTabItem[];
  seasonOffTab?: SavedTabItem | null;
  moveTargets: readonly SavedTabItem[];
  savedDeckTab: string;
  readOnly: boolean;
  onSavedDeckTabChange: (key: string) => void;
  onUpdateDeckScore: (id: string, scoreText: string) => Promise<boolean>;
  onUpdateDeckChars: (id: string, nextChars: string[]) => Promise<boolean>;
  onDeleteDeck: (id: string) => void;
  onDeleteAllDecks: () => void;
  onCopyDeckToBuilder: (deck: Deck) => void;
  onMoveDeck: (id: string, targetRaidKey: string) => Promise<boolean>;
  allNikkeNames: string[];
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  fmt: (value: number) => string;
};

export default function SavedTab({
  raidMode = 'solo',
  onRaidModeChange,
  visibleSavedDecks,
  deckTabs,
  seasonOffTab,
  moveTargets,
  savedDeckTab,
  readOnly,
  onSavedDeckTabChange,
  onUpdateDeckScore,
  onUpdateDeckChars,
  onDeleteDeck,
  onDeleteAllDecks,
  onCopyDeckToBuilder,
  onMoveDeck,
  allNikkeNames,
  nikkeMap,
  getPublicUrl,
  fmt,
}: SavedTabProps) {
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editingScoreText, setEditingScoreText] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [movingDeck, setMovingDeck] = useState<Deck | null>(null);
  const [moveTargetKey, setMoveTargetKey] = useState("");

  const sortedNikkeNames = useMemo(() => [...allNikkeNames].sort((a, b) => a.localeCompare(b)), [allNikkeNames]);

  async function saveDeckSlot(deck: Deck, slotIndex: number, nextName: string) {
    if (savingSlot || readOnly) return;
    const normalizedName = nextName.trim();
    if (!normalizedName || normalizedName === deck.chars[slotIndex]) return;

    const nextChars = [...deck.chars];
    nextChars[slotIndex] = normalizedName;

    setSavingSlot(true);
    try {
      const saved = await onUpdateDeckChars(deck.id, nextChars);
      if (!saved) return;
    } finally {
      setSavingSlot(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">저장된 덱</h2>
        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-400">{visibleSavedDecks.length}개</div>
          <button
            type="button"
            onClick={onDeleteAllDecks}
            disabled={readOnly || visibleSavedDecks.length === 0}
            className="rounded-xl border border-red-800/60 px-3 py-1.5 text-xs text-red-300 transition hover:border-red-500 hover:bg-red-500/15 active:scale-[0.99] disabled:opacity-50"
          >
            전체 삭제
          </button>
        </div>
      </div>
      <div className="mt-1 text-base text-neutral-400">이름을 클릭하여 니케 수정 가능</div>

      {onRaidModeChange && <div className="mt-3"><RaidModeToggle mode={raidMode} onChange={onRaidModeChange} /></div>}
      <div className="mt-2 flex flex-wrap gap-2">
        {deckTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSavedDeckTabChange(tab.key)}
            className={`rounded-xl border px-3 py-1 text-sm transition ${
              savedDeckTab === tab.key
                ? "border-white bg-white text-black"
                : "inactive-raid-tab border-neutral-700 bg-neutral-950/40 text-neutral-200 hover:border-neutral-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {seasonOffTab ? (
          <button
            key={seasonOffTab.key}
            onClick={() => onSavedDeckTabChange(seasonOffTab.key)}
            className={`rounded-xl border px-3 py-1 text-sm transition ${
              savedDeckTab === seasonOffTab.key
                ? "border-white bg-white text-black"
                : "inactive-raid-tab border-neutral-700 bg-neutral-950/40 text-neutral-200 hover:border-neutral-400"
            }`}
          >
            {seasonOffTab.label}
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {visibleSavedDecks.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300 lg:col-span-2">
            저장된 덱이 없습니다.
          </div>
        ) : (
          visibleSavedDecks.map((deck) => {
            return (
              <article key={deck.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                {deck.unionLabel && <div className="mb-2 text-xs text-[var(--theme-text-soft)]">{deck.unionLabel}</div>}
                <div className="grid grid-cols-5 gap-3">
                  {deck.chars.map((name, slotIndex) => {
                    const nikke = nikkeMap.get(name);
                    const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                    return (
                      <div key={`${deck.id}-${slotIndex}-${name}`} className="min-w-0">
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                          {imageUrl ? (
                            <Image fill src={imageUrl} alt={name} className="object-cover" sizes="(max-width: 640px) 20vw, 100px" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[10px] text-neutral-600">no image</div>
                          )}
                        </div>

                        <select
                          value={name}
                          disabled={savingSlot || readOnly}
                          onChange={(event) => {
                            void saveDeckSlot(deck, slotIndex, event.target.value);
                          }}
                          className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none"
                          title="니케 교체"
                        >
                          {sortedNikkeNames.map((nikkeName) => (
                            <option key={`${deck.id}-${slotIndex}-${nikkeName}`} value={nikkeName}>
                              {formatNikkeDisplayName(nikkeName)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {editingScoreId === deck.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      inputMode="text"
                      value={editingScoreText}
                      onChange={(event) => setEditingScoreText(formatPlainScoreText(event.target.value))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void (async () => {
                            const saved = await onUpdateDeckScore(deck.id, editingScoreText);
                            if (!saved) return;
                            setEditingScoreId(null);
                            setEditingScoreText("");
                          })();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setEditingScoreId(null);
                          setEditingScoreText("");
                        }
                      }}
                      className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-base tabular-nums text-neutral-100 outline-none"
                    />
                    <button
                      onClick={() => {
                        void (async () => {
                          const saved = await onUpdateDeckScore(deck.id, editingScoreText);
                          if (!saved) return;
                          setEditingScoreId(null);
                          setEditingScoreText("");
                        })();
                      }}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-neutral-900 active:scale-[0.99]"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-end gap-3">
                    <div className="text-xl font-semibold tabular-nums text-neutral-200">{fmt(deck.score)}</div>
                  </div>
                )}

                {deck.note ? (
                  <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-300 whitespace-pre-wrap break-words">
                    {deck.note}
                  </div>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (readOnly) return;
                      setEditingScoreId(deck.id);
                      setEditingScoreText(fmt(deck.score));
                    }}
                    disabled={readOnly}
                    className="flex-1 rounded-2xl border border-neutral-700 px-3 py-2 text-sm transition hover:border-neutral-500 hover:bg-neutral-800/40 active:scale-[0.99]"
                  >
                    점수 수정
                  </button>
                  <button
                    onClick={() => {
                      setMovingDeck(deck);
                      setMoveTargetKey(moveTargets.find((target) => target.key !== deck.raidKey)?.key ?? "");
                    }}
                    disabled={moveTargets.length < 2}
                    className="rounded-2xl border border-amber-500/40 px-3 py-2 text-sm text-amber-100 transition hover:border-amber-300/70 hover:bg-amber-500/15 active:scale-[0.99] disabled:opacity-50"
                  >
                    이동
                  </button>
                  <button
                    onClick={() => onCopyDeckToBuilder(deck)}
                    className="rounded-2xl border border-cyan-500/40 px-3 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99]"
                  >
                    복사
                  </button>
                  <button
                    onClick={() => onDeleteDeck(deck.id)}
                    disabled={readOnly}
                    className="rounded-2xl border border-red-800/60 px-3 py-2 text-sm text-red-300 transition hover:border-red-500 hover:bg-red-500/15 active:scale-[0.99]"
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
      {movingDeck ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="저장된 덱 이동">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-950 p-4 shadow-2xl">
            <h3 className="text-lg font-semibold">저장된 덱 이동</h3>
            <p className="mt-1 text-sm text-neutral-400">이동할 레이드를 선택하세요.</p>
            <select value={moveTargetKey} onChange={(event) => setMoveTargetKey(event.target.value)} className="mt-4 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100">
              <option value="" disabled>이동할 레이드</option>
              {moveTargets.map((target) => <option key={target.key} value={target.key} disabled={target.key === movingDeck.raidKey}>{target.label}</option>)}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setMovingDeck(null)} className="rounded-xl border border-neutral-700 px-3 py-2 text-sm">취소</button>
              <button type="button" disabled={!moveTargetKey || moveTargetKey === movingDeck.raidKey} onClick={() => void (async () => { const saved = await onMoveDeck(movingDeck.id, moveTargetKey); if (saved) setMovingDeck(null); })()} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">이동 저장</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
