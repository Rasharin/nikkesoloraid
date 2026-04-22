"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatNikkeDisplayName, formatNikkeDisplayNames } from "../../../lib/nikke-display";
import DeckBuilderSection, {
  getDroppedDeckSlotTarget,
  getHoveredDeckSlotTarget,
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
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
};

type RecommendedDropTarget = {
  deckId: string;
  slotIndex: number;
};

type DeckSlotTarget = {
  deckIndex: number;
  slotIndex: number;
};

type HomeTabProps = {
  boss: BossRow | null;
  bosses: BossRow[];
  decksCount: number;
  canRecommend: boolean;
  best: {
    picked: Deck[];
    total: number;
  };
  fmt: (value: number) => string;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  selectedNames: string[];
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
  onUpdateDeckScore: (id: string, scoreText: string) => Promise<boolean>;
};

type RecommendedDeckSlotProps = {
  deckId: string;
  slotIndex: number;
  name: string;
  imageUrl: string;
  highlighted: boolean;
  canDrop: boolean;
};

function RecommendedDeckSlot({ deckId, slotIndex, name, imageUrl, highlighted, canDrop }: RecommendedDeckSlotProps) {
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, transform, isDragging } = useDraggable({
    id: `recommended-${deckId}-${slotIndex}`,
    data: {
      source: "recommended",
      nikkeName: name,
      slotIndex,
      recommendedDeckId: deckId,
    } satisfies DragItemData,
  });
  const { setNodeRef, isOver } = useDroppable({
    id: getRecommendedSlotId(deckId, slotIndex),
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDraggableNodeRef(node);
  };

  const stateClass = highlighted || isOver
    ? canDrop
      ? "border-cyan-300/90 bg-cyan-400/10 ring-2 ring-cyan-300/60 shadow-[0_0_0_1px_rgba(103,232,249,0.35)]"
      : "border-red-400/80 bg-red-400/10 ring-2 ring-red-400/45 shadow-[0_0_0_1px_rgba(248,113,113,0.28)]"
    : "border-neutral-800";

  return (
    <div key={`${deckId}-${slotIndex}`} className="min-w-0">
      <div
        ref={setRefs}
        style={style}
        className={`aspect-square overflow-hidden rounded-lg border bg-neutral-900 transition-all duration-150 ${
          isDragging ? "opacity-35" : ""
        } ${stateClass}`}
        {...attributes}
        {...listeners}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? (
          <img src={imageUrl} alt={name} draggable={false} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-neutral-600">no image</div>
        )}
      </div>
      <div className="mt-px text-center text-[10px] leading-[1.15] text-neutral-200">
        {formatNikkeDisplayName(name)}
      </div>
    </div>
  );
}

const HOME_DRAFT_STORAGE_KEY = "soloraid_home_draft_v1";
const HOME_MEMO_STORAGE_KEY = "soloraid_home_memo_v1";

function swapDraftSlots(draft: DraftSlot[], fromIndex: number, toIndex: number): DraftSlot[] {
  const next = [...draft];
  const fromValue = next[fromIndex] ?? null;
  next[fromIndex] = next[toIndex] ?? null;
  next[toIndex] = fromValue;
  return next;
}

