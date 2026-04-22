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
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import DeckBuilderSection, {
  getDroppedDeckSlotTarget,
  getHoveredDeckSlotTarget,
  renderDragOverlayCard,
} from "../home/DeckBuilderSection";
import DraggableNikkeCard from "../home/DraggableNikkeCard";
import { createEmptyDraft, type DragItemData, type DraftSlot, type NikkeRow } from "../home/deckBuilderTypes";

type SavedPlan = {
  bossName: string;
  seasonName: string;
  weakElement: string;
  targetScore: string;
  gimmicks: string;
};

type DeckSlotTarget = {
  deckIndex: number;
  slotIndex: number;
};

type DeckDraftState = {
  id: number;
  draft: DraftSlot[];
  score: string;
  editingId: string | null;
};

type DeckBuildingTabProps = {
  selectedNames: string[];
  selectedNikkes: NikkeRow[];
  maxSelected: number;
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  onResetSelected: () => void;
  onRemoveSelectedNikke: (name: string) => void;
  onGoToSettings: () => void;
  onShowToast: (message: string) => void;
  onSubmitDeck: (payload: { draft: string[]; scoreText: string; editingId: string | null }) => Promise<boolean>;
};

const STORAGE_KEY = "soloraid_deck_building_plan_v1";
const LEGACY_STORAGE_KEY = "soloraid_imaginary_plan_v1";
const DRAFT_STORAGE_KEY = "soloraid_deck_building_draft_v1";
const DECK_DRAFT_COUNT = 5;
const SPARE_SLOT_COUNT = 10;
const ELEMENTS = ["철갑", "작열", "풍압", "수냉", "전격"];

function getSpareSlotId(index: number): string {
  return `deck-building-spare-slot-${index}`;
}

function parseSpareSlotIndex(id: unknown): number | null {
  if (typeof id !== "string") return null;
  if (!id.startsWith("deck-building-spare-slot-")) return null;

  const index = Number(id.slice("deck-building-spare-slot-".length));
  return Number.isInteger(index) ? index : null;
}

function CollapseIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={`text-neutral-400 transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function createDefaultPlan(): SavedPlan {
  return {
    bossName: "",
    seasonName: "",
    weakElement: "철갑",
    targetScore: "",
    gimmicks: "",
  };
}

function normalizePlan(value: unknown): SavedPlan {
  if (!value || typeof value !== "object") return createDefaultPlan();

  const candidate = value as Partial<SavedPlan>;
  return {
    bossName: typeof candidate.bossName === "string" ? candidate.bossName : "",
    seasonName: typeof candidate.seasonName === "string" ? candidate.seasonName : "",
    weakElement: typeof candidate.weakElement === "string" && ELEMENTS.includes(candidate.weakElement) ? candidate.weakElement : "철갑",
    targetScore: typeof candidate.targetScore === "string" ? candidate.targetScore : "",
    gimmicks: typeof candidate.gimmicks === "string" ? candidate.gimmicks : "",
  };
}

function createEmptyDeckDrafts(): DeckDraftState[] {
  return Array.from({ length: DECK_DRAFT_COUNT }, (_, index) => ({
    id: index + 1,
    draft: createEmptyDraft(),
    score: "",
    editingId: null,
  }));
}

function createEmptySpareSlots(): DraftSlot[] {
  return Array.from({ length: SPARE_SLOT_COUNT }, () => null);
}

function normalizeDraftSlots(value: unknown, length: number): DraftSlot[] {
  const next = Array.from({ length }, () => null) as DraftSlot[];
  if (!Array.isArray(value)) return next;

  value.slice(0, length).forEach((slot, index) => {
    next[index] = typeof slot === "string" ? slot : null;
  });

  return next;
}

function normalizeSavedDeckDrafts(value: unknown): DeckDraftState[] {
  const empty = createEmptyDeckDrafts();
  if (!Array.isArray(value)) return empty;

  return empty.map((deck, index) => {
    const saved = value[index] as Partial<DeckDraftState> | undefined;
    if (!saved || typeof saved !== "object") return deck;

    return {
      id: deck.id,
      draft: normalizeDraftSlots(saved.draft, deck.draft.length),
      score: typeof saved.score === "string" ? saved.score : "",
      editingId: typeof saved.editingId === "string" ? saved.editingId : null,
    };
  });
}

function swapDraftSlots(draft: DraftSlot[], fromIndex: number, toIndex: number): DraftSlot[] {
  const next = [...draft];
  const fromValue = next[fromIndex] ?? null;
  next[fromIndex] = next[toIndex] ?? null;
  next[toIndex] = fromValue;
  return next;
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

type SpareSlotProps = {
  index: number;
  name: string | null;
  nikke: NikkeRow | undefined;
  imageUrl: string;
  activeDrag: DragItemData | null;
  hovered: boolean;
  canDrop: boolean;
  onRemove: (index: number) => void;
};

function SpareSlot({ index, name, nikke, imageUrl, activeDrag, hovered, canDrop, onRemove }: SpareSlotProps) {
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, transform, isDragging } = useDraggable({
    id: `spare-drag-${index}`,
    disabled: !name,
    data: {
      source: "spare",
      slotIndex: index,
      nikkeName: name ?? undefined,
    } satisfies Partial<DragItemData>,
  });
  const { setNodeRef, isOver } = useDroppable({
    id: getSpareSlotId(index),
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDraggableNodeRef(node);
  };
  const isFilled = Boolean(name && nikke);
  const displayName = nikke ? formatNikkeDisplayName(nikke.name) : "";
  const showDropHint = (hovered || isOver) && Boolean(activeDrag);
  const stateClass = showDropHint
    ? canDrop
      ? "border-cyan-300/90 bg-cyan-400/10 ring-2 ring-cyan-300/60 shadow-[0_0_0_1px_rgba(103,232,249,0.35)]"
      : "border-red-400/80 bg-red-400/10 ring-2 ring-red-400/45 shadow-[0_0_0_1px_rgba(248,113,113,0.28)]"
    : isDragging
      ? "border-white/20 bg-neutral-950/20 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
      : "border-neutral-800";

  return (
    <div ref={setRefs} style={style} className="relative isolate min-w-0 transition-transform">
      <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border bg-neutral-950/40 transition-all duration-150 ${stateClass}`}>
        {isFilled ? (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className={`h-full w-full cursor-grab select-none touch-none transition-all duration-150 active:cursor-grabbing ${
              isDragging ? "scale-[0.97] opacity-35 saturate-50" : "opacity-100"
            }`}
            title={displayName}
            aria-label={displayName}
            {...attributes}
            {...listeners}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={displayName} draggable={false} className="pointer-events-none h-full w-full object-cover" />
          </button>
        ) : (
          <div className="grid h-full w-full place-items-center text-lg text-neutral-600">+</div>
        )}
      </div>
    </div>
  );
}

function canDropOnSpareSlot(index: number, activeDrag: DragItemData | null, spareSlots: DraftSlot[]): boolean {
  if (!activeDrag?.nikkeName) return false;

  if (activeDrag.source === "selected" || activeDrag.source === "deck") {
    return !spareSlots.includes(activeDrag.nikkeName);
  }

  if (activeDrag.source !== "spare" || typeof activeDrag.slotIndex !== "number") {
    return false;
  }

  if (activeDrag.slotIndex === index) {
    return false;
  }

  return !spareSlots.includes(activeDrag.nikkeName) || spareSlots[index] === activeDrag.nikkeName;
}

