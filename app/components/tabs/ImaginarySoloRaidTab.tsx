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
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import DeckBuilderSection, {
  getDroppedDeckSlotTarget,
  getHoveredDeckSlotTarget,
  renderDragOverlayCard,
} from "../home/DeckBuilderSection";
import DraggableNikkeCard from "../home/DraggableNikkeCard";
import { createEmptyDraft, MAX_DECK_CHARS, type DragItemData, type DraftSlot, type NikkeRow } from "../home/deckBuilderTypes";

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

type Deck = {
  id: string;
  chars: string[];
  score: number;
  createdAt: number;
};

type DeckBuildingTabProps = {
  decksCount: number;
  canRecommend: boolean;
  best: {
    picked: Deck[];
    total: number;
  };
  fmt: (value: number) => string;
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
  onUpdateDeckScore: (id: string, scoreText: string) => Promise<boolean>;
};

const DRAFT_STORAGE_KEY = "soloraid_deck_building_draft_v1";
const LAYOUT_STORAGE_KEY = "soloraid_deck_building_wide_layout_v1";
const RECOMMENDED_OPEN_STORAGE_KEY = "soloraid_deck_building_recommended_open_v1";
const SELECTED_TRASH_DROP_ID = "deck-building-selected-trash";
const DECK_DRAFT_COUNT = 5;
const SPARE_SLOT_COUNT = 10;

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
  if (!Array.isArray(value)) return createEmptyDeckDrafts();

  const normalized = value
    .map((candidate, index) => {
      if (!candidate || typeof candidate !== "object") {
        return {
          id: index + 1,
          draft: createEmptyDraft(),
          score: "",
          editingId: null,
        } satisfies DeckDraftState;
      }

      const saved = candidate as Partial<DeckDraftState>;
      return {
        id: typeof saved.id === "number" && Number.isFinite(saved.id) ? saved.id : index + 1,
        draft: normalizeDraftSlots(saved.draft, MAX_DECK_CHARS),
        score: typeof saved.score === "string" ? saved.score : "",
        editingId: typeof saved.editingId === "string" ? saved.editingId : null,
      } satisfies DeckDraftState;
    })
    .filter((deck): deck is DeckDraftState => Boolean(deck));

  if (normalized.length >= DECK_DRAFT_COUNT) return normalized;

  return [
    ...normalized,
    ...Array.from({ length: DECK_DRAFT_COUNT - normalized.length }, (_, index) => ({
      id: normalized.length + index + 1,
      draft: createEmptyDraft(),
      score: "",
      editingId: null,
    })),
  ];
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

