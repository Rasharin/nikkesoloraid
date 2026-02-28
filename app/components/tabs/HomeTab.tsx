"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatNikkeDisplayName, formatNikkeDisplayNames } from "../../../lib/nikke-display";

type Deck = {
  id: string;
  chars: string[];
  score: number;
  createdAt: number;
};

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
};

type BossRow = {
  title: string;
  description: string | null;
  image_path: string | null;
};

type HomeTabProps = {
  boss: BossRow | null;
  decksCount: number;
  canRecommend: boolean;
  best: {
    picked: Deck[];
    total: number;
  };
  fmt: (value: number) => string;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  selectedNikkes: NikkeRow[];
  maxSelected: number;
  nikkeMap: Map<string, NikkeRow>;
  editRequest: Deck | null;
  onEditRequestConsumed: () => void;
  onResetSelected: () => void;
  onGoToSettings: () => void;
  onShowToast: (message: string) => void;
  onSubmitDeck: (payload: { draft: string[]; scoreText: string; editingId: string | null }) => Promise<boolean>;
  onSubmitBulk: (text: string) => Promise<boolean>;
};

const MAX_DECK_CHARS = 5;

export default function HomeTab({
  boss,
  decksCount,
  canRecommend,
  best,
  fmt,
  getPublicUrl,
  selectedNikkes,
  maxSelected,
  nikkeMap,
  editRequest,
  onEditRequestConsumed,
  onResetSelected,
  onGoToSettings,
  onShowToast,
  onSubmitDeck,
  onSubmitBulk,
}: HomeTabProps) {
  const [draft, setDraft] = useState<string[]>([]);
  const [score, setScore] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const scoreRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editRequest) return;

    setEditingId(editRequest.id);
    setDraft([...editRequest.chars]);
    setScore(String(editRequest.score));
    requestAnimationFrame(() => scoreRef.current?.focus());
    onShowToast("수정 모드: 니케 변경 후 점수 저장");
    onEditRequestConsumed();
  }, [editRequest, onEditRequestConsumed, onShowToast]);

  function clearDraft() {
    setDraft([]);
    setScore("");
    setEditingId(null);
    requestAnimationFrame(() => scoreRef.current?.focus());
  }

  function addToDraft(name: string) {
    setDraft((prev) => {
      if (prev.includes(name)) return prev;
      if (prev.length >= MAX_DECK_CHARS) return prev;

      const next = [...prev, name];
      if (next.length === MAX_DECK_CHARS) {
        requestAnimationFrame(() => scoreRef.current?.focus());
      }
      return next;
    });
  }

  function removeFromDraft(index: number) {
    setDraft((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSaveDeck() {
    const saved = await onSubmitDeck({ draft, scoreText: score, editingId });
    if (!saved) return;
    clearDraft();
  }

  async function handleAddBulk() {
    const saved = await onSubmitBulk(bulkText);
    if (!saved) return;
    setBulkText("");
  }

  const title = useMemo(() => (editingId ? "덱 수정" : "덱 만들기"), [editingId]);

  return (
    <>
      <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        {boss && boss.image_path ? (
          <div className="mt-3 flex gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">{boss.title}</div>

              <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-400">
                {boss.description || "설명 없음"}
              </div>
            </div>

            <div className="w-[55%] max-w-[520px]">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPublicUrl("boss-images", boss.image_path)}
                  alt={boss.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        ) : boss ? (
          <div className="mt-2 text-sm text-neutral-300">보스는 있는데 이미지가 없어.</div>
        ) : (
          <div className="mt-2 text-sm text-neutral-300">보스 데이터가 없어.</div>
        )}
      </section>

      <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">추천 조합</h2>
          <div className="text-xs text-neutral-400">{decksCount}개 덱</div>
        </div>

        <div className="mt-3 rounded-2xl bg-neutral-950/40 p-3">
          {canRecommend ? (
            <>
              <div className="mb-2 flex items-end justify-between">
                <div className="text-sm text-neutral-300">총합</div>
                <div className="text-2xl font-bold tabular-nums">{fmt(best.total)}</div>
              </div>

              <div className="space-y-2">
                {best.picked.map((deck) => (
                  <div key={deck.id} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 text-sm text-neutral-200">{formatNikkeDisplayNames(deck.chars)}</div>
                      <div className="flex-none text-sm tabular-nums text-neutral-200">{fmt(deck.score)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-sm text-neutral-300">5덱 이상 추가 시 추천 조합 생성</div>
          )}
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">니케 선택 (클릭해서 덱 구성)</h2>

          <div className="flex gap-2">
            <button
              onClick={onResetSelected}
              className="rounded-xl border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 active:scale-[0.99]"
            >
              리스트 초기화
            </button>

            <button
              onClick={onGoToSettings}
              className="rounded-xl border border-neutral-700 px-3 py-2 text-sm active:scale-[0.99]"
            >
              설정으로
            </button>
          </div>
        </div>

        {selectedNikkes.length === 0 ? (
          <div className="mt-3 text-sm text-neutral-300">
            <span className="text-neutral-200">설정 탭</span>에서 최대 50개 선택 가능.
          </div>
        ) : (
          <>
            <div className="mt-2 text-xs text-neutral-400">
              선택됨: <span className="text-neutral-200">{selectedNikkes.length}</span> / {maxSelected}
            </div>

            <div className="mt-3 max-h-[30vh] overflow-y-auto pr-1 no-scrollbar overscroll-contain">
              <div className="grid grid-cols-5 gap-2">
                {selectedNikkes.map((nikke) => {
                  const url = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                  return (
                    <button
                      key={nikke.id}
                      onClick={() => addToDraft(nikke.name)}
                      className="flex flex-col items-center active:scale-[0.99]"
                      title={nikke.name}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {url ? (
                          <img src={url} alt={nikke.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-neutral-200 leading-tight break-words line-clamp-2 text-center">
                        {formatNikkeDisplayName(nikke.name)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="text-base font-semibold">{title}</h2>

        <div className="mt-3">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, index) => {
              const name = draft[index];
              const row = name ? nikkeMap.get(name) : undefined;
              const url = row?.image_path ? getPublicUrl("nikke-images", row.image_path) : "";

              return (
                <button
                  key={index}
                  onClick={() => (name ? removeFromDraft(index) : undefined)}
                  className="aspect-square overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40 active:scale-[0.99]"
                  title={name ? "클릭하면 제거" : "비어있음"}
                >
                  {name && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-lg text-neutral-600">+</div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-sm text-neutral-300">{draft.length ? draft.join(" / ") : "아직 선택 없음"}</div>

          <div className="mt-4">
            <input
              ref={scoreRef}
              inputMode="numeric"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSaveDeck();
                }
              }}
              placeholder="점수입력 (예: 6510755443)"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-base outline-none"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void handleSaveDeck()}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-base font-semibold text-neutral-900 active:scale-[0.99]"
            >
              {editingId ? "수정 저장" : "덱 저장"}
            </button>
            <button
              onClick={clearDraft}
              className="rounded-2xl border border-neutral-700 px-4 py-3 text-base active:scale-[0.99]"
            >
              비우기
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="text-base font-semibold">덱 일괄입력</h2>

        <textarea
          value={bulkText}
          onChange={(event) => setBulkText(event.target.value)}
          placeholder={`예) 세이렌 이브 라피 크라운 프리바티 6510755443
리타 / 앵커 / 리버렐리오 / 마스트 / 레이븐
3896714666
리타, 앵커, 리버렐리오, 마스트, 레이븐
383838883`}
          className="mt-3 h-32 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 p-3 text-sm outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void handleAddBulk()}
            className="flex-1 rounded-2xl bg-neutral-100 px-4 py-3 text-base font-semibold text-neutral-900 active:scale-[0.99]"
          >
            텍스트 추가
          </button>
          <button
            onClick={() => setBulkText("")}
            className="rounded-2xl border border-neutral-700 px-4 py-3 text-base active:scale-[0.99]"
          >
            비우기
          </button>
        </div>
      </section>
    </>
  );
}
