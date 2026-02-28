"use client";

type Deck = {
  id: string;
  raidKey: string;
  chars: string[];
  score: number;
  createdAt: number;
};

type SavedTabItem = {
  readonly key: string;
  readonly label: string;
};

type SavedTabProps = {
  userId: string | null;
  visibleSavedDecks: Deck[];
  deckTabs: readonly SavedTabItem[];
  savedDeckTab: string;
  onSavedDeckTabChange: (key: string) => void;
  onStartEditDeck: (deck: Deck) => void;
  onDeleteDeck: (id: string) => void;
  fmt: (value: number) => string;
};

export default function SavedTab({
  userId,
  visibleSavedDecks,
  deckTabs,
  savedDeckTab,
  onSavedDeckTabChange,
  onStartEditDeck,
  onDeleteDeck,
  fmt,
}: SavedTabProps) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">저장된 덱</h2>
        <div className="text-xs text-neutral-400">{visibleSavedDecks.length}개</div>
      </div>

      <div className="mt-2 flex gap-2">
        {deckTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSavedDeckTabChange(tab.key)}
            className={`rounded-xl border px-3 py-1 text-sm transition ${
              savedDeckTab === tab.key
                ? "bg-white text-black border-white"
                : "bg-transparent text-neutral-200 border-neutral-700 hover:border-neutral-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {!userId ? (
          <div className="text-sm text-neutral-300">로그인 후 덱 저장 가능.</div>
        ) : visibleSavedDecks.length === 0 ? (
          <div className="text-sm text-neutral-300">저장된 덱 없음.</div>
        ) : (
          visibleSavedDecks.map((deck) => (
            <div key={deck.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="font-medium text-neutral-100" style={{ fontSize: "1.3rem" }}>
                {deck.chars.join(" / ")}
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="font-semibold tabular-nums text-neutral-200" style={{ fontSize: "1.3rem" }}>
                  {fmt(deck.score)}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onStartEditDeck(deck)}
                  className="flex-1 rounded-2xl border border-neutral-700 px-3 py-2 text-sm active:scale-[0.99]"
                >
                  홈에서 수정
                </button>
                <button
                  onClick={() => onDeleteDeck(deck.id)}
                  className="rounded-2xl border border-red-800/60 px-3 py-2 text-sm text-red-300 active:scale-[0.99]"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
