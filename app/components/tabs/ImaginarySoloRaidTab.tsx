"use client";

import Image from "next/image";
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
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import { buildDeckKey } from "../../../lib/recommend";
import { formatPlainScoreText, formatScore, parseScoreInput, type ScoreDisplayMode } from "../../../lib/score-format";
import DeckBuilderSection, {
  getDroppedDeckSlotTarget,
  getHoveredDeckSlotTarget,
  renderDragOverlayCard,
} from "../home/DeckBuilderSection";
import DraggableNikkeCard from "../home/DraggableNikkeCard";
import { createEmptyDraft, MAX_DECK_CHARS, parseDeckSlotTarget, type DragItemData, type DraftSlot, type NikkeRow } from "../home/deckBuilderTypes";

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

type DeckBuilderPageState = {
  id: number;
  deckDrafts: DeckDraftState[];
  spareSlots: DraftSlot[];
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
  showMyRecommendation: boolean;
  best: {
    picked: Deck[];
    total: number;
  };
  scoreDisplayMode: ScoreDisplayMode;
  onScoreDisplayModeChange: (mode: ScoreDisplayMode) => void;
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

type SortableDeckDraftProps = {
  deck: DeckDraftState;
  deckIndex: number;
  children: ReactNode;
};

type ActiveDeckDraftDrag = {
  id: number;
  deckIndex: number;
  width: number | null;
};

function SortableDeckDraft({ deck, deckIndex, children }: SortableDeckDraftProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: getDeckDraftSortableId(deck.id),
    animateLayoutChanges: () => false,
    data: {
      source: "deck-draft",
      deckDraftId: deck.id,
      deckIndex,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative min-w-0 ${isDragging ? "z-20 opacity-25" : ""}`}
    >
      <button
        type="button"
        className="absolute right-2 top-2 z-10 grid h-7 w-7 touch-none place-items-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--theme-text-soft)] transition hover:border-[var(--theme-border-strong)] active:scale-[0.98]"
        aria-label="Reorder deck"
        title="Reorder deck"
        {...attributes}
        {...listeners}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 6H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 18H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {children}
    </div>
  );
}

const ELEMENTS = [
  { v: "iron", label: "철갑" },
  { v: "fire", label: "작열" },
  { v: "wind", label: "풍압" },
  { v: "water", label: "수냉" },
  { v: "electric", label: "전격" },
] as const;

const BURSTS = [
  { n: 1, label: "I" },
  { n: 2, label: "II" },
  { n: 3, label: "III" },
] as const;

const DRAFT_STORAGE_KEY = "soloraid_deck_building_draft_v1";
const LAYOUT_STORAGE_KEY = "soloraid_deck_building_wide_layout_v1";
const RECOMMENDED_OPEN_STORAGE_KEY = "soloraid_deck_building_recommended_open_v1";
const SELECTED_TRASH_DROP_ID = "deck-building-selected-trash";
const DECK_DRAFT_COUNT = 5;
const SPARE_SLOT_COUNT = 10;

function getDeckDraftSortableId(id: number): string {
  return `deck-building-draft-${id}`;
}

function parseDeckDraftSortableId(id: unknown): number | null {
  if (typeof id !== "string") return null;
  if (!id.startsWith("deck-building-draft-")) return null;

  const deckId = Number(id.slice("deck-building-draft-".length));
  return Number.isInteger(deckId) ? deckId : null;
}

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

function createEmptyDeckBuilderPage(id: number): DeckBuilderPageState {
  return {
    id,
    deckDrafts: createEmptyDeckDrafts(),
    spareSlots: createEmptySpareSlots(),
  };
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
        score: typeof saved.score === "string" ? formatPlainScoreText(saved.score) : "",
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

function normalizeSavedDeckBuilderPage(value: unknown, fallbackId: number): DeckBuilderPageState {
  if (!value || typeof value !== "object") return createEmptyDeckBuilderPage(fallbackId);

  const saved = value as Partial<DeckBuilderPageState>;
  return {
    id: typeof saved.id === "number" && Number.isFinite(saved.id) ? saved.id : fallbackId,
    deckDrafts: normalizeSavedDeckDrafts(saved.deckDrafts),
    spareSlots: normalizeDraftSlots(saved.spareSlots, SPARE_SLOT_COUNT),
  };
}

function normalizeSavedDeckBuilderPages(value: unknown, legacyDrafts: unknown, legacySpareSlots: unknown): DeckBuilderPageState[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((page, index) => normalizeSavedDeckBuilderPage(page, index + 1));
  }

  return [
    {
      id: 1,
      deckDrafts: normalizeSavedDeckDrafts(legacyDrafts),
      spareSlots: normalizeDraftSlots(legacySpareSlots, SPARE_SLOT_COUNT),
    },
  ];
}

function swapDraftSlots(draft: DraftSlot[], fromIndex: number, toIndex: number): DraftSlot[] {
  const next = [...draft];
  const fromValue = next[fromIndex] ?? null;
  next[fromIndex] = next[toIndex] ?? null;
  next[toIndex] = fromValue;
  return next;
}

function placeNikkeInDraft(draft: DraftSlot[], nikkeName: string, targetIndex: number): DraftSlot[] {
  const existingIndex = draft.findIndex((slot) => slot === nikkeName);
  if (existingIndex === targetIndex) return draft;
  if (existingIndex !== -1) return swapDraftSlots(draft, existingIndex, targetIndex);

  const targetValue = draft[targetIndex] ?? null;
  if (targetValue) {
    const emptyIndex = draft.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return draft;

    const next = [...draft];
    next[targetIndex] = nikkeName;
    next[emptyIndex] = targetValue;
    return next;
  }

  const next = [...draft];
  next[targetIndex] = nikkeName;
  return next;
}

function getCollisionDeckSlotTarget(event: DragEndEvent): DeckSlotTarget | null {
  const collisions = event.collisions ?? [];

  for (const collision of collisions) {
    if (collision.id === event.active.id) continue;
    const target = parseDeckSlotTarget(collision.id);
    if (target) return target;
  }

  return null;
}

function getPointedDeckSlotTarget(event: DragEndEvent): DeckSlotTarget | null {
  const translated = event.active.rect.current.translated;
  if (!translated || typeof document === "undefined") return null;

  const centerX = translated.left + translated.width / 2;
  const centerY = translated.top + translated.height / 2;
  const element = document.elementFromPoint(centerX, centerY);
  const slotElement = element?.closest<HTMLElement>("[data-deck-slot-target='true']");
  if (!slotElement) return null;

  const deckIndex = Number(slotElement.dataset.deckIndex);
  const slotIndex = Number(slotElement.dataset.slotIndex);
  return Number.isInteger(deckIndex) && Number.isInteger(slotIndex) ? { deckIndex, slotIndex } : null;
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
      ? "border-[var(--theme-border-strong)] bg-[var(--card)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
      : "border-neutral-800";

  return (
    <div ref={setRefs} style={style} className="relative isolate min-w-0 transition-transform">
      <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border bg-[var(--card)] transition-all duration-150 ${stateClass}`}>
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
            <Image fill src={imageUrl} alt={displayName} draggable={false} className="pointer-events-none object-cover" sizes="(max-width: 640px) 20vw, 100px" />
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
  showMyRecommendation,
  best,
  scoreDisplayMode,
  onScoreDisplayModeChange,
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
  const [deckPages, setDeckPages] = useState<DeckBuilderPageState[]>(() => [createEmptyDeckBuilderPage(1)]);
  const [activeDeckPageId, setActiveDeckPageId] = useState(1);
  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);
  const [activeDeckDraftDrag, setActiveDeckDraftDrag] = useState<ActiveDeckDraftDrag | null>(null);
  const [hoveredSlotTarget, setHoveredSlotTarget] = useState<DeckSlotTarget | null>(null);
  const [hoveredSpareSlotIndex, setHoveredSpareSlotIndex] = useState<number | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);
  const [editingRecommendedDeckId, setEditingRecommendedDeckId] = useState<string | null>(null);
  const [editingRecommendedScore, setEditingRecommendedScore] = useState("");
  const [nikkeSearch, setNikkeSearch] = useState("");
  const [selectedElementFilter, setSelectedElementFilter] = useState<Set<string>>(new Set());
  const [selectedBurstFilter, setSelectedBurstFilter] = useState<Set<number>>(new Set());
  const [selectedDeckDraftIds, setSelectedDeckDraftIds] = useState<Set<number>>(new Set());
  const scoreRefs = useRef<Array<HTMLInputElement | null>>([]);
  const deckSectionRef = useRef<HTMLElement | null>(null);
  const nikkeSectionRef = useRef<HTMLElement | null>(null);
  const selectedTrashRef = useRef<HTMLDivElement | null>(null);
  const previousScoreDisplayModeRef = useRef<ScoreDisplayMode>(scoreDisplayMode);
  const { setNodeRef: setSelectedTrashNodeRef, isOver: selectedTrashOver } = useDroppable({
    id: SELECTED_TRASH_DROP_ID,
  });
  const setSelectedTrashRefs = (node: HTMLDivElement | null) => {
    selectedTrashRef.current = node;
    setSelectedTrashNodeRef(node);
  };
  const activeDeckPage = deckPages.find((page) => page.id === activeDeckPageId) ?? deckPages[0] ?? createEmptyDeckBuilderPage(1);
  const deckDrafts = activeDeckPage.deckDrafts;
  const spareSlots = activeDeckPage.spareSlots;
  const displayScore = (value: number) => formatScore(value, scoreDisplayMode);

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
          pages?: unknown;
          activePageId?: unknown;
          deckDrafts?: unknown;
          spareSlots?: unknown;
        };
        const pages = normalizeSavedDeckBuilderPages(parsed.pages, parsed.deckDrafts, parsed.spareSlots);
        const savedActivePageId =
          typeof parsed.activePageId === "number" && pages.some((page) => page.id === parsed.activePageId)
            ? parsed.activePageId
            : pages[0]?.id ?? 1;
        setDeckPages(pages);
        setActiveDeckPageId(savedActivePageId);
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
          pages: deckPages,
          activePageId: activeDeckPageId,
          savedAt: Date.now(),
        })
      );
    } catch {}
  }, [activeDeckPageId, deckPages, draftStorageReady]);

  useEffect(() => {
    const previousMode = previousScoreDisplayModeRef.current;
    if (previousMode === scoreDisplayMode) return;

    const scoreByDeckId = new Map(best.picked.map((deck) => [deck.id, deck.score]));

    setDeckPages((prev) =>
      prev.map((page) => ({
        ...page,
        deckDrafts: page.deckDrafts.map((deck) => {
          if (deck.editingId) {
            const numericScore = scoreByDeckId.get(deck.editingId);
            if (typeof numericScore !== "number") return deck;
            const previousDisplay = formatScore(numericScore, previousMode);
            if (deck.score !== previousDisplay) return deck;
            return { ...deck, score: formatScore(numericScore, scoreDisplayMode) };
          }

          const numericScore = parseScoreInput(deck.score);
          if (numericScore === null) return deck;
          return { ...deck, score: formatScore(numericScore, scoreDisplayMode) };
        }),
      }))
    );

    previousScoreDisplayModeRef.current = scoreDisplayMode;
  }, [best.picked, scoreDisplayMode]);

  useEffect(() => {
    scoreRefs.current = [];
  }, [activeDeckPageId]);

  useEffect(() => {
    const activeDeckIds = new Set(deckDrafts.map((deck) => deck.id));
    setSelectedDeckDraftIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => activeDeckIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [deckDrafts]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!nikkeSearch.trim()) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (nikkeSectionRef.current?.contains(target)) return;
      setNikkeSearch("");
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [nikkeSearch]);

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

  const filteredSelectedNikkes = useMemo(() => {
    const query = nikkeSearch.trim().toLowerCase();
    return effectiveSelectedNikkes.filter((nikke) => {
      if (query) {
        const matchesName = nikke.name.toLowerCase().includes(query);
        const matchesAlias = nikke.aliases?.some((alias) => alias.toLowerCase().includes(query)) ?? false;
        if (!matchesName && !matchesAlias) return false;
      }
      if (selectedElementFilter.size > 0 && (!nikke.element || !selectedElementFilter.has(nikke.element))) return false;
      if (selectedBurstFilter.size > 0) {
        const burst = nikke.burst ?? -1;
        if (!selectedBurstFilter.has(burst)) return false;
      }
      return true;
    });
  }, [effectiveSelectedNikkes, nikkeSearch, selectedElementFilter, selectedBurstFilter]);

  const selectedNikkesByBurst = useMemo(() => {
    const groups = [
      { key: "burst-1", label: "버스트 I", nikkes: [] as NikkeRow[] },
      { key: "burst-2", label: "버스트 II", nikkes: [] as NikkeRow[] },
      { key: "burst-3", label: "버스트 III", nikkes: [] as NikkeRow[] },
      { key: "burst-etc", label: "기타", nikkes: [] as NikkeRow[] },
    ];

    filteredSelectedNikkes.forEach((nikke) => {
      if (nikke.burst === 1) groups[0].nikkes.push(nikke);
      else if (nikke.burst === 2) groups[1].nikkes.push(nikke);
      else if (nikke.burst === 3) groups[2].nikkes.push(nikke);
      else groups[3].nikkes.push(nikke);
    });

    return groups;
  }, [filteredSelectedNikkes]);

  const overlayNikke = activeDrag?.nikkeName ? effectiveNikkeMap.get(activeDrag.nikkeName) : undefined;
  const overlayUrl = overlayNikke?.image_path ? getPublicUrl("nikke-images", overlayNikke.image_path) : "";
  const overlayDeckDraft =
    activeDeckDraftDrag !== null
      ? deckDrafts.find((deck) => deck.id === activeDeckDraftDrag.id) ?? deckDrafts[activeDeckDraftDrag.deckIndex]
      : null;
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
  const deckDraftSortableIds = useMemo(() => deckDrafts.map((deck) => getDeckDraftSortableId(deck.id)), [deckDrafts]);
  const selectedDeckScoreTotal = useMemo(
    () =>
      deckDrafts.reduce((total, deck) => {
        if (!selectedDeckDraftIds.has(deck.id)) return total;
        const score = parseScoreInput(deck.score);
        return score !== null && Number.isFinite(score) ? total + score : total;
      }, 0),
    [deckDrafts, selectedDeckDraftIds]
  );

  function updateActiveDeckPage(updater: (page: DeckBuilderPageState) => DeckBuilderPageState) {
    setDeckPages((prev) => prev.map((page) => (page.id === activeDeckPageId ? updater(page) : page)));
  }

  function setActiveDeckDrafts(updater: (deckDrafts: DeckDraftState[]) => DeckDraftState[]) {
    updateActiveDeckPage((page) => ({ ...page, deckDrafts: updater(page.deckDrafts) }));
  }

  function setActiveSpareSlots(updater: (spareSlots: DraftSlot[]) => DraftSlot[]) {
    updateActiveDeckPage((page) => ({ ...page, spareSlots: updater(page.spareSlots) }));
  }

  function updateDeckScore(deckIndex: number, scoreText: string) {
    setActiveDeckDrafts((prev) => prev.map((deck, index) => (index === deckIndex ? { ...deck, score: scoreText } : deck)));
  }

  function clearDraft(deckIndex: number) {
    setActiveDeckDrafts((prev) =>
      prev.map((deck, index) => (index === deckIndex ? { ...deck, draft: createEmptyDraft(), score: "", editingId: null } : deck))
    );
    requestAnimationFrame(() => scoreRefs.current[deckIndex]?.focus());
  }

  function resetDeckBuilder() {
    updateActiveDeckPage((page) => ({
      ...page,
      deckDrafts: createEmptyDeckDrafts(),
      spareSlots: createEmptySpareSlots(),
    }));
    scoreRefs.current = [];
    onShowToast("덱 만들기를 초기화");
  }

  function addDeckDraft() {
    setActiveDeckDrafts((prev) => {
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
    const targetId = deckDrafts[deckIndex]?.id;
    setActiveDeckDrafts((prev) => prev.filter((_, index) => index !== deckIndex));
    if (typeof targetId === "number") {
      setSelectedDeckDraftIds((prev) => {
        if (!prev.has(targetId)) return prev;
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
    scoreRefs.current.splice(deckIndex, 1);
  }

  function toggleDeckDraftSelected(deckId: number) {
    setSelectedDeckDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(deckId)) next.delete(deckId);
      else next.add(deckId);
      return next;
    });
  }

  function addToDraft(name: string) {
    setActiveDeckDrafts((prev) => {
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
    setActiveDeckDrafts((prev) =>
      prev.map((deck, index) =>
        index === deckIndex
          ? { ...deck, draft: deck.draft.map((value, currentIndex) => (currentIndex === slotIndex ? null : value)) }
          : deck
      )
    );
  }

  function removeFromSpareSlots(slotIndex: number) {
    setActiveSpareSlots((prev) => prev.map((value, currentIndex) => (currentIndex === slotIndex ? null : value)));
  }

  function addDeckBuilderPage() {
    setDeckPages((prev) => {
      const nextId = prev.reduce((maxId, page) => Math.max(maxId, page.id), 0) + 1;
      setActiveDeckPageId(nextId);
      return [...prev, createEmptyDeckBuilderPage(nextId)];
    });
  }

  function removeActiveDeckBuilderPage() {
    setDeckPages((prev) => {
      if (prev.length <= 1) {
        setActiveDeckPageId(1);
        scoreRefs.current = [];
        return [createEmptyDeckBuilderPage(1)];
      }

      const activeIndex = prev.findIndex((page) => page.id === activeDeckPageId);
      const nextPages = prev.filter((page) => page.id !== activeDeckPageId);
      const nextActiveIndex = Math.max(0, activeIndex - 1);
      setActiveDeckPageId(nextPages[nextActiveIndex]?.id ?? nextPages[0]?.id ?? 1);
      scoreRefs.current = [];
      return nextPages;
    });
    setActiveDrag(null);
    setHoveredSlotTarget(null);
    setHoveredSpareSlotIndex(null);
  }

  function switchDeckBuilderPage(pageId: number) {
    setActiveDeckPageId(pageId);
    setActiveDrag(null);
    setHoveredSlotTarget(null);
    setHoveredSpareSlotIndex(null);
  }

  function renderSpareSlots() {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5">
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

    setActiveDeckDrafts((prev) => {
      const existingDeckKeys = new Set(
        prev
          .map((deck) => {
            const chars = deck.draft.filter((slot): slot is string => typeof slot === "string" && slot.trim().length > 0);
            return chars.length === MAX_DECK_CHARS ? buildDeckKey(chars) : null;
          })
          .filter((key): key is string => key !== null)
      );
      const filteredRecommendedDecks = recommendedDecks.filter((deck) => !existingDeckKeys.has(buildDeckKey(deck.chars)));
      if (filteredRecommendedDecks.length === 0) return prev;

      const maxId = prev.reduce((currentMax, deck) => Math.max(currentMax, deck.id), 0);
      const copiedDecks = filteredRecommendedDecks.map((deck, index) => ({
          id: maxId + index + 1,
          draft: normalizeDraftSlots(deck.chars, MAX_DECK_CHARS),
          score: displayScore(deck.score),
          editingId: null,
      }));

      return [...copiedDecks, ...prev];
    });
    setDeckOpen(true);
    onShowToast("복사 완료");
  }

  function renderRecommendedDeckCard(deck: Deck) {
    return (
      <div key={deck.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
        <div className="grid min-w-0 grid-cols-5 gap-1.5">
          {deck.chars.map((name, slotIndex) => {
            const nikke = effectiveNikkeMap.get(name);
            const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

            return (
              <div key={`${deck.id}-${slotIndex}-${name}`} className="min-w-0">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                  {imageUrl ? (
                    <Image fill src={imageUrl} alt={name} draggable={false} className="object-cover" sizes="(max-width: 640px) 20vw, 100px" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-neutral-600">no image</div>
                  )}
                </div>
                <div className="mt-px truncate text-center text-[10px] leading-[1.15] text-neutral-200" title={formatNikkeDisplayName(name)}>
                  {formatNikkeDisplayName(name)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex justify-end">
          {editingRecommendedDeckId === deck.id ? (
            <input
              autoFocus
              inputMode="text"
              value={editingRecommendedScore}
              onChange={(event) => setEditingRecommendedScore(formatPlainScoreText(event.target.value))}
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
                width: `${Math.max(editingRecommendedScore.length, displayScore(deck.score).length, 8) + 2}ch`,
              }}
              className="min-w-[112px] shrink-0 self-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-right text-lg font-semibold tabular-nums text-neutral-100 outline-none"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => {
                setEditingRecommendedDeckId(deck.id);
                setEditingRecommendedScore(displayScore(deck.score));
              }}
              className="shrink-0 self-center text-lg font-semibold tabular-nums text-neutral-100"
              title="더블 클릭해서 점수 수정"
            >
              {displayScore(deck.score)}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderDeckDraftOverlay(deck: DeckDraftState | null, width: number | null) {
    if (!deck) return null;

    return (
      <div
        className="pointer-events-none relative z-[80] origin-center scale-[1.02] cursor-grabbing rounded-2xl border border-cyan-200/70 bg-neutral-900/95 p-3 shadow-[0_28px_70px_rgba(0,0,0,0.5)] ring-2 ring-cyan-300/45"
        style={{ width: width ? `${Math.round(width)}px` : undefined }}
      >
        <div className="grid grid-cols-5 gap-0.5">
          {deck.draft.map((name, index) => {
            const nikke = name ? effectiveNikkeMap.get(name) : undefined;
            const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

            return (
              <div key={`${deck.id}-${index}-${name ?? "empty"}`} className="min-w-0">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  {imageUrl ? (
                    <Image fill src={imageUrl} alt={name ?? ""} draggable={false} className="object-cover" sizes="(max-width: 640px) 20vw, 100px" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-lg text-neutral-600">+</div>
                  )}
                </div>
                {name ? (
                  <div className="mt-0.5 truncate text-center text-[10px] leading-none text-neutral-200">
                    {formatNikkeDisplayName(name)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {deck.score.trim() ? (
          <div className="mt-2 truncate text-right text-sm font-semibold tabular-nums text-neutral-100">{deck.score}</div>
        ) : null}
      </div>
    );
  }

  function renderRecommendedDecksSection() {
    if (!showMyRecommendation) return null;

    const topDecks = best.picked.slice(0, 3);
    const bottomDecks = best.picked.slice(3, 5);

    return (
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
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
        <div className="mt-4 rounded-2xl bg-[var(--card)] p-3">
          {canRecommend ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--theme-panel)] px-3 py-2">
                <div className="text-sm font-semibold text-neutral-300">총합</div>
                <div className="text-2xl font-bold tabular-nums">{displayScore(best.total)}</div>
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
                    className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99]"
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
    await onSubmitDeck({ draft: completeDraft, scoreText: target.score, editingId: null });
  }

  async function handleSaveAllDecks() {
    const targetDecks =
      selectedDeckDraftIds.size > 0 ? deckDrafts.filter((deck) => selectedDeckDraftIds.has(deck.id)) : deckDrafts;

    for (const deck of targetDecks) {
      const completeDraft = deck.draft.filter((value): value is string => value !== null);
      const hasAnyValue = completeDraft.length > 0 || deck.score.trim().length > 0;
      if (!hasAnyValue) continue;
      await onSubmitDeck({ draft: completeDraft, scoreText: deck.score, editingId: null });
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { source, nikkeName, deckIndex, slotIndex } = (event.active.data.current ?? {}) as Partial<DragItemData>;
    const initialRect = event.active.rect.current.initial;

    if (source === "deck-draft") {
      const deckDraftId =
        typeof (event.active.data.current as { deckDraftId?: unknown } | undefined)?.deckDraftId === "number"
          ? ((event.active.data.current as { deckDraftId: number }).deckDraftId)
          : parseDeckDraftSortableId(event.active.id);
      setActiveDrag(null);
      setActiveDeckDraftDrag(
        deckDraftId === null
          ? null
          : {
              id: deckDraftId,
              deckIndex: typeof deckIndex === "number" ? deckIndex : 0,
              width: initialRect?.width ?? null,
            }
      );
      setOverlayWidth(null);
      return;
    }

    if (!nikkeName || (source !== "selected" && source !== "deck" && source !== "spare")) {
      setActiveDrag(null);
      setActiveDeckDraftDrag(null);
      setOverlayWidth(null);
      return;
    }

    setActiveDeckDraftDrag(null);
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
    setActiveDeckDraftDrag(null);
    setHoveredSlotTarget(null);
    setHoveredSpareSlotIndex(null);
    setOverlayWidth(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const droppedSlotTarget = getDroppedDeckSlotTarget(event) ?? getCollisionDeckSlotTarget(event) ?? getPointedDeckSlotTarget(event);
    const droppedSpareSlotIndex = parseSpareSlotIndex(event.over?.id);
    const dragItem = (event.active.data.current ?? activeDrag) as DragItemData | null;
    const droppedOnSelectedTrash = event.over?.id === SELECTED_TRASH_DROP_ID || isDroppedOnElement(event, selectedTrashRef.current);

    setActiveDrag(null);
    setActiveDeckDraftDrag(null);
    setHoveredSlotTarget(null);
    setHoveredSpareSlotIndex(null);
    setOverlayWidth(null);

    if ((dragItem as { source?: string })?.source === "deck-draft") {
      const sortableDragItem = dragItem as unknown as { deckDraftId?: unknown };
      const activeDeckId =
        typeof sortableDragItem.deckDraftId === "number"
          ? sortableDragItem.deckDraftId
          : parseDeckDraftSortableId(event.active.id);
      const overDeckId = parseDeckDraftSortableId(event.over?.id);
      const overDeckIndex = overDeckId === null && droppedSlotTarget ? droppedSlotTarget.deckIndex : null;

      setActiveDeckDrafts((prev) => {
        const fromIndex = prev.findIndex((deck) => deck.id === activeDeckId);
        const toIndex = overDeckId !== null ? prev.findIndex((deck) => deck.id === overDeckId) : overDeckIndex;
        if (fromIndex === -1 || toIndex === null || toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) return prev;
        return arrayMove(prev, fromIndex, toIndex);
      });
      return;
    }

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
        const nextSpareSlots = placeNikkeInDraft(spareSlots, dragItem.nikkeName, droppedSpareSlotIndex);
        if (nextSpareSlots === spareSlots) return;
        setActiveSpareSlots(() => nextSpareSlots);
        if (dragItem.source === "selected") {
          setNikkeSearch("");
        }
        if (dragItem.source === "deck" && typeof dragItem.deckIndex === "number" && typeof dragItem.slotIndex === "number") {
          removeFromDraft(dragItem.deckIndex, dragItem.slotIndex);
        }
        return;
      }

      if (dragItem.source === "spare" && typeof dragItem.slotIndex === "number") {
        if (dragItem.slotIndex === droppedSpareSlotIndex) return;
        setActiveSpareSlots((prev) => swapDraftSlots(prev, dragItem.slotIndex as number, droppedSpareSlotIndex));
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

      setActiveDeckDrafts((prev) => {
        const target = prev[droppedSlotTarget.deckIndex];
        if (!target) return prev;

        return prev.map((deck, index) => {
          if (index !== droppedSlotTarget.deckIndex) return deck;
          const nextDraft = placeNikkeInDraft(deck.draft, dragItem.nikkeName, droppedSlotTarget.slotIndex);
          if (nextDraft === deck.draft) return deck;
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
      setActiveDeckDrafts((prev) => {
        const target = prev[droppedSlotTarget.deckIndex];
        if (!target) return prev;

        return prev.map((deck, index) => {
          if (index !== droppedSlotTarget.deckIndex) return deck;
          const nextDraft = placeNikkeInDraft(deck.draft, dragItem.nikkeName, droppedSlotTarget.slotIndex);
          if (nextDraft === deck.draft) return deck;
          if (nextDraft.every((slot) => slot !== null)) {
            requestAnimationFrame(() => scoreRefs.current[index]?.focus());
          }
          return { ...deck, draft: nextDraft };
        });
      });
      setNikkeSearch("");
      return;
    }

    if (typeof dragItem.deckIndex !== "number" || typeof dragItem.slotIndex !== "number") return;
    if (isDroppedOutsideDeckSection(event, deckSectionRef.current)) {
      removeFromDraft(dragItem.deckIndex, dragItem.slotIndex);
      return;
    }
    if (!droppedSlotTarget) {
      return;
    }
    if (dragItem.deckIndex === droppedSlotTarget.deckIndex && dragItem.slotIndex === droppedSlotTarget.slotIndex) return;

    setActiveDeckDrafts((prev) => {
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
        <div className={wideDeckLayout ? "order-1 flex flex-wrap items-center justify-end gap-2 lg:col-span-2" : "order-1 flex flex-wrap items-center justify-end gap-2"}>
          <a
            href="https://www.blablalink.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 transition hover:border-[var(--theme-border-strong)] active:scale-[0.99]"
          >
            <Image src="/blablalink-icon.png" alt="blablalink" width={24} height={24} className="h-6 w-6 rounded-full object-contain" />
            <span className="whitespace-nowrap text-xs font-bold text-[var(--theme-text-soft)] sm:text-sm">Blablalink</span>
          </a>
          <div className="flex h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--theme-text-soft)] sm:text-sm">
            <span className="whitespace-nowrap text-neutral-400">점수 표기</span>
            <span className={`whitespace-nowrap ${scoreDisplayMode === "eok" ? "text-neutral-100" : "text-neutral-500"}`}>
              00억
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={scoreDisplayMode === "number"}
              aria-label="점수 표기 방법 변경"
              onClick={() => onScoreDisplayModeChange(scoreDisplayMode === "eok" ? "number" : "eok")}
              className="relative h-6 w-11 shrink-0 rounded-full border border-[var(--border)] bg-[var(--theme-panel)] transition hover:border-[var(--theme-border-strong)] active:scale-[0.98]"
            >
              <span
                className={`score-mode-toggle-thumb absolute left-1 top-1 h-4 w-4 rounded-full bg-neutral-100 shadow transition-transform ${
                  scoreDisplayMode === "number" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`whitespace-nowrap ${scoreDisplayMode === "number" ? "text-neutral-100" : "text-neutral-500"}`}>
              숫자표기
            </span>
          </div>
          <button
            type="button"
            onClick={() => setWideDeckLayout((prev) => !prev)}
            className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--theme-border-strong)] active:scale-[0.99]"
          >
            가로세로 변경
          </button>
        </div>

        <section ref={deckSectionRef} className={`${wideDeckLayout ? `order-3 self-start lg:order-3 ${deckOpen ? "p-4" : "p-2"}` : "order-3 p-4"} rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] shadow-[0_16px_40px_rgba(0,0,0,0.24)]`}>
          {wideDeckLayout && !deckOpen ? (
            <button
              type="button"
              onClick={() => setDeckOpen(true)}
              className="flex min-h-[80px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2 py-3 text-[var(--text)] transition hover:border-[var(--theme-border-strong)] active:scale-[0.99] lg:min-h-[160px] lg:flex-col lg:justify-start"
              aria-label="덱 만들기 펼치기"
            >
              <span className="text-base leading-none text-neutral-400">&lt;</span>
              <span className="text-sm font-semibold tracking-normal lg:[writing-mode:vertical-rl]">덱 만들기</span>
            </button>
          ) : (
            <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <h2 className="whitespace-nowrap text-lg font-semibold">덱 만들기</h2>
              <div className="mt-1 break-keep text-sm text-neutral-400 sm:break-normal">아래 덱은 기기에 저장됩니다 점수 반영을 누르면 서버에 반영됩니다.</div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2 sm:ml-auto">
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeckOpen((prev) => !prev)}
                className="order-last rounded-2xl border border-neutral-700 p-2 transition hover:border-neutral-500 active:scale-[0.99]"
                aria-label={deckOpen ? "덱 만들기 접기" : "덱 만들기 펼치기"}
              >
                {wideDeckLayout ? <span className="block w-[18px] text-center text-lg leading-[18px]">&gt;</span> : <CollapseIcon open={deckOpen} />}
              </button>
              {deckOpen ? (
                <>
                  {selectedDeckDraftIds.size > 0 ? (
                    <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-[var(--text)]">
                      선택 합계 {displayScore(selectedDeckScoreTotal)}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleSaveAllDecks()}
                    className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99]"
                  >
                    점수 반영
                  </button>
                </>
              ) : null}
              {deckOpen ? (
                <button
                  type="button"
                  onClick={resetDeckBuilder}
                  className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-red-400 hover:bg-red-500/15 active:scale-[0.99]"
                >
                  초기화
                </button>
              ) : null}
              {deckOpen ? (
                <button
                  type="button"
                  onClick={addDeckDraft}
                  className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--card)] active:scale-[0.99]"
                >
                  덱 추가
                </button>
              ) : null}
              </div>
              {deckOpen ? (
                <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
                  {deckPages.map((page, pageIndex) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => switchDeckBuilderPage(page.id)}
                      className={`grid h-8 min-w-8 place-items-center rounded-xl border px-2 text-sm font-semibold tabular-nums transition active:scale-[0.99] ${
                        page.id === activeDeckPageId
                          ? "border-cyan-400/60 bg-cyan-400/15 text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--text)] hover:border-[var(--theme-border-strong)]"
                      }`}
                      aria-label={`덱 만들기 ${pageIndex + 1}페이지`}
                    >
                      {pageIndex + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addDeckBuilderPage}
                    className="grid h-8 min-w-8 place-items-center rounded-xl border border-[var(--border)] px-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--theme-border-strong)] active:scale-[0.99]"
                    aria-label="덱 만들기 페이지 추가"
                    title="페이지 추가"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={removeActiveDeckBuilderPage}
                    className="grid h-8 min-w-8 place-items-center rounded-xl border border-[var(--border)] px-2 text-sm font-semibold text-[var(--text)] transition hover:border-red-400/70 active:scale-[0.99]"
                    aria-label="현재 덱 만들기 페이지 삭제"
                    title="현재 페이지 삭제"
                  >
                    -
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {deckOpen ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <SortableContext items={deckDraftSortableIds} strategy={rectSortingStrategy}>
                {deckDrafts.map((deck, deckIndex) => (
                  <SortableDeckDraft key={deck.id} deck={deck} deckIndex={deckIndex}>
                    <DeckBuilderSection
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
                      selected={selectedDeckDraftIds.has(deck.id)}
                      onToggleSelected={() => toggleDeckDraftSelected(deck.id)}
                      className="border-[var(--border)] bg-[var(--card)] p-1.5 shadow-none"
                    />
                  </SortableDeckDraft>
                ))}
              </SortableContext>
              {renderSpareSlots()}
            </div>
          ) : null}
            </>
          )}
        </section>

        <section
          ref={nikkeSectionRef}
          style={nikkeSectionStyle}
          className={`${wideDeckLayout ? `order-2 self-start lg:order-2 lg:h-[var(--deck-section-height)] lg:overflow-hidden ${nikkeOpen ? "p-5" : "p-2"}` : "order-2 p-5"} flex min-h-0 flex-col rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] shadow-[0_16px_40px_rgba(0,0,0,0.24)]`}
        >
          {wideDeckLayout && !nikkeOpen ? (
            <button
              type="button"
              onClick={() => setNikkeOpen(true)}
              className="flex h-full min-h-[160px] w-full flex-col items-center justify-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2 py-3 text-[var(--text)] transition hover:border-[var(--theme-border-strong)] active:scale-[0.99]"
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
              <div className="nikke-search-shell mt-2 flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4">
                <input
                  value={nikkeSearch}
                  onChange={(event) => setNikkeSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setNikkeSearch("");
                    }
                  }}
                  placeholder="니케 이름 검색"
                  className="nikke-search-input flex-1 bg-transparent py-2.5 pl-1 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />

                <button
                  type="button"
                  onClick={() => setNikkeSearch("")}
                  aria-label="검색어 지우기"
                  disabled={!nikkeSearch}
                  style={{ borderRadius: "9999px" }}
                  className={`ml-2 flex h-9 min-w-[36px] shrink-0 items-center justify-center appearance-none overflow-hidden border-0 bg-transparent p-0 transition active:scale-[0.98] ${
                    nikkeSearch ? "text-neutral-100 hover:bg-neutral-800/40" : "text-neutral-600"
                  }`}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M6 6L18 18" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>
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
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--card)] active:scale-[0.99]"
              >
                리스트 초기화
              </button>

              <button
                type="button"
                onClick={onGoToSettings}
                className="rounded-xl border border-neutral-700 px-3 py-2 text-sm transition hover:border-neutral-500 hover:bg-neutral-800/40 active:scale-[0.99]"
              >
                니케 추가
              </button>
              <div
                ref={setSelectedTrashRefs}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${
                  selectedTrashOver && activeDrag?.source === "selected"
                    ? "border-red-300 bg-red-500/25 text-[var(--text)] ring-2 ring-red-300/40"
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

          {nikkeOpen && effectiveSelectedNikkes.length > 0 && (
            <div className="mt-3 flex items-center gap-1">
              {ELEMENTS.map((el) => (
                <button
                  key={el.v}
                  type="button"
                  onClick={() =>
                    setSelectedElementFilter((prev) => {
                      const next = new Set(prev);
                      next.has(el.v) ? next.delete(el.v) : next.add(el.v);
                      return next;
                    })
                  }
                  className={`whitespace-nowrap rounded-lg border px-2 py-0.5 text-xs transition ${
                    selectedElementFilter.has(el.v)
                      ? "settings-filter-btn-active border-white bg-white text-black"
                      : "border-neutral-700 bg-transparent text-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {el.label}
                </button>
              ))}
              <div className="mx-0.5 h-4 w-px bg-neutral-700" />
              {BURSTS.map((burst) => (
                <button
                  key={burst.n}
                  type="button"
                  onClick={() =>
                    setSelectedBurstFilter((prev) => {
                      const next = new Set(prev);
                      next.has(burst.n) ? next.delete(burst.n) : next.add(burst.n);
                      return next;
                    })
                  }
                  className={`whitespace-nowrap rounded-lg border px-2 py-0.5 text-xs transition ${
                    selectedBurstFilter.has(burst.n)
                      ? "settings-filter-btn-active border-white bg-white text-black"
                      : "border-neutral-700 bg-transparent text-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {burst.label}
                </button>
              ))}
            </div>
          )}

          {nikkeOpen ? effectiveSelectedNikkes.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-300">
              <span className="text-neutral-200">니케 관리</span>에서 최대 {maxSelected}개 선택 가능.
            </div>
          ) : filteredSelectedNikkes.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-300">조건에 맞는 니케가 없습니다.</div>
          ) : (
            <>
              <div className="visible-scrollbar mt-2 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 overscroll-contain">
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
        {activeDeckDraftDrag
          ? renderDeckDraftOverlay(overlayDeckDraft, activeDeckDraftDrag.width)
          : renderDragOverlayCard(overlayNikke, overlayUrl, overlayWidth)}
      </DragOverlay>
    </DndContext>
  );
}
