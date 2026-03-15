"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatNikkeDisplayNames } from "../../../lib/nikke-display";
import DeckBuilderSection, {
  getDroppedSlotIndex,
  getHoveredSlotIndex,
  moveDraftSlot,
  renderDragOverlayCard,
} from "../home/DeckBuilderSection";
import DraggableNikkeCard from "../home/DraggableNikkeCard";
import {
  buildDraftFromChars,
  createEmptyDraft,
  type DragItemData,
  type DraftSlot,
  type NikkeRow,
} from "../home/deckBuilderTypes";

type Deck = {
  id: string;
  chars: string[];
  score: number;
  createdAt: number;
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
  onRemoveSelectedNikke: (name: string) => void;
  onGoToSettings: () => void;
  onShowToast: (message: string) => void;
  onSubmitDeck: (payload: { draft: string[]; scoreText: string; editingId: string | null }) => Promise<boolean>;
  onSubmitBulk: (text: string) => Promise<boolean>;
};

const HOME_DRAFT_STORAGE_KEY = "soloraid_home_draft_v1";

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
  onRemoveSelectedNikke,
  onGoToSettings,
  onShowToast,
  onSubmitDeck,
  onSubmitBulk,
}: HomeTabProps) {
  const [draft, setDraft] = useState<DraftSlot[]>(() => createEmptyDraft());
  const [score, setScore] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [draftStorageReady, setDraftStorageReady] = useState(false);
  const scoreRef = useRef<HTMLInputElement | null>(null);
  const deckSectionRef = useRef<HTMLElement | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HOME_DRAFT_STORAGE_KEY);
      if (!raw) {
        setDraftStorageReady(true);
        return;
      }

      const parsed = JSON.parse(raw) as {
        draft?: DraftSlot[];
        score?: string;
        editingId?: string | null;
      };

      if (Array.isArray(parsed.draft)) {
        const restoredDraft = createEmptyDraft();
        parsed.draft.slice(0, restoredDraft.length).forEach((value, index) => {
          restoredDraft[index] = typeof value === "string" ? value : null;
        });
        setDraft(restoredDraft);
      }

      if (typeof parsed.score === "string") {
        setScore(parsed.score);
      }

      if (typeof parsed.editingId === "string" || parsed.editingId === null) {
        setEditingId(parsed.editingId ?? null);
      }
    } catch { }

    setDraftStorageReady(true);
  }, []);

  useEffect(() => {
    if (!editRequest) return;

    setEditingId(editRequest.id);
    setDraft(buildDraftFromChars(editRequest.chars));
    setScore(String(editRequest.score));
    requestAnimationFrame(() => scoreRef.current?.focus());
    onShowToast("수정 모드: 니케 변경 후 점수 저장");
    onEditRequestConsumed();
  }, [editRequest, onEditRequestConsumed, onShowToast]);

  useEffect(() => {
    if (!draftStorageReady) return;

    const hasDraft = draft.some((slot) => slot !== null);
    const hasScore = score.trim().length > 0;

    try {
      if (!hasDraft && !hasScore && !editingId) {
        sessionStorage.removeItem(HOME_DRAFT_STORAGE_KEY);
        return;
      }

      sessionStorage.setItem(
        HOME_DRAFT_STORAGE_KEY,
        JSON.stringify({
          draft,
          score,
          editingId,
        })
      );
    } catch { }
  }, [draft, score, editingId, draftStorageReady]);

  function clearDraft() {
    setDraft(createEmptyDraft());
    setScore("");
    setEditingId(null);
    requestAnimationFrame(() => scoreRef.current?.focus());
  }

  function addToDraft(name: string) {
    setDraft((prev) => {
      if (prev.includes(name)) return prev;

      const emptyIndex = prev.findIndex((slot) => slot === null);
      if (emptyIndex === -1) return prev;

      const next = [...prev];
      next[emptyIndex] = name;
      if (next.every((slot) => slot !== null)) {
        requestAnimationFrame(() => scoreRef.current?.focus());
      }
      return next;
    });
  }

  function removeFromDraft(index: number) {
    setDraft((prev) => prev.map((value, currentIndex) => (currentIndex === index ? null : value)));
  }

  async function handleSaveDeck() {
    const completeDraft = draft.filter((value): value is string => value !== null);
    const saved = await onSubmitDeck({ draft: completeDraft, scoreText: score, editingId });
    if (!saved) return;
    clearDraft();
  }

  async function handleAddBulk() {
    const saved = await onSubmitBulk(bulkText);
    if (!saved) return;
    setBulkText("");
  }

  function handleDragStart(event: DragStartEvent) {
    const { source, nikkeName, slotIndex } = (event.active.data.current ?? {}) as Partial<DragItemData>;

    if (!nikkeName || (source !== "selected" && source !== "deck")) {
      setActiveDrag(null);
      return;
    }

    setActiveDrag({
      source,
      nikkeName,
      slotIndex,
    });
  }

  function handleDragOver(event: DragOverEvent) {
    setHoveredSlotIndex(getHoveredSlotIndex(event));
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setHoveredSlotIndex(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const droppedSlotIndex = getDroppedSlotIndex(event);
    const dragItem = activeDrag;

    setActiveDrag(null);
    setHoveredSlotIndex(null);

    if (!dragItem) return;

    if (dragItem.source === "selected") {
      if (droppedSlotIndex === null) return;
      setDraft((prev) => {
        if (prev[droppedSlotIndex] !== null) return prev;
        if (prev.includes(dragItem.nikkeName)) return prev;

        const next = [...prev];
        next[droppedSlotIndex] = dragItem.nikkeName;
        if (next.every((slot) => slot !== null)) {
          requestAnimationFrame(() => scoreRef.current?.focus());
        }
        return next;
      });
      return;
    }

    if (typeof dragItem.slotIndex !== "number") return;
    if (isDroppedOutsideDeckSection(event, deckSectionRef.current)) {
      removeFromDraft(dragItem.slotIndex);
      return;
    }
    if (droppedSlotIndex === null) {
      removeFromDraft(dragItem.slotIndex);
      return;
    }
    if (dragItem.slotIndex === droppedSlotIndex) return;
    setDraft((prev) => moveDraftSlot(prev, dragItem.slotIndex as number, droppedSlotIndex));
  }

  const title = useMemo(() => (editingId ? "덱 수정" : "덱 만들기"), [editingId]);
  const overlayNikke = activeDrag?.nikkeName ? nikkeMap.get(activeDrag.nikkeName) : undefined;
  const overlayUrl = overlayNikke?.image_path ? getPublicUrl("nikke-images", overlayNikke.image_path) : "";

  return (
    <>
      <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        {boss && boss.image_path ? (
          <div className="mt-3 flex gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">{boss.title}</div>

              <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-400">{boss.description || "설명 없음"}</div>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">니케 선택 (클릭 또는 드래그로 덱 구성)</h2>

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
              <span className="text-neutral-200">설정 탭</span>에서 최대 {maxSelected}개 선택 가능.
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-neutral-400">
                <div>
                  선택됨: <span className="text-neutral-200">{selectedNikkes.length}</span> / {maxSelected}
                </div>
                <div>니케를 드래그 하거나 클릭하여 덱에 추가 가능</div>
              </div>

              <div className="visible-scrollbar mt-3 max-h-[30vh] overflow-y-auto pr-1 overscroll-contain">
                <div className="grid grid-cols-5 gap-2">
                  {selectedNikkes.map((nikke) => {
                    const imageUrl = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                    return (
                      <DraggableNikkeCard
                        key={nikke.id}
                        nikke={nikke}
                        imageUrl={imageUrl}
                        onAdd={addToDraft}
                        onRemove={onRemoveSelectedNikke}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <DeckBuilderSection
          title={title}
          draft={draft}
          nikkeMap={nikkeMap}
          getPublicUrl={getPublicUrl}
          score={score}
          scoreRef={scoreRef}
          sectionRef={deckSectionRef}
          editingId={editingId}
          activeDrag={activeDrag}
          hoveredSlotIndex={hoveredSlotIndex}
          onScoreChange={setScore}
          onRemoveFromDraft={removeFromDraft}
          onSaveDeck={() => void handleSaveDeck()}
          onClearDraft={clearDraft}
        />

        <DragOverlay dropAnimation={null}>{renderDragOverlayCard(overlayNikke, overlayUrl)}</DragOverlay>
      </DndContext>

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

function isDroppedOutsideDeckSection(event: DragEndEvent, sectionElement: HTMLElement | null): boolean {
  if (!sectionElement) return false;

  const translated = event.active.rect.current.translated;
  if (!translated) return false;

  const centerX = translated.left + translated.width / 2;
  const centerY = translated.top + translated.height / 2;
  const rect = sectionElement.getBoundingClientRect();

  return centerX < rect.left || centerX > rect.right || centerY < rect.top || centerY > rect.bottom;
}

