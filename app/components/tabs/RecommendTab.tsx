"use client";

import { formatNikkeDisplayNames } from "../../../lib/nikke-display";

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

type RecommendTabProps = {
  raidLabel: string;
  deckTabs: readonly RecommendTabItem[];
  recommendDeckTab: string;
  onRecommendDeckTabChange: (key: string) => void;
  recommendedDecks: RecommendedDeck[];
  videoEmbedUrl: string | null;
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  fmt: (value: number) => string;
};

export default function RecommendTab({
  raidLabel,
  deckTabs,
  recommendDeckTab,
  onRecommendDeckTabChange,
  recommendedDecks,
  videoEmbedUrl,
  nikkeMap,
  getPublicUrl,
  fmt,
}: RecommendTabProps) {
  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
      <section className="order-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 lg:order-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">추천</h2>
            <div className="text-sm text-neutral-400">{raidLabel} 기준 추천 덱입니다.</div>
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
              추천 덱이 없습니다.
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
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 text-base font-medium leading-6 text-neutral-100">{formatNikkeDisplayNames(deck.chars)}</div>

                <div className="mt-3 flex items-center justify-between text-base">
                  <div className="text-neutral-300">사용 횟수 {deck.usedCount}회</div>
                  <div className="font-semibold text-neutral-100">평균 {fmt(Math.round(deck.avgScore))}</div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {videoEmbedUrl ? (
        <section className="order-1 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 lg:order-2">
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
        <section className="order-1 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 lg:order-2">
          <div className="mb-2 text-sm font-semibold text-neutral-100">추천 영상</div>
          <div className="text-sm text-neutral-400">등록된 추천 영상이 없습니다.</div>
        </section>
      )}
    </div>
  );
}