export default function HomeTab({
  boss,
  bosses,
  decksCount,
  canRecommend,
  best,
  fmt,
  getPublicUrl,
  selectedNames,
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
  onUpdateDeckScore,
}: HomeTabProps) {
  const [draft, setDraft] = useState<DraftSlot[]>(() => createEmptyDraft());
  const [score, setScore] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);
  const [hoveredSlotTarget, setHoveredSlotTarget] = useState<DeckSlotTarget | null>(null);
  const [hoveredRecommendedTarget, setHoveredRecommendedTarget] = useState<RecommendedDropTarget | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);
  const [editingRecommendedDeckId, setEditingRecommendedDeckId] = useState<string | null>(null);
  const [editingRecommendedScore, setEditingRecommendedScore] = useState("");
  const [memoText, setMemoText] = useState("");
  const [isMemoEditing, setIsMemoEditing] = useState(false);
  const [bossInfoOpen, setBossInfoOpen] = useState(false);
  const [draftStorageReady, setDraftStorageReady] = useState(false);
  const [isDesktopDnd, setIsDesktopDnd] = useState(false);
  const scoreRef = useRef<HTMLInputElement | null>(null);
  const deckSectionRef = useRef<HTMLElement | null>(null);
  const memoTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncLayout = () => setIsDesktopDnd(mediaQuery.matches);
    syncLayout();

    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HOME_DRAFT_STORAGE_KEY);
      if (!raw) {
        setDraftStorageReady(true);
        return;
      }

      const parsed = JSON.parse(raw) as {
        deckDrafts?: Array<{
          draft?: DraftSlot[];
          score?: string;
          editingId?: string | null;
        }>;
        draft?: DraftSlot[];
        score?: string;
        editingId?: string | null;
      };

      if (Array.isArray(parsed.deckDrafts)) {
        const saved = parsed.deckDrafts[0];
        const restoredDraft = createEmptyDraft();
        if (Array.isArray(saved?.draft)) {
          saved.draft.slice(0, restoredDraft.length).forEach((value, slotIndex) => {
            restoredDraft[slotIndex] = typeof value === "string" ? value : null;
          });
        }
        setDraft(restoredDraft);
        setScore(typeof saved?.score === "string" ? saved.score : "");
        setEditingId(typeof saved?.editingId === "string" ? saved.editingId : null);
      } else if (Array.isArray(parsed.draft)) {
        const restoredDraft = createEmptyDraft();
        parsed.draft.slice(0, restoredDraft.length).forEach((value, index) => {
          restoredDraft[index] = typeof value === "string" ? value : null;
        });
        setDraft(restoredDraft);
        setScore(typeof parsed.score === "string" ? parsed.score : "");
        setEditingId(typeof parsed.editingId === "string" ? parsed.editingId : null);
      }
    } catch { }

    setDraftStorageReady(true);
  }, []);

  useEffect(() => {
    try {
      const rawMemo = localStorage.getItem(HOME_MEMO_STORAGE_KEY);
      if (typeof rawMemo === "string") {
        setMemoText(rawMemo);
      }
    } catch { }
  }, []);

  useEffect(() => {
    const textarea = memoTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [memoText, isMemoEditing]);

  useEffect(() => {
    try {
      localStorage.setItem(HOME_MEMO_STORAGE_KEY, memoText);
    } catch { }
  }, [memoText]);

  useEffect(() => {
    if (!editRequest) return;

    setDraft(buildDraftFromChars(editRequest.chars));
    setScore(String(editRequest.score));
    setEditingId(editRequest.id);
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

  function removeFromDraft(_deckIndex: number, slotIndex: number) {
    setDraft((prev) => prev.map((value, currentIndex) => (currentIndex === slotIndex ? null : value)));
  }

  async function handleSaveDeck() {
    const completeDraft = draft.filter((value): value is string => value !== null);
    await onSubmitDeck({ draft: completeDraft, scoreText: score, editingId });
  }

  async function handleAddBulk() {
    const saved = await onSubmitBulk(bulkText);
    if (!saved) return;
    setBulkText("");
  }

  function handleDragStart(event: DragStartEvent) {
    const { source, nikkeName, deckIndex, slotIndex, recommendedDeckId } = (event.active.data.current ?? {}) as Partial<DragItemData>;
    const initialRect = event.active.rect.current.initial;

    if (!nikkeName || (source !== "selected" && source !== "deck" && source !== "recommended")) {
      setActiveDrag(null);
      setOverlayWidth(null);
      return;
    }

    setActiveDrag({
      source,
      nikkeName,
      deckIndex,
      slotIndex,
      recommendedDeckId,
    });
    setOverlayWidth(initialRect?.width ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    setHoveredSlotTarget(getHoveredDeckSlotTarget(event));
    setHoveredRecommendedTarget(parseRecommendedDropTarget(event.over?.id));
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setHoveredSlotTarget(null);
    setHoveredRecommendedTarget(null);
    setOverlayWidth(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const droppedSlotTarget = getDroppedDeckSlotTarget(event);
    const recommendedTarget = parseRecommendedDropTarget(event.over?.id);
    const dragItem = (event.active.data.current ?? activeDrag) as DragItemData | null;

    setActiveDrag(null);
    setHoveredSlotTarget(null);
    setHoveredRecommendedTarget(null);
    setOverlayWidth(null);

    if (!dragItem) return;

    if (recommendedTarget && dragItem.nikkeName) {
      if (
        dragItem.source === "recommended" &&
        typeof dragItem.slotIndex === "number" &&
        dragItem.recommendedDeckId
      ) {
        if (dragItem.recommendedDeckId !== recommendedTarget.deckId) {
          return;
        }

        void moveRecommendedDeckNikke(dragItem.recommendedDeckId, dragItem.slotIndex, recommendedTarget.slotIndex);
        return;
      }

      void replaceRecommendedDeckNikke(recommendedTarget, dragItem.nikkeName);
      return;
    }

    if (dragItem.source === "selected") {
      if (!droppedSlotTarget) return;
      if (droppedSlotTarget.deckIndex !== 0) return;
      setDraft((prev) => {
        if (prev.includes(dragItem.nikkeName)) return prev;
        const nextDraft = [...prev];
        nextDraft[droppedSlotTarget.slotIndex] = dragItem.nikkeName;
        if (nextDraft.every((slot) => slot !== null)) {
          requestAnimationFrame(() => scoreRef.current?.focus());
        }
        return nextDraft;
      });
      return;
    }

    if (typeof dragItem.slotIndex !== "number") return;
    if (typeof dragItem.deckIndex === "number" && dragItem.deckIndex !== 0) return;
    if (isDroppedOutsideDeckSection(event, deckSectionRef.current)) {
      removeFromDraft(0, dragItem.slotIndex);
      return;
    }
    if (!droppedSlotTarget) {
      removeFromDraft(0, dragItem.slotIndex);
      return;
    }
    if (droppedSlotTarget.deckIndex !== 0) return;
    if (dragItem.slotIndex === droppedSlotTarget.slotIndex) return;
    setDraft((prev) => swapDraftSlots(prev, dragItem.slotIndex as number, droppedSlotTarget.slotIndex));
  }

  const title = "덱 만들기";
  const effectiveNikkeMap = useMemo(() => {
    const next = new Map(nikkeMap);
    selectedNames.forEach((name) => {
      if (!next.has(name)) {
        next.set(name, {
          id: `selected-fallback-${name}`,
          name,
          image_path: null,
          burst: null,
        });
      }
    });
    return next;
  }, [nikkeMap, selectedNames]);
  const effectiveSelectedNikkes = useMemo(() => {
    const byName = new Map(selectedNikkes.map((nikke) => [nikke.name, nikke]));
    return selectedNames.map((name) => byName.get(name) ?? effectiveNikkeMap.get(name)).filter((nikke): nikke is NikkeRow => Boolean(nikke));
  }, [effectiveNikkeMap, selectedNames, selectedNikkes]);
  const overlayNikke = activeDrag?.nikkeName ? effectiveNikkeMap.get(activeDrag.nikkeName) : undefined;
  const overlayUrl = overlayNikke?.image_path ? getPublicUrl("nikke-images", overlayNikke.image_path) : "";
  const selectedNikkesByBurst = useMemo(() => {
    const groups = [
      { key: "burst-1", label: "버스트 I", nikkes: [] as NikkeRow[] },
      { key: "burst-2", label: "버스트 II", nikkes: [] as NikkeRow[] },
      { key: "burst-3", label: "버스트 III", nikkes: [] as NikkeRow[] },
      { key: "burst-etc", label: "기타", nikkes: [] as NikkeRow[] },
    ];

    effectiveSelectedNikkes.forEach((nikke) => {
      const burst = nikke.burst;
      if (burst === 1) groups[0].nikkes.push(nikke);
      else if (burst === 2) groups[1].nikkes.push(nikke);
      else if (burst === 3) groups[2].nikkes.push(nikke);
      else groups[3].nikkes.push(nikke);
    });

    return groups;
  }, [effectiveSelectedNikkes]);

  async function saveRecommendedDeckScore(deckId: string) {
    const saved = await onUpdateDeckScore(deckId, editingRecommendedScore);
    if (!saved) return;
    setEditingRecommendedDeckId(null);
    setEditingRecommendedScore("");
  }

  async function replaceRecommendedDeckNikke(target: RecommendedDropTarget, nextName: string) {
    const targetDeck = best.picked.find((deck) => deck.id === target.deckId);
    if (!targetDeck) return;
    if (targetDeck.chars[target.slotIndex] === nextName) return;
    if (targetDeck.chars.includes(nextName)) {
      onShowToast("같은 니케는 한 덱에 두 번 넣을 수 없어");
      return;
    }

    const nextDraft = [...targetDeck.chars];
    nextDraft[target.slotIndex] = nextName;

    const otherRecommendedNames = new Set(
      best.picked
        .filter((deck) => deck.id !== target.deckId)
        .flatMap((deck) => deck.chars)
    );
    if (nextDraft.some((name) => otherRecommendedNames.has(name))) {
      onShowToast("추천 5덱끼리 니케가 겹치면 추천 조합이 깨져");
      return;
    }

    const saved = await onSubmitDeck({
      draft: nextDraft,
      scoreText: String(targetDeck.score),
      editingId: targetDeck.id,
    });

    if (saved) {
      onShowToast("추천 조합 덱 수정 완료");
    }
  }

  async function moveRecommendedDeckNikke(deckId: string, fromSlotIndex: number, toSlotIndex: number) {
    if (fromSlotIndex === toSlotIndex) return;

    const targetDeck = best.picked.find((deck) => deck.id === deckId);
    if (!targetDeck) return;

    const nextDraft = [...targetDeck.chars];
    const [moved] = nextDraft.splice(fromSlotIndex, 1);
    if (!moved) return;
    nextDraft.splice(toSlotIndex, 0, moved);

    const saved = await onSubmitDeck({
      draft: nextDraft,
      scoreText: String(targetDeck.score),
      editingId: targetDeck.id,
    });

    if (saved) {
      onShowToast("추천 조합 순서 변경 완료");
    }
  }

  function clearMemo() {
    setMemoText("");
    try {
      localStorage.removeItem(HOME_MEMO_STORAGE_KEY);
      onShowToast("메모 비우기 완료");
    } catch {
      onShowToast("메모 비우기 실패");
    }
    setIsMemoEditing(true);
  }

  function renderRecommendedDeckCard(deck: Deck, compact = false) {
    return (
      <div key={deck.id} className={`rounded-2xl border border-neutral-800 bg-neutral-950/70 ${compact ? "p-2" : "p-2.5"}`}>
        <div className="flex items-end justify-between gap-3">
          <div className={`flex items-start ${compact ? "gap-1.5" : "gap-2"}`}>
            {deck.chars.map((name, slotIndex) => {
              const nikke = effectiveNikkeMap.get(name);
              const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";
              const isHighlighted =
                hoveredRecommendedTarget?.deckId === deck.id && hoveredRecommendedTarget.slotIndex === slotIndex;

              return (
                <div key={`${deck.id}-${slotIndex}-${name}`} className={`min-w-0 ${compact ? "max-w-[50px]" : "max-w-[58px]"}`}>
                  <RecommendedDeckSlot
                    deckId={deck.id}
                    slotIndex={slotIndex}
                    name={name}
                    imageUrl={imageUrl}
                    highlighted={isHighlighted}
                    canDrop={canDropOnRecommendedSlot(deck.id, slotIndex, deck.chars, name, activeDrag)}
                  />
                </div>
              );
            })}
          </div>

          {editingRecommendedDeckId === deck.id ? (
            <input
              autoFocus
              inputMode="decimal"
              value={editingRecommendedScore}
              onChange={(event) => setEditingRecommendedScore(event.target.value)}
              onBlur={() => void saveRecommendedDeckScore(deck.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveRecommendedDeckScore(deck.id);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setEditingRecommendedDeckId(null);
                  setEditingRecommendedScore("");
                }
              }}
              style={{
                width: `${Math.max(editingRecommendedScore.length, String(deck.score).length, compact ? 8 : 10) + 2}ch`,
              }}
              className={`shrink-0 self-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-right font-semibold tabular-nums text-neutral-100 outline-none ${
                compact ? "min-w-[112px] text-lg" : "min-w-[144px] text-2xl"
              }`}
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => {
                setEditingRecommendedDeckId(deck.id);
                setEditingRecommendedScore(String(deck.score));
              }}
              className={`shrink-0 self-center font-semibold tabular-nums text-neutral-100 ${
                compact ? "text-lg" : "text-2xl"
              }`}
              title="더블 클릭해서 점수 수정"
            >
              {fmt(deck.score)}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderMemoSection(className?: string) {
    return (
      <section className={`rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)] ${className ?? ""}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">메모장</h2>
          <button
            onClick={clearMemo}
            className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99]"
          >
            비우기
          </button>
        </div>

        <textarea
          ref={memoTextareaRef}
          value={memoText}
          readOnly={!isMemoEditing}
          onDoubleClick={() => setIsMemoEditing(true)}
          onChange={(event) => setMemoText(event.target.value)}
          placeholder="메모장은 기기에 저장됩니다."
          className={`mt-4 w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/50 p-3 text-sm outline-none ${isMemoEditing ? "" : "cursor-default text-neutral-300"}`}
          rows={4}
        />
      </section>
    );
  }

  function renderBossSection(className?: string) {
    return (
      <section className={`flex self-start flex-col rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)] ${className ?? ""}`}>
        <button
          type="button"
          onClick={() => setBossInfoOpen((prev) => !prev)}
          className="flex items-center justify-between gap-4 text-left"
        >
          <h2 className="text-lg font-semibold">보스 정보</h2>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className={`text-neutral-400 transition ${bossInfoOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {bossInfoOpen ? (
          boss && boss.image_path ? (
            <div className="mt-4 grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(240px,40%)]">
              <div className="min-w-0">
                <div className="text-2xl font-semibold">{boss.title}</div>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-400">
                  {boss.description || "설명 없음"}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPublicUrl("boss-images", boss.image_path)}
                  alt={boss.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : boss ? (
            <div className="mt-4 text-sm text-neutral-300">보스는 있는데 이미지가 없어.</div>
          ) : (
            <div className="mt-4 text-sm text-neutral-300">보스 데이터가 없어.</div>
          )
        ) : null}
      </section>
    );
  }

  function renderSelectedNikkeGroups(compact = false) {
    const gridClass = compact
      ? "grid grid-cols-5 gap-2"
      : "grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-x-2 gap-y-3 xl:grid-cols-[repeat(auto-fill,minmax(80px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]";

    return (
      <div className={compact ? "visible-scrollbar mt-3 max-h-[34vh] space-y-4 overflow-y-auto pr-1 overscroll-contain" : "visible-scrollbar mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 overscroll-contain"}>
        {selectedNikkesByBurst.map((group) =>
          group.nikkes.length > 0 ? (
            <div key={group.key}>
              <div className="mb-2 border-b border-neutral-800 pb-1 text-xs text-neutral-400">
                <span className="font-medium text-neutral-200">{group.label}</span>
              </div>
              <div className={gridClass}>
                {group.nikkes.map((nikke) => {
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
          ) : null
        )}
      </div>
    );
  }

  function renderDeckBuilders(className?: string) {
    return (
      <section ref={deckSectionRef} className={`rounded-3xl border border-neutral-800 bg-neutral-900/50 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] ${className ?? ""}`}>
        <h2 className="text-lg font-semibold">{title}</h2>

        <div className="mt-4 grid gap-3">
          <DeckBuilderSection
            deckIndex={0}
            draft={draft}
            nikkeMap={effectiveNikkeMap}
            getPublicUrl={getPublicUrl}
            score={score}
            scoreRef={scoreRef}
            editingId={editingId}
            activeDrag={activeDrag}
            hoveredSlotIndex={hoveredSlotTarget?.deckIndex === 0 ? hoveredSlotTarget.slotIndex : null}
            onScoreChange={setScore}
            onRemoveFromDraft={(slotIndex) => removeFromDraft(0, slotIndex)}
            onSaveDeck={() => void handleSaveDeck()}
            onClearDraft={clearDraft}
            className="border-neutral-800 bg-neutral-950/30 p-2.5 shadow-none"
          />
        </div>
      </section>
    );
  }

  function renderBulkSection(className?: string) {
    return (
      <section className={`rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)] ${className ?? ""}`}>
        <h2 className="text-lg font-semibold">텍스트로 덱 추가</h2>
        <div className="mt-1 text-sm text-neutral-400">여러 덱을 한 번에 붙여넣어 저장할 수 있어요.</div>

        <textarea
          value={bulkText}
          onChange={(event) => setBulkText(event.target.value)}
          placeholder={`예) 세이렌 이브 라피 크라운 프리바티 6510755443
리타 / 앵커 / 리버렐리오 / 마스트 / 레이븐
3896714666
리타, 앵커, 리버렐리오, 마스트, 레이븐
383838883`}
          className="mt-4 h-[160px] w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 p-3 text-sm outline-none xl:h-[180px]"
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
    );
  }

  return (
    <>
      <div className="space-y-5 lg:hidden">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <button
            type="button"
            onClick={() => setBossInfoOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h2 className="text-base font-semibold">보스 정보</h2>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className={`text-neutral-400 transition ${bossInfoOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {bossInfoOpen ? (
            boss && boss.image_path ? (
              <div className="mt-3 space-y-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPublicUrl("boss-images", boss.image_path)}
                    alt={boss.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-lg font-semibold">{boss.title}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-400">{boss.description || "설명 없음"}</div>
                </div>
              </div>
            ) : boss ? (
              <div className="mt-2 text-sm text-neutral-300">보스는 있는데 이미지가 없어.</div>
            ) : (
              <div className="mt-2 text-sm text-neutral-300">보스 데이터가 없어.</div>
            )
          ) : null}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">추천 조합</h2>
            <div className="text-xs text-neutral-400">{decksCount}개 덱</div>
          </div>
          <div className="mt-3 rounded-2xl bg-neutral-950/40 p-3">
            {canRecommend ? (
              <>
                <div className="mb-3 flex items-start gap-3">
                  <div className="w-[46%] max-w-[240px] shrink-0 whitespace-pre-line text-xs leading-5 text-neutral-400">
                    니케 이미지 드래그로 위치 변경 가능{"\n"}
                    니케 선택에서 드래그로 니케 변경 가능{"\n"}
                    점수 더블클릭으로 수정 가능
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-neutral-300">총합</div>
                      <div className="text-2xl font-bold tabular-nums">{fmt(best.total)}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {best.picked.map((deck) => renderRecommendedDeckCard(deck, true))}
                </div>
              </>
            ) : (
              <div className="text-sm text-neutral-300">5덱 이상 추가 시 추천 조합 생성</div>
            )}
          </div>
        </section>
      </div>

      <div className="hidden">
        <section className="flex self-start flex-col rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">추천 조합</h2>
            <div className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {decksCount}개 덱
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-neutral-950/50 p-3">
            {canRecommend ? (
              <>
                <div className="mb-3 flex items-end justify-end gap-3">
                  <div className="text-xl font-semibold text-neutral-200">총합</div>
                  <div className="text-3xl font-bold tabular-nums">{fmt(best.total)}</div>
                </div>

                <div className="space-y-2">
                  {best.picked.map((deck) => renderRecommendedDeckCard(deck))}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-300">
                5덱 이상 추가 시 추천 조합 생성
              </div>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="flex self-start flex-col rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">보스 정보</h2>
            </div>

            {boss && boss.image_path ? (
              <div className="mt-4 grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(240px,40%)]">
                <div className="min-w-0">
                  <div className="text-2xl font-semibold">{boss.title}</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-400">
                    {boss.description || "설명 없음"}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPublicUrl("boss-images", boss.image_path)}
                    alt={boss.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ) : boss ? (
              <div className="mt-4 text-sm text-neutral-300">보스는 있는데 이미지가 없어.</div>
            ) : (
              <div className="mt-4 text-sm text-neutral-300">보스 데이터가 없어.</div>
            )}
          </section>

          {renderMemoSection()}

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
            <h2 className="text-lg font-semibold">텍스트로 덱 추가</h2>
            <div className="mt-1 text-sm text-neutral-400">여러 덱을 한 번에 붙여넣어 저장할 수 있어요.</div>

            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder={`예) 세이렌 이브 라피 크라운 프리바티 6510755443
리타 / 앵커 / 리버렐리오 / 마스트 / 레이븐
3896714666
리타, 앵커, 리버렐리오, 마스트, 레이븐
383838883`}
              className="mt-4 h-[160px] w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 p-3 text-sm outline-none xl:h-[180px]"
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
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {isDesktopDnd ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.95fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(400px,0.95fr)]">
            <div className="space-y-5">
              <section className="flex self-start flex-col rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">추천 조합</h2>
                  <div className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                    {decksCount}개 덱
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-neutral-950/50 p-3">
                  {canRecommend ? (
                    <>
                      <div className="mb-4 flex items-start gap-4">
                        <div className="w-[42%] max-w-[300px] shrink-0 whitespace-pre-line text-sm leading-6 text-neutral-400">
                          니케 이미지 드래그로 위치 변경 가능{"\n"}
                          니케 선택에서 드래그로 니케 변경 가능{"\n"}
                          점수 더블클릭으로 수정 가능
                        </div>
                        <div className="min-w-0 flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-base font-semibold text-neutral-300">총합</div>
                            <div className="text-3xl font-bold tabular-nums">{fmt(best.total)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {best.picked.map((deck) => renderRecommendedDeckCard(deck))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-300">
                      5덱 이상 추가 시 추천 조합 생성
                    </div>
                  )}
                </div>
              </section>

              <section className="flex min-h-0 flex-col rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">니케 선택</h2>
                    <div className="mt-1 text-sm text-neutral-400">클릭 또는 드래그로 덱 구성</div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
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

                {effectiveSelectedNikkes.length === 0 ? (
                  <div className="mt-4 text-sm text-neutral-300">
                    <span className="text-neutral-200">설정 탭</span>에서 최대 {maxSelected}개 선택 가능.
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-neutral-400">
                      <div>
                        선택됨: <span className="text-neutral-200">{effectiveSelectedNikkes.length}</span> / {maxSelected}
                      </div>
                      <div>니케를 드래그 하거나 클릭하여 덱에 추가 가능</div>
                    </div>

                    {renderSelectedNikkeGroups()}
                  </>
                )}
              </section>
            </div>

            <div className="space-y-5 min-w-0">
              {renderBossSection()}

              {renderMemoSection()}

              {renderDeckBuilders()}

              {renderBulkSection()}
            </div>
          </div>
        ) : (
          <>
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

              {effectiveSelectedNikkes.length === 0 ? (
                <div className="mt-3 text-sm text-neutral-300">
                  <span className="text-neutral-200">설정 탭</span>에서 최대 {maxSelected}개 선택 가능.
                </div>
              ) : (
                <>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-neutral-400">
                    <div>
                      선택됨: <span className="text-neutral-200">{effectiveSelectedNikkes.length}</span> / {maxSelected}
                    </div>
                    <div>니케를 드래그 하거나 클릭하여 덱에 추가 가능</div>
                  </div>

                  {renderSelectedNikkeGroups(true)}
                </>
              )}
            </section>

            {renderDeckBuilders("mb-5")}
          </>
        )}

        <DragOverlay zIndex={80} dropAnimation={null}>
          {renderDragOverlayCard(overlayNikke, overlayUrl, overlayWidth)}
        </DragOverlay>
      </DndContext>

      {renderBulkSection("lg:hidden")}
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

function getRecommendedSlotId(deckId: string, slotIndex: number): string {
  return `recommended-slot-${deckId}-${slotIndex}`;
}

function parseRecommendedDropTarget(id: unknown): RecommendedDropTarget | null {
  if (typeof id !== "string") return null;
  if (!id.startsWith("recommended-slot-")) return null;

  const rest = id.slice("recommended-slot-".length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash === -1) return null;

  const deckId = rest.slice(0, lastDash);
  const slotIndex = Number(rest.slice(lastDash + 1));
  if (!deckId || !Number.isInteger(slotIndex)) return null;

  return { deckId, slotIndex };
}

function canDropOnRecommendedSlot(
  deckId: string,
  slotIndex: number,
  deckChars: string[],
  currentName: string,
  activeDrag: DragItemData | null
): boolean {
  if (!activeDrag?.nikkeName) return false;

  if (activeDrag.source === "recommended") {
    if (activeDrag.recommendedDeckId !== deckId) return false;
    return activeDrag.slotIndex !== slotIndex;
  }

  if (activeDrag.source !== "selected") return false;
  if (activeDrag.nikkeName === currentName) return true;

  return !deckChars.includes(activeDrag.nikkeName);
}