function isDroppedOnElement(event: DragEndEvent, element: HTMLElement | null): boolean {
  if (!element) return false;

  const translated = event.active.rect.current.translated;
  if (!translated) return false;

  const rect = element.getBoundingClientRect();
  const centerX = translated.left + translated.width / 2;
  const centerY = translated.top + translated.height / 2;
  const centerInside = centerX >= rect.left && centerX <= rect.right && centerY >= rect.top && centerY <= rect.bottom;
  const overlaps =
    translated.left < rect.right &&
    translated.right > rect.left &&
    translated.top < rect.bottom &&
    translated.bottom > rect.top;

  return centerInside || overlaps;
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
  decksCount,
  canRecommend,
  best,
  fmt,
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
  onUpdateDeckScore,
}: DeckBuildingTabProps) {
  const [deckOpen, setDeckOpen] = useState(true);
  const [nikkeOpen, setNikkeOpen] = useState(true);
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  const [wideDeckLayout, setWideDeckLayout] = useState(true);
  const [deckSectionHeight, setDeckSectionHeight] = useState<number | null>(null);
  const [expandedDeckSectionHeight, setExpandedDeckSectionHeight] = useState<number | null>(null);
  const [layoutStorageReady, setLayoutStorageReady] = useState(false);
  const [recommendedOpenStorageReady, setRecommendedOpenStorageReady] = useState(false);
  const [draftStorageReady, setDraftStorageReady] = useState(false);
  const [deckDrafts, setDeckDrafts] = useState<DeckDraftState[]>(() => createEmptyDeckDrafts());
  const [spareSlots, setSpareSlots] = useState<DraftSlot[]>(() => createEmptySpareSlots());
  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);
  const [hoveredSlotTarget, setHoveredSlotTarget] = useState<DeckSlotTarget | null>(null);
  const [hoveredSpareSlotIndex, setHoveredSpareSlotIndex] = useState<number | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);
  const [editingRecommendedDeckId, setEditingRecommendedDeckId] = useState<string | null>(null);
  const [editingRecommendedScore, setEditingRecommendedScore] = useState("");
  const scoreRefs = useRef<Array<HTMLInputElement | null>>([]);
  const deckSectionRef = useRef<HTMLElement | null>(null);
  const selectedTrashRef = useRef<HTMLDivElement | null>(null);
  const { setNodeRef: setSelectedTrashNodeRef, isOver: selectedTrashOver } = useDroppable({
    id: SELECTED_TRASH_DROP_ID,
  });
  const setSelectedTrashRefs = (node: HTMLDivElement | null) => {
    selectedTrashRef.current = node;
    setSelectedTrashNodeRef(node);
  };

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

    setDraftStorageReady(true);
  }, []);

  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayout === "wide") {
        setWideDeckLayout(true);
      }
      if (savedLayout === "stacked") {
        setWideDeckLayout(false);
      }
    } catch {}

    setLayoutStorageReady(true);
  }, []);

  useEffect(() => {
    try {
      const savedOpen = localStorage.getItem(RECOMMENDED_OPEN_STORAGE_KEY);
      if (savedOpen === "open") {
        setRecommendedOpen(true);
      }
      if (savedOpen === "closed") {
        setRecommendedOpen(false);
      }
    } catch {}

    setRecommendedOpenStorageReady(true);
  }, []);

  useEffect(() => {
    if (!layoutStorageReady) return;

    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, wideDeckLayout ? "wide" : "stacked");
    } catch {}
  }, [layoutStorageReady, wideDeckLayout]);

  useEffect(() => {
    if (!recommendedOpenStorageReady) return;

    try {
      localStorage.setItem(RECOMMENDED_OPEN_STORAGE_KEY, recommendedOpen ? "open" : "closed");
    } catch {}
  }, [recommendedOpen, recommendedOpenStorageReady]);

  useEffect(() => {
    if (!wideDeckLayout || !deckSectionRef.current) {
      setDeckSectionHeight(null);
      return;
    }

    const target = deckSectionRef.current;
    const syncHeight = () => {
      const nextHeight = target.getBoundingClientRect().height;
      if (deckOpen) {
        setExpandedDeckSectionHeight(nextHeight);
      }
      setDeckSectionHeight(deckOpen ? nextHeight : expandedDeckSectionHeight ?? nextHeight);
    };
    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(target);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [wideDeckLayout, deckOpen, deckDrafts.length, expandedDeckSectionHeight]);

  useEffect(() => {
    if (!draftStorageReady) return;

    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          deckDrafts,
          spareSlots,
          savedAt: Date.now(),
        })
      );
    } catch {}
  }, [deckDrafts, draftStorageReady, spareSlots]);

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
    best.picked.forEach((deck) => {
      deck.chars.forEach((name) => {
        if (!next.has(name)) {
          next.set(name, {
            id: `recommended-fallback-${name}`,
            name,
            image_path: null,
            burst: null,
          });
        }
      });
    });
    return next;
  }, [best.picked, nikkeMap, selectedNames]);

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
  const nikkeSectionStyle =
    wideDeckLayout && deckSectionHeight
      ? ({ "--deck-section-height": `${Math.ceil(deckSectionHeight)}px` } as CSSProperties)
      : undefined;
  const wideLayoutGridClass = !wideDeckLayout
    ? "flex flex-col gap-5"
    : deckOpen && nikkeOpen
      ? "grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]"
      : deckOpen && !nikkeOpen
        ? "grid items-start gap-5 lg:grid-cols-[56px_minmax(0,1fr)]"
        : !deckOpen && nikkeOpen
          ? "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_56px]"
          : "grid items-start gap-5 lg:grid-cols-[56px_56px]";
  const deckDraftNameSet = useMemo(() => {
    const names = new Set<string>();
    deckDrafts.forEach((deck) => {
      deck.draft.forEach((name) => {
        if (name) names.add(name);
      });
    });
    return names;
  }, [deckDrafts]);

  function updateDeckScore(deckIndex: number, scoreText: string) {
    setDeckDrafts((prev) => prev.map((deck, index) => (index === deckIndex ? { ...deck, score: scoreText } : deck)));
  }

  function clearDraft(deckIndex: number) {
    setDeckDrafts((prev) =>
      prev.map((deck, index) => (index === deckIndex ? { ...deck, draft: createEmptyDraft(), score: "", editingId: null } : deck))
    );
    requestAnimationFrame(() => scoreRefs.current[deckIndex]?.focus());
  }

  function resetDeckBuilder() {
    setDeckDrafts(createEmptyDeckDrafts());
    setSpareSlots(createEmptySpareSlots());
    scoreRefs.current = [];
    onShowToast("덱 만들기를 초기화");
  }

  function addDeckDraft() {
    setDeckDrafts((prev) => {
      const nextId = prev.reduce((maxId, deck) => Math.max(maxId, deck.id), 0) + 1;
      return [
        ...prev,
        {
          id: nextId,
          draft: createEmptyDraft(),
          score: "",
          editingId: null,
        },
      ];
    });
  }

  function removeDeckDraft(deckIndex: number) {
    setDeckDrafts((prev) => prev.filter((_, index) => index !== deckIndex));
    scoreRefs.current.splice(deckIndex, 1);
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

  async function saveRecommendedDeckScore(deckId: string) {
    const saved = await onUpdateDeckScore(deckId, editingRecommendedScore);
    if (!saved) return;
    setEditingRecommendedDeckId(null);
    setEditingRecommendedScore("");
  }

  function copyRecommendedDecksToBuilder() {
    const recommendedDecks = best.picked.slice(0, DECK_DRAFT_COUNT);
    if (recommendedDecks.length === 0) {
      onShowToast("복사할 추천 조합이 없어");
      return;
    }

    setDeckDrafts((prev) => {
      const maxId = prev.reduce((currentMax, deck) => Math.max(currentMax, deck.id), 0);
      const copiedDecks = recommendedDecks.map((deck, index) => ({
          id: maxId + index + 1,
          draft: normalizeDraftSlots(deck.chars, MAX_DECK_CHARS),
          score: String(deck.score),
          editingId: deck.id,
      }));

      return [...copiedDecks, ...prev];
    });
    setDeckOpen(true);
    onShowToast("추천 조합을 덱 만들기에 복사했어");
  }

  function renderRecommendedDeckCard(deck: Deck) {
    return (
      <div key={deck.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-2">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-start gap-1.5">
            {deck.chars.map((name, slotIndex) => {
              const nikke = effectiveNikkeMap.get(name);
              const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

              return (
                <div key={`${deck.id}-${slotIndex}-${name}`} className="min-w-0 max-w-[50px]">
                  <div className="aspect-square overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
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
                width: `${Math.max(editingRecommendedScore.length, String(deck.score).length, 8) + 2}ch`,
              }}
              className="min-w-[112px] shrink-0 self-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-right text-lg font-semibold tabular-nums text-neutral-100 outline-none"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => {
                setEditingRecommendedDeckId(deck.id);
                setEditingRecommendedScore(String(deck.score));
              }}
              className="shrink-0 self-center text-lg font-semibold tabular-nums text-neutral-100"
              title="더블 클릭해서 점수 수정"
            >
              {fmt(deck.score)}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderRecommendedDecksSection() {
    const topDecks = best.picked.slice(0, 3);
    const bottomDecks = best.picked.slice(3, 5);

    return (
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">내 추천 조합</h2>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {decksCount}개 덱
            </div>
            <button
              type="button"
              onClick={() => setRecommendedOpen((prev) => !prev)}
              className="grid h-8 w-8 place-items-center rounded-xl border border-neutral-700 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 active:scale-[0.99]"
              aria-label={recommendedOpen ? "내 추천 조합 접기" : "내 추천 조합 열기"}
            >
              {recommendedOpen ? "v" : "^"}
            </button>
          </div>
        </div>

        {recommendedOpen ? (
        <div className="mt-4 rounded-2xl bg-neutral-950/40 p-3">
          {canRecommend ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                <div className="text-sm font-semibold text-neutral-300">총합</div>
                <div className="text-2xl font-bold tabular-nums">{fmt(best.total)}</div>
              </div>

              <div className="grid gap-2 lg:grid-cols-3">
                {topDecks.map((deck) => renderRecommendedDeckCard(deck))}
              </div>
              <div className="grid gap-2 lg:grid-cols-3">
                {bottomDecks.map((deck) => renderRecommendedDeckCard(deck))}
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={copyRecommendedDecksToBuilder}
                    className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99]"
                  >
                    덱 복사
                  </button>
                </div>
              </div>
            </div>
          ) : (
            null
          )}
        </div>
        ) : null}
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
    const droppedOnSelectedTrash = event.over?.id === SELECTED_TRASH_DROP_ID || isDroppedOnElement(event, selectedTrashRef.current);

    setActiveDrag(null);
    setHoveredSlotTarget(null);
    setHoveredSpareSlotIndex(null);
    setOverlayWidth(null);

    if (!dragItem?.nikkeName) return;

    if (droppedOnSelectedTrash) {
      if (dragItem.source === "selected") {
        onRemoveSelectedNikke(dragItem.nikkeName);
      }
      return;
    }

    if (
      dragItem.source === "spare" &&
      typeof dragItem.slotIndex === "number" &&
      isDroppedOutsideDeckSection(event, deckSectionRef.current)
    ) {
      removeFromSpareSlots(dragItem.slotIndex);
      return;
    }

    if (droppedSpareSlotIndex !== null) {
      if (dragItem.source === "selected" || dragItem.source === "deck") {
        if (spareSlots.includes(dragItem.nikkeName)) return;
        setSpareSlots((prev) => {
          const next = [...prev];
          next[droppedSpareSlotIndex] = dragItem.nikkeName;
          return next;
        });
        if (dragItem.source === "deck" && typeof dragItem.deckIndex === "number" && typeof dragItem.slotIndex === "number") {
          removeFromDraft(dragItem.deckIndex, dragItem.slotIndex);
        }
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
        if (typeof dragItem.slotIndex === "number") {
          removeFromSpareSlots(dragItem.slotIndex);
        }
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
      <div className="space-y-5">
        {renderRecommendedDecksSection()}

        <div className={wideLayoutGridClass}>
        <div className={wideDeckLayout ? "order-1 flex justify-end lg:col-span-2" : "order-1 flex justify-end"}>
          <button
            type="button"
            onClick={() => setWideDeckLayout((prev) => !prev)}
            className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 active:scale-[0.99]"
          >
            가로세로 변경
          </button>
        </div>

        <section ref={deckSectionRef} className={`${wideDeckLayout ? `order-3 self-start lg:order-3 ${deckOpen ? "p-4" : "p-2"}` : "order-3 p-4"} rounded-3xl border border-neutral-800 bg-neutral-900/50 shadow-[0_16px_40px_rgba(0,0,0,0.24)]`}>
          {wideDeckLayout && !deckOpen ? (
            <button
              type="button"
              onClick={() => setDeckOpen(true)}
              className="flex min-h-[160px] w-full flex-col items-center justify-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/30 px-2 py-3 text-neutral-200 transition hover:border-neutral-600 active:scale-[0.99]"
              aria-label="덱 만들기 펼치기"
            >
              <span className="text-base leading-none text-neutral-400">&lt;</span>
              <span className="[writing-mode:vertical-rl] text-sm font-semibold tracking-normal">덱 만들기</span>
            </button>
          ) : (
            <>
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">덱 만들기</h2>
              <div className="mt-1 text-sm text-neutral-400">아래 덱은 기기에 저장됩니다 점수 반영을 누르면 서버에 반영됩니다.</div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDeckOpen((prev) => !prev)}
                className="order-last rounded-2xl border border-neutral-700 p-2 transition hover:border-neutral-500 active:scale-[0.99]"
                aria-label={deckOpen ? "덱 만들기 접기" : "덱 만들기 펼치기"}
              >
                {wideDeckLayout ? <span className="block w-[18px] text-center text-lg leading-[18px]">&gt;</span> : <CollapseIcon open={deckOpen} />}
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
                  onClick={resetDeckBuilder}
                  className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 active:scale-[0.99]"
                >
                  초기화
                </button>
              ) : null}
              {deckOpen ? (
                <button
                  type="button"
                  onClick={addDeckDraft}
                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100 active:scale-[0.99]"
                >
                  덱 추가
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
                  onDeleteDeck={() => removeDeckDraft(deckIndex)}
                  className="border-neutral-800 bg-neutral-950/30 p-1.5 shadow-none"
                />
              ))}
              {renderSpareSlots()}
            </div>
          ) : null}
            </>
          )}
        </section>

        <section
          style={nikkeSectionStyle}
          className={`${wideDeckLayout ? `order-2 self-start lg:order-2 lg:h-[var(--deck-section-height)] lg:overflow-hidden ${nikkeOpen ? "p-5" : "p-2"}` : "order-2 p-5"} flex min-h-0 flex-col rounded-3xl border border-neutral-800 bg-neutral-900/50 shadow-[0_16px_40px_rgba(0,0,0,0.24)]`}
        >
          {wideDeckLayout && !nikkeOpen ? (
            <button
              type="button"
              onClick={() => setNikkeOpen(true)}
              className="flex h-full min-h-[160px] w-full flex-col items-center justify-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/30 px-2 py-3 text-neutral-200 transition hover:border-neutral-600 active:scale-[0.99]"
              aria-label="니케 선택 펼치기"
            >
              <span className="text-base leading-none text-neutral-400">&gt;</span>
              <span className="[writing-mode:vertical-rl] text-sm font-semibold tracking-normal">니케 선택</span>
            </button>
          ) : (
            <>
          <div className={wideDeckLayout ? "flex flex-col items-start gap-3" : "flex items-center gap-3"}>
            <div className="w-full min-w-0">
              <div className={wideDeckLayout ? "flex w-full items-center gap-2" : ""}>
                <h2 className={`${wideDeckLayout ? "whitespace-nowrap" : ""} text-lg font-semibold`}>니케 선택</h2>
                {wideDeckLayout ? (
                  <button
                    type="button"
                    onClick={() => setNikkeOpen(false)}
                    className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-neutral-700 text-lg leading-none text-neutral-300 transition hover:border-neutral-500 active:scale-[0.99]"
                    aria-label="니케 선택 접기"
                  >
                    &lt;
                  </button>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-neutral-400">설정 탭에서 선택한 니케 목록입니다. 이미지를 끌어 휴지통에 넣으면 목록에서 제거됩니다.</div>
            </div>

            <div className={`${wideDeckLayout ? "flex w-full flex-wrap items-center gap-2" : "ml-auto flex shrink-0 items-center gap-2"}`}>
              {!wideDeckLayout ? (
                <button
                  type="button"
                  onClick={() => setNikkeOpen((prev) => !prev)}
                  className="order-last rounded-2xl border border-neutral-700 p-2 transition hover:border-neutral-500 active:scale-[0.99]"
                  aria-label={nikkeOpen ? "니케 선택 접기" : "니케 선택 펼치기"}
                >
                  <CollapseIcon open={nikkeOpen} />
                </button>
              ) : null}
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
              <div
                ref={setSelectedTrashRefs}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${
                  selectedTrashOver && activeDrag?.source === "selected"
                    ? "border-red-300 bg-red-500/25 text-red-100 ring-2 ring-red-300/40"
                    : "border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400 hover:bg-red-500/15"
                }`}
                title="니케 선택에서 제거"
                aria-label="니케 선택에서 제거"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M6 7L7 20H17L18 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M9 7V4H15V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {nikkeOpen ? effectiveSelectedNikkes.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-300">
              <span className="text-neutral-200">설정 탭</span>에서 최대 {maxSelected}개 선택 가능.
            </div>
          ) : (
            <>
              <div className={`${wideDeckLayout ? "mt-4 flex flex-col gap-1.5" : "mt-4 flex items-center justify-between gap-3"} text-sm text-neutral-400`}>
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
                      <div
                        className={
                          wideDeckLayout
                            ? deckOpen
                              ? "grid grid-cols-4 gap-x-2 gap-y-3"
                              : "grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-x-2 gap-y-3 xl:grid-cols-[repeat(auto-fill,minmax(80px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]"
                            : "grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-x-2 gap-y-3 xl:grid-cols-[repeat(auto-fill,minmax(80px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]"
                        }
                      >
                        {group.nikkes.map((nikke) => {
                          const imageUrl = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

                          return (
                            <DraggableNikkeCard
                              key={nikke.id}
                              nikke={nikke}
                              imageUrl={imageUrl}
                              onAdd={addToDraft}
                              onRemove={onRemoveSelectedNikke}
                              inDeck={deckDraftNameSet.has(nikke.name)}
                              hideRemoveButton={wideDeckLayout}
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
            </>
          )}
        </section>
        </div>
      </div>

      <DragOverlay zIndex={80} dropAnimation={null}>
        {renderDragOverlayCard(overlayNikke, overlayUrl, overlayWidth)}
      </DragOverlay>
    </DndContext>
  );
}
