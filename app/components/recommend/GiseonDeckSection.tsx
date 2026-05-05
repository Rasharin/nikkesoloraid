"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import { getSubmasterDecks, pickBest5, type RecommendationSourceDeck } from "../../../lib/recommend";

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

type GiseonDeckSectionProps = {
  raidKey: string;
  soloRaidActive: boolean;
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  fmt: (value: number) => string;
  onCopyDeckToBuilder: (deck: RecommendedDeck) => void;
  onCopyDecksToBuilder: (decks: RecommendedDeck[]) => void;
};

const DEFAULT_SUBMASTER_USER_ID = "2d455703-52fd-4239-82f8-79c5e1856f30";
const SUBMASTER_USER_ID = process.env.NEXT_PUBLIC_SUBMASTER_USER_ID?.trim() || DEFAULT_SUBMASTER_USER_ID;

function toRecommendedDeck(deck: RecommendationSourceDeck): RecommendedDeck {
  return {
    deckKey: deck.deckKey,
    chars: deck.chars,
    usedCount: 1,
    avgScore: deck.score,
  };
}

export default function GiseonDeckSection({
  raidKey,
  soloRaidActive,
  nikkeMap,
  getPublicUrl,
  fmt,
  onCopyDeckToBuilder,
  onCopyDecksToBuilder,
}: GiseonDeckSectionProps) {
  const [decks, setDecks] = useState<RecommendationSourceDeck[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!soloRaidActive) {
      setDecks([]);
      setErrorMessage("");
      setLoading(false);
      return;
    }
    if (!SUBMASTER_USER_ID) return;
    if (!raidKey.trim()) {
      setDecks([]);
      setErrorMessage("");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDecks() {
      setLoading(true);
      setErrorMessage("");

      try {
        const nextDecks = await getSubmasterDecks(SUBMASTER_USER_ID, raidKey);
        if (!cancelled) setDecks(nextDecks);
      } catch (error) {
        if (!cancelled) {
          setDecks([]);
          setErrorMessage(error instanceof Error ? error.message : "기션덱을 불러오지 못했습니다");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDecks();

    return () => {
      cancelled = true;
    };
  }, [raidKey, soloRaidActive]);

  const best = useMemo(() => pickBest5(decks), [decks]);

  if (!soloRaidActive) return null;
  if (!SUBMASTER_USER_ID) return null;

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">기션덱</h2>
          <div className="text-sm text-neutral-400">김기션의 사용덱과 딜량 입니다.</div>
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "기션덱 펼치기" : "기션덱 접기"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950/50 text-base font-semibold text-neutral-100 transition hover:border-neutral-600 hover:bg-neutral-900 active:scale-[0.98]"
          >
            {collapsed ? "∨" : "^"}
          </button>
        </div>
      </div>

      {!collapsed ? <div className="mt-3 grid gap-2 md:grid-cols-2">
        {loading ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300 md:col-span-2">
            기션덱을 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-900/70 bg-red-950/20 p-4 text-sm text-red-200 md:col-span-2">{errorMessage}</div>
        ) : best.picked.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300 md:col-span-2">
            등록된 기션덱이 없습니다.
          </div>
        ) : (
          <>
            {best.picked.length < 5 ? (
              <div className="rounded-2xl border border-amber-800/70 bg-amber-950/20 p-3 text-sm text-amber-100 md:col-span-2">
                추천 가능한 덱이 부족합니다
              </div>
            ) : null}

            {best.picked.map((deck) => (
              <article key={deck.id} className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-950/40 p-2">
                <div className="grid w-full grid-cols-5 gap-1.5">
                  {deck.chars.map((name) => {
                    const nikke = nikkeMap.get(name);
                    const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                    return (
                      <div key={`${deck.id}-${name}`} className="min-w-0">
                        <div className="aspect-square w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[10px] text-neutral-600">no image</div>
                          )}
                        </div>
                        <div className="mt-1 truncate whitespace-nowrap text-center text-[10px] leading-3 text-neutral-200">
                          {formatNikkeDisplayName(name)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="whitespace-nowrap text-lg font-semibold tabular-nums text-neutral-100">{fmt(deck.score)}</div>
                  <button
                    type="button"
                    onClick={() => onCopyDeckToBuilder(toRecommendedDeck(deck))}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99]"
                  >
                    복사
                  </button>
                </div>
              </article>
            ))}

            <article className="flex min-h-[96px] items-center justify-end rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-right">
                <div className="text-[10px] text-neutral-500">총합 딜량</div>
                <div className="whitespace-nowrap text-2xl font-semibold tabular-nums text-neutral-100">{fmt(best.total)}</div>
                <button
                  type="button"
                  onClick={() => onCopyDecksToBuilder(best.picked.map(toRecommendedDeck))}
                  className="mt-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99]"
                >
                  전체 복사
                </button>
              </div>
            </article>
          </>
        )}
      </div> : null}
    </section>
  );
}
