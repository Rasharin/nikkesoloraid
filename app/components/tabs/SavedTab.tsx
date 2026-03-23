"use client";

import { useMemo, useState } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";

type Deck = {
  id: string;
  raidKey: string;
  deckKey: string;
  chars: string[];
  score: number;
  createdAt: number;
};

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  role: string | null;
};

type SavedTabItem = {
  readonly key: string;
  readonly label: string;
};

type SavedTabProps = {
  visibleSavedDecks: Deck[];
  deckTabs: readonly SavedTabItem[];
  savedDeckTab: string;
  onSavedDeckTabChange: (key: string) => void;
  onUpdateDeckScore: (id: string, scoreText: string) => Promise<boolean>;
  onUpdateDeckChars: (id: string, nextChars: string[]) => Promise<boolean>;
  onDeleteDeck: (id: string) => void;
  allNikkeNames: string[];
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  fmt: (value: number) => string;
};

export default function SavedTab({
  visibleSavedDecks,
  deckTabs,
  savedDeckTab,
  onSavedDeckTabChange,
  onUpdateDeckScore,
  onUpdateDeckChars,
  onDeleteDeck,
  allNikkeNames,
  nikkeMap,
  getPublicUrl,
  fmt,
}: SavedTabProps) {
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editingScoreText, setEditingScoreText] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);

  const sortedNikkeNames = useMemo(() => [...allNikkeNames].sort((a, b) => a.localeCompare(b)), [allNikkeNames]);

  async function saveDeckSlot(deck: Deck, slotIndex: number, nextName: string) {
    if (savingSlot) return;
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
        <div className="text-xs text-neutral-400">{visibleSavedDecks.length}개</div>
      </div>
      <div className="mt-1 text-base text-neutral-400">이름을 클릭하여 니케 수정 가능</div>

      <div className="mt-2 flex flex-wrap gap-2">
        {deckTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSavedDeckTabChange(tab.key)}
            className={`rounded-xl border px-3 py-1 text-sm transition ${
              savedDeckTab === tab.key
                ? "border-white bg-white text-black"
                : "border-neutral-700 bg-transparent text-neutral-200 hover:border-neutral-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
                <div className="grid grid-cols-5 gap-3">
                  {deck.chars.map((name, slotIndex) => {
                    const nikke = nikkeMap.get(name);
                    const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                    return (
                      <div key={`${deck.id}-${slotIndex}-${name}`} className="min-w-0">
                        <div className="aspect-square overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[10px] text-neutral-600">no image</div>
                          )}
                        </div>

                        <select
                          value={name}
                          disabled={savingSlot}
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
                      inputMode="decimal"
                      value={editingScoreText}
                      onChange={(event) => setEditingScoreText(event.target.value)}
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

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setEditingScoreId(deck.id);
                      setEditingScoreText(String(deck.score));
                    }}
                    className="flex-1 rounded-2xl border border-neutral-700 px-3 py-2 text-sm active:scale-[0.99]"
                  >
                    점수 수정
                  </button>
                  <button
                    onClick={() => onDeleteDeck(deck.id)}
                    className="rounded-2xl border border-red-800/60 px-3 py-2 text-sm text-red-300 active:scale-[0.99]"
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