export default function ImaginarySoloRaidTab({
  selectedNames,
  selectedNikkes,
  maxSelected,
  nikkeMap,
  getPublicUrl,
  onResetSelected,
  onRemoveSelectedNikke,
  onGoToSettings,
  onShowToast,
  onSubmitDeck,
}: DeckBuildingTabProps) {
  const [plan, setPlan] = useState<SavedPlan>(() => createDefaultPlan());
  const [storageReady, setStorageReady] = useState(false);
  const [planOpen, setPlanOpen] = useState(true);
  const [deckOpen, setDeckOpen] = useState(true);
  const [nikkeOpen, setNikkeOpen] = useState(true);
  const [deckDrafts, setDeckDrafts] = useState<DeckDraftState[]>(() => createEmptyDeckDrafts());
  const [spareSlots, setSpareSlots] = useState<DraftSlot[]>(() => createEmptySpareSlots());
  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);
  const [hoveredSlotTarget, setHoveredSlotTarget] = useState<DeckSlotTarget | null>(null);
  const [hoveredSpareSlotIndex, setHoveredSpareSlotIndex] = useState<number | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);
  const scoreRefs = useRef<Array<HTMLInputElement | null>>([]);
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
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        setPlan(normalizePlan(JSON.parse(raw)));
      }

      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as {
          deckDrafts?: unknown;
          spareSlots?: unknown;
        };
        setDeckDrafts(normalizeSavedDeckDrafts(parsed.deckDrafts));
        setSpareSlots(normalizeDraftSlots(parsed.spareSlots, SPARE_SLOT_COUNT));
      }
    } catch {}

    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {}
  }, [plan, storageReady]);

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
    return selectedNames
      .map((name) => byName.get(name) ?? effectiveNikkeMap.get(name))
      .filter((nikke): nikke is NikkeRow => Boolean(nikke));
  }, [effectiveNikkeMap, selectedNames, selectedNikkes]);

  const selectedNikkesByBurst = useMemo(() => {
    const groups = [
      { key: "burst-1", label: "버스트 I", nikkes: [] as NikkeRow[] },
      { key: "burst-2", label: "버스트 II", nikkes: [] as NikkeRow[] },
      { key: "burst-3", label: "버스트 III", nikkes: [] as NikkeRow[] },
      { key: "burst-etc", label: "기타", nikkes: [] as NikkeRow[] },
    ];

    effectiveSelectedNikkes.forEach((nikke) => {
      if (nikke.burst === 1) groups[0].nikkes.push(nikke);
      else if (nikke.burst === 2) groups[1].nikkes.push(nikke);
      else if (nikke.burst === 3) groups[2].nikkes.push(nikke);
      else groups[3].nikkes.push(nikke);
    });

    return groups;
  }, [effectiveSelectedNikkes]);

  const overlayNikke = activeDrag?.nikkeName ? effectiveNikkeMap.get(activeDrag.nikkeName) : undefined;
  const overlayUrl = overlayNikke?.image_path ? getPublicUrl("nikke-images", overlayNikke.image_path) : "";

  function updatePlan<K extends keyof SavedPlan>(key: K, value: SavedPlan[K]) {
    setPlan((prev) => ({ ...prev, [key]: value }));
  }

  function resetPlan() {
    setPlan(createDefaultPlan());
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
  }

  function updateDeckScore(deckIndex: number, scoreText: string) {
    setDeckDrafts((prev) => prev.map((deck, index) => (index === deckIndex ? { ...deck, score: scoreText } : deck)));
  }

  function clearDraft(deckIndex: number) {
    setDeckDrafts((prev) =>
      prev.map((deck, index) => (index === deckIndex ? { ...deck, draft: createEmptyDraft(), score: "", editingId: null } : deck))
    );
    requestAnimationFrame(() => scoreRefs.current[deckIndex]?.focus());
  }

  function addToDraft(name: string) {
    setDeckDrafts((prev) => {
      const targetIndex = prev.findIndex((deck) => !deck.draft.includes(name) && deck.draft.some((slot) => slot === null));
      if (targetIndex === -1) return prev;

      return prev.map((deck, index) => {
        if (index !== targetIndex) return deck;
        const emptyIndex = deck.draft.findIndex((slot) => slot === null);
        if (emptyIndex === -1) return deck;

        const nextDraft = [...deck.draft];
        nextDraft[emptyIndex] = name;
        if (nextDraft.every((slot) => slot !== null)) {
          requestAnimationFrame(() => scoreRefs.current[index]?.focus());
        }
        return { ...deck, draft: nextDraft };
      });
    });
  }

  function removeFromDraft(deckIndex: number, slotIndex: number) {
    setDeckDrafts((prev) =>
      prev.map((deck, index) =>
        index === deckIndex
          ? { ...deck, draft: deck.draft.map((value, currentIndex) => (currentIndex === slotIndex ? null : value)) }
          : deck
      )
    );
  }

  function removeFromSpareSlots(slotIndex: number) {
    setSpareSlots((prev) => prev.map((value, currentIndex) => (currentIndex === slotIndex ? null : value)));
  }

  function saveDraftToLocal() {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          deckDrafts,
          spareSlots,
          savedAt: Date.now(),
        })
      );
    } catch {
      onShowToast("임시저장 실패");
      return;
    }
    onShowToast("임시저장 완료");
  }

  function renderSpareSlots() {
    return (
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-2.5">
        <div className="grid grid-cols-5 gap-2">
          {spareSlots.map((name, index) => {
            const nikke = name ? effectiveNikkeMap.get(name) : undefined;
            const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

            return (
              <SpareSlot
                key={getSpareSlotId(index)}
                index={index}
                name={name}
                nikke={nikke}
                imageUrl={imageUrl}
                activeDrag={activeDrag}
                hovered={hoveredSpareSlotIndex === index}
                canDrop={canDropOnSpareSlot(index, activeDrag, spareSlots)}
                onRemove={removeFromSpareSlots}
              />
            );
          })}
        </div>
      </section>
    );
  }

  async function handleSaveDeck(deckIndex: number) {
    const target = deckDrafts[deckIndex];
    if (!target) return;
    const completeDraft = target.draft.filter((value): value is string => value !== null);
    await onSubmitDeck({ draft: completeDraft, scoreText: target.score, editingId: target.editingId });
  }

  async function handleSaveAllDecks() {
    for (const deck of deckDrafts) {
      const completeDraft = deck.draft.filter((value): value is string => value !== null);
      const hasAnyValue = completeDraft.length > 0 || deck.score.trim().length > 0;
      if (!hasAnyValue) continue;
      await onSubmitDeck({ draft: completeDraft, scoreText: deck.score, editingId: deck.editingId });
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { source, nikkeName, deckIndex, slotIndex } = (event.active.data.current ?? {}) as Partial<DragItemData>;
    const initialRect = event.active.rect.current.initial;

    if (!nikkeName || (source !== "selected" && source !== "deck" && source !== "spare")) {
      setActiveDrag(null);
      setOverlayWidth(null);
      return;
    }

    setActiveDrag({
      source,
      nikkeName,
      deckIndex,
      slotIndex,
    });
    setOverlayWidth(initialRect?.width ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    setHoveredSlotTarget(getHoveredDeckSlotTarget(event));
    setHoveredSpareSlotIndex(parseSpareSlotIndex(event.over?.id));
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setHoveredSlotTarget(null);
    setHoveredSpareSlotIndex(null);
    setOverlayWidth(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const droppedSlotTarget = getDroppedDeckSlotTarget(event);
    const droppedSpareSlotIndex = parseSpareSlotIndex(event.over?.id);
    const dragItem = (event.active.data.current ?? activeDrag) as DragItemData | null;

    setActiveDrag(null);
    setHoveredSlotTarget(null);
    setHoveredSpareSlotIndex(null);
    setOverlayWidth(null);

    if (!dragItem?.nikkeName) return;

    if (droppedSpareSlotIndex !== null) {
      if (dragItem.source === "selected" || dragItem.source === "deck") {
        setSpareSlots((prev) => {
          if (prev.includes(dragItem.nikkeName)) return prev;
          const next = [...prev];
          next[droppedSpareSlotIndex] = dragItem.nikkeName;
          return next;
        });
        return;
      }

      if (dragItem.source === "spare" && typeof dragItem.slotIndex === "number") {
        if (dragItem.slotIndex === droppedSpareSlotIndex) return;
        setSpareSlots((prev) => swapDraftSlots(prev, dragItem.slotIndex as number, droppedSpareSlotIndex));
        return;
      }

      return;
    }

    if (dragItem.source === "spare") {
      if (!droppedSlotTarget || typeof dragItem.slotIndex !== "number") {
        return;
      }

      setDeckDrafts((prev) => {
        const target = prev[droppedSlotTarget.deckIndex];
        if (!target || target.draft.includes(dragItem.nikkeName)) return prev;

        return prev.map((deck, index) => {
          if (index !== droppedSlotTarget.deckIndex) return deck;
          const nextDraft = [...deck.draft];
          nextDraft[droppedSlotTarget.slotIndex] = dragItem.nikkeName;
          if (nextDraft.every((slot) => slot !== null)) {
            requestAnimationFrame(() => scoreRefs.current[index]?.focus());
          }
          return { ...deck, draft: nextDraft };
        });
      });
      return;
    }

    if (dragItem.source === "selected") {
      if (!droppedSlotTarget) return;
      setDeckDrafts((prev) => {
        const target = prev[droppedSlotTarget.deckIndex];
        if (!target || target.draft.includes(dragItem.nikkeName)) return prev;

        return prev.map((deck, index) => {
          if (index !== droppedSlotTarget.deckIndex) return deck;
          const nextDraft = [...deck.draft];
          nextDraft[droppedSlotTarget.slotIndex] = dragItem.nikkeName;
          if (nextDraft.every((slot) => slot !== null)) {
            requestAnimationFrame(() => scoreRefs.current[index]?.focus());
          }
          return { ...deck, draft: nextDraft };
        });
      });
      return;
    }

    if (typeof dragItem.deckIndex !== "number" || typeof dragItem.slotIndex !== "number") return;
    if (isDroppedOutsideDeckSection(event, deckSectionRef.current)) {
      removeFromDraft(dragItem.deckIndex, dragItem.slotIndex);
      return;
    }
    if (!droppedSlotTarget) {
      removeFromDraft(dragItem.deckIndex, dragItem.slotIndex);
      return;
    }
    if (dragItem.deckIndex === droppedSlotTarget.deckIndex && dragItem.slotIndex === droppedSlotTarget.slotIndex) return;

    setDeckDrafts((prev) => {
      const sourceDeck = prev[dragItem.deckIndex as number];
      const targetDeck = prev[droppedSlotTarget.deckIndex];
      if (!sourceDeck || !targetDeck) return prev;

      if (dragItem.deckIndex === droppedSlotTarget.deckIndex) {
        return prev.map((deck, index) =>
          index === dragItem.deckIndex ? { ...deck, draft: swapDraftSlots(deck.draft, dragItem.slotIndex as number, droppedSlotTarget.slotIndex) } : deck
        );
      }

      const movingName = sourceDeck.draft[dragItem.slotIndex as number];
      if (!movingName || targetDeck.draft.includes(movingName)) return prev;

      return prev.map((deck, index) => {
        if (index === dragItem.deckIndex) {
          const nextDraft = [...deck.draft];
          nextDraft[dragItem.slotIndex as number] = targetDeck.draft[droppedSlotTarget.slotIndex] ?? null;
          return { ...deck, draft: nextDraft };
        }

        if (index === droppedSlotTarget.deckIndex) {
          const nextDraft = [...deck.draft];
          nextDraft[droppedSlotTarget.slotIndex] = movingName;
          return { ...deck, draft: nextDraft };
        }

        return deck;
      });
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-5">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
          <div className="flex items-start gap-4">
            <div className="min-w-0">
              <div className="inline-flex rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
                덱 빌딩
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">덱 빌딩</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-300">
                보스 조건과 목표 점수를 가정하고 덱 구성에 필요한 정보를 정리해두는 탭입니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPlanOpen((prev) => !prev)}
              className="ml-auto shrink-0 rounded-2xl border border-neutral-700 p-2 transition hover:border-neutral-500 active:scale-[0.99]"
              aria-label={planOpen ? "덱 빌딩 정보 접기" : "덱 빌딩 정보 펼치기"}
            >
              <CollapseIcon open={planOpen} />
            </button>
          </div>

          {planOpen ? (
            <>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={resetPlan}
                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 active:scale-[0.99]"
                >
                  초기화
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <div className="mb-2 text-xs font-medium text-neutral-400">시즌 이름</div>
                  <input
                    value={plan.seasonName}
                    onChange={(event) => updatePlan("seasonName", event.target.value)}
                    placeholder="예) 2026 봄 솔로레이드"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none transition placeholder:text-neutral-600 focus:border-fuchsia-400"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-xs font-medium text-neutral-400">보스 이름</div>
                  <input
                    value={plan.bossName}
                    onChange={(event) => updatePlan("bossName", event.target.value)}
                    placeholder="보스 이름"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none transition placeholder:text-neutral-600 focus:border-fuchsia-400"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-xs font-medium text-neutral-400">약점 코드</div>
                  <select
                    value={plan.weakElement}
                    onChange={(event) => updatePlan("weakElement", event.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none transition focus:border-fuchsia-400"
                  >
                    {ELEMENTS.map((element) => (
                      <option key={element} value={element}>
                        {element}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-2 text-xs font-medium text-neutral-400">목표 총점</div>
                  <input
                    value={plan.targetScore}
                    onChange={(event) => updatePlan("targetScore", event.target.value)}
                    inputMode="decimal"
                    placeholder="예) 250억"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none transition placeholder:text-neutral-600 focus:border-fuchsia-400"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <div className="mb-2 text-xs font-medium text-neutral-400">보스 기믹 / 운영 메모</div>
                <textarea
                  value={plan.gimmicks}
                  onChange={(event) => updatePlan("gimmicks", event.target.value)}
                  placeholder="예) 파츠 2개, 엄폐물 압박, 전격 접대 예상..."
                  className="h-28 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-neutral-600 focus:border-fuchsia-400"
                />
              </label>
            </>
          ) : null}
        </section>

        <section ref={deckSectionRef} className="order-3 rounded-3xl border border-neutral-800 bg-neutral-900/50 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">덱 만들기</h2>
              <div className="mt-1 text-sm text-neutral-400"> 임시 저장을 눌러야 기기에 정보가 저장됩니다.</div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDeckOpen((prev) => !prev)}
                className="order-last rounded-2xl border border-neutral-700 p-2 transition hover:border-neutral-500 active:scale-[0.99]"
                aria-label={deckOpen ? "덱 만들기 접기" : "덱 만들기 펼치기"}
              >
                <CollapseIcon open={deckOpen} />
              </button>
              {deckOpen ? (
                <button
                  type="button"
                  onClick={() => void handleSaveAllDecks()}
                  className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 active:scale-[0.99]"
                >
                  점수 반영
                </button>
              ) : null}
              {deckOpen ? (
                <button
                  type="button"
                  onClick={saveDraftToLocal}
                  className="rounded-2xl border border-amber-300/70 bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950 shadow-[0_0_18px_rgba(252,211,77,0.22)] active:scale-[0.99]"
                >
                  임시저장
                </button>
              ) : null}
            </div>
          </div>

          {deckOpen ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {deckDrafts.map((deck, deckIndex) => (
                <DeckBuilderSection
                  key={deck.id}
                  deckIndex={deckIndex}
                  draft={deck.draft}
                  nikkeMap={effectiveNikkeMap}
                  getPublicUrl={getPublicUrl}
                  score={deck.score}
                  scoreRef={(node) => {
                    scoreRefs.current[deckIndex] = node;
                  }}
                  editingId={deck.editingId}
                  activeDrag={activeDrag}
                  hoveredSlotIndex={hoveredSlotTarget?.deckIndex === deckIndex ? hoveredSlotTarget.slotIndex : null}
                  onScoreChange={(value) => updateDeckScore(deckIndex, value)}
                  onRemoveFromDraft={(slotIndex) => removeFromDraft(deckIndex, slotIndex)}
                  onSaveDeck={() => void handleSaveDeck(deckIndex)}
                  onClearDraft={() => clearDraft(deckIndex)}
                  className="border-neutral-800 bg-neutral-950/30 p-2.5 shadow-none"
                />
              ))}
              {renderSpareSlots()}
            </div>
          ) : null}
        </section>

        <section className="order-2 flex min-h-0 flex-col rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">니케 선택</h2>
              <div className="mt-1 text-sm text-neutral-400">설정 탭에서 선택한 니케 목록입니다.</div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setNikkeOpen((prev) => !prev)}
                className="order-last rounded-2xl border border-neutral-700 p-2 transition hover:border-neutral-500 active:scale-[0.99]"
                aria-label={nikkeOpen ? "니케 선택 접기" : "니케 선택 펼치기"}
              >
                <CollapseIcon open={nikkeOpen} />
              </button>
              <button
                type="button"
                onClick={onResetSelected}
                className="rounded-xl border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 active:scale-[0.99]"
              >
                리스트 초기화
              </button>

              <button
                type="button"
                onClick={onGoToSettings}
                className="rounded-xl border border-neutral-700 px-3 py-2 text-sm active:scale-[0.99]"
              >
                설정으로
              </button>
            </div>
          </div>

          {nikkeOpen ? effectiveSelectedNikkes.length === 0 ? (
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

              <div className="visible-scrollbar mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 overscroll-contain">
                {selectedNikkesByBurst.map((group) =>
                  group.nikkes.length > 0 ? (
                    <div key={group.key}>
                      <div className="mb-2 border-b border-neutral-800 pb-1 text-xs text-neutral-400">
                        <span className="font-medium text-neutral-200">{group.label}</span>
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-x-2 gap-y-3 xl:grid-cols-[repeat(auto-fill,minmax(80px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]">
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
            </>
          ) : null}
        </section>
      </div>

      <DragOverlay zIndex={80} dropAnimation={null}>
        {renderDragOverlayCard(overlayNikke, overlayUrl, overlayWidth)}
      </DragOverlay>
    </DndContext>
  );
}
