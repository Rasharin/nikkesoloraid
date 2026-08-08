"use client";

import Image from "next/image";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  clearTierAssignments,
  createDefaultTierBoard,
  getContrastingTextColor,
  moveNikke,
  removeNikkeFromTier,
  type TierBoardData,
  type TierRow,
} from "../../../../lib/nikke-tier";
import { formatNikkeDisplayName } from "../../../../lib/nikke-display";
import {
  TIER_LOCAL_LAYOUT_KEY,
  clampTierSectionSize,
  getTierCardSizeClasses,
  getTierSectionLayoutWidth,
  parseTierLocalLayout,
  resizeTierSection,
  type TierCardSize,
  type TierResizeEdge,
  type TierSectionSize,
} from "../../../../lib/tier-local-layout";
import {
  TIER_CATALOG_LAYOUT_KEY,
  parseTierCatalogLayoutMode,
  type TierCatalogLayoutMode,
} from "../../../../lib/tier-catalog-layout";
import TierNikkeCatalog, {
  type TierFilterOption,
  type TierNikkeRow,
} from "./TierNikkeCatalog";
import TierSettingsPanel from "./TierSettingsPanel";

type DragData = {
  source?: "catalog" | "tier";
  nikkeName?: string;
  rowId?: string;
  index?: number;
};

type CatalogDropPreview = {
  activeId: string;
  nikkeName: string;
  rowId: string;
  index: number;
};

const VIEWPORT_RESIZE_MARGIN = 16;
const SIDE_CATALOG_MIN_WIDTH = 128;
const SIDE_LAYOUT_GAP = 20;

const tierCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const cardCollision = pointerCollisions.find(({ id }) =>
    String(id).startsWith("tier-card-")
  );
  if (cardCollision) return [cardCollision];

  const rowCollision = pointerCollisions.find(({ id }) =>
    String(id).startsWith("tier-row-")
  );
  if (!rowCollision) return pointerCollisions;

  const rowId = String(rowCollision.id).slice("tier-row-".length);
  const rowCards = args.droppableContainers.filter(
    (container) =>
      container.data.current?.rowId === rowId &&
      String(container.id).startsWith("tier-card-")
  );
  if (rowCards.length === 0) return [rowCollision];

  const nearestCard = closestCenter({ ...args, droppableContainers: rowCards });
  return nearestCard.length > 0 ? nearestCard : [rowCollision];
};

function getCatalogInsertionIndex(
  rowId: string,
  activeRect: { left: number; top: number; width: number; height: number } | null,
  fallbackIndex: number
) {
  if (!activeRect) return fallbackIndex;
  const rowElement = Array.from(
    document.querySelectorAll<HTMLElement>("[data-tier-row-id]")
  ).find((element) => element.dataset.tierRowId === rowId);
  if (!rowElement) return fallbackIndex;

  const activeCenterX = activeRect.left + activeRect.width / 2;
  const activeCenterY = activeRect.top + activeRect.height / 2;
  const cards = Array.from(rowElement.querySelectorAll<HTMLElement>("[data-tier-card]"));
  const insertionIndex = cards.findIndex((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    const sameVisualLine = Math.abs(activeCenterY - cardCenterY) < rect.height / 2;
    return sameVisualLine ? activeCenterX < cardCenterX : activeCenterY < cardCenterY;
  });
  return insertionIndex >= 0 ? insertionIndex : cards.length;
}

type TierBoardProps = {
  board: TierBoardData;
  nikkes: TierNikkeRow[];
  canEdit: boolean;
  saving: boolean;
  onChange: (board: TierBoardData) => void;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  bursts: readonly { readonly n: number; readonly label: string }[];
  elements: readonly TierFilterOption[];
  roles: readonly TierFilterOption[];
};

function EditableLabel({
  value,
  canEdit,
  onChange,
  className = "",
}: {
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function finish() {
    const nextValue = draft.trim();
    if (nextValue) onChange(nextValue);
    else setDraft(value);
    setEditing(false);
  }

  if (editing && canEdit) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === "Enter") finish();
          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`min-w-0 rounded-lg border border-white/50 bg-black/20 px-2 py-1 text-inherit outline-none ${className}`}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => {
        if (!canEdit) return;
        setDraft(value);
        setEditing(true);
      }}
      title={canEdit ? "더블클릭하여 수정" : undefined}
      className={`${canEdit ? "cursor-text" : ""} ${className}`}
    >
      {value}
    </span>
  );
}

function TierNikkeCardVisual({
  nikke,
  getPublicUrl,
  cardSize,
  overlay = false,
}: {
  nikke: TierNikkeRow;
  getPublicUrl: TierBoardProps["getPublicUrl"];
  cardSize: TierCardSize;
  overlay?: boolean;
}) {
  const imageUrl = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";
  const sizeClasses = getTierCardSizeClasses(cardSize);

  return (
    <div
      className={`${sizeClasses.card} overflow-hidden rounded-xl border border-black/10 bg-white/80 dark:border-white/15 dark:bg-black/25 ${
        overlay ? "scale-[1.03] shadow-2xl" : ""
      }`}
    >
      <div className="relative aspect-square w-full">
        {imageUrl ? (
          <Image
            fill
            src={imageUrl}
            alt={formatNikkeDisplayName(nikke.name)}
            draggable={false}
            className="pointer-events-none object-cover"
            sizes={sizeClasses.imageSizes}
          />
        ) : (
          <div className="grid h-full place-items-center text-[9px] text-white/60">
            no image
          </div>
        )}
      </div>
      <div className={`truncate px-1 py-1 text-neutral-900 dark:text-white ${sizeClasses.name}`}>
        {formatNikkeDisplayName(nikke.name)}
      </div>
    </div>
  );
}

function TierNikkeCard({
  nikke,
  rowId,
  index,
  canEdit,
  onRemove,
  getPublicUrl,
  cardSize,
}: {
  nikke: TierNikkeRow;
  rowId: string;
  index: number;
  canEdit: boolean;
  onRemove: () => void;
  getPublicUrl: TierBoardProps["getPublicUrl"];
  cardSize: TierCardSize;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `tier-card-${rowId}-${nikke.name}`,
    disabled: !canEdit,
    data: { source: "tier", nikkeName: nikke.name, rowId, index } satisfies DragData,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined,
    visibility: isDragging ? "hidden" : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-tier-card
      disabled={!canEdit}
      onClick={onRemove}
      style={style}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      className={`${getTierCardSizeClasses(cardSize).card} shrink-0 rounded-xl text-left ${
        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
    >
      <TierNikkeCardVisual nikke={nikke} getPublicUrl={getPublicUrl} cardSize={cardSize} />
    </button>
  );
}

function TierRowView({
  row,
  nikkesByName,
  canEdit,
  onNameChange,
  onRemoveNikke,
  getPublicUrl,
  catalogPreview,
  cardSize,
}: {
  row: TierRow;
  nikkesByName: ReadonlyMap<string, TierNikkeRow>;
  canEdit: boolean;
  onNameChange: (name: string) => void;
  onRemoveNikke: (name: string) => void;
  getPublicUrl: TierBoardProps["getPublicUrl"];
  catalogPreview: CatalogDropPreview | null;
  cardSize: TierCardSize;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tier-row-${row.id}`,
    disabled: !canEdit,
    data: { rowId: row.id },
  });
  const activePreview = catalogPreview?.rowId === row.id ? catalogPreview : null;
  const previewIndex = activePreview
    ? Math.max(0, Math.min(activePreview.index, row.nikkeNames.length))
    : -1;
  const sortableItems = row.nikkeNames.map((name) => `tier-card-${row.id}-${name}`);
  if (activePreview) sortableItems.splice(previewIndex, 0, activePreview.activeId);
  const visualItemCount = row.nikkeNames.length + (activePreview ? 1 : 0);
  const sizeClasses = getTierCardSizeClasses(cardSize);

  return (
    <div
      ref={setNodeRef}
      data-tier-row
      data-tier-row-id={row.id}
      className={`grid ${sizeClasses.rowMinHeight} grid-cols-[4.5rem_minmax(0,1fr)] overflow-visible rounded-2xl border transition-[min-height] sm:grid-cols-[6rem_minmax(0,1fr)]`}
      style={{
        borderColor: `${row.color}99`,
        backgroundColor: `${row.color}18`,
        boxShadow: isOver ? `0 0 0 2px ${row.color}` : undefined,
      }}
    >
      <div
        data-tier-row-label
        className="grid min-w-0 place-items-center overflow-hidden rounded-l-2xl border-r border-black/10 p-2 text-center text-lg font-black sm:text-xl"
        style={{ backgroundColor: row.color, color: getContrastingTextColor(row.color) }}
      >
        <EditableLabel
          value={row.name}
          canEdit={canEdit}
          onChange={onNameChange}
          className="w-full max-w-full text-center"
        />
      </div>

      <div data-tier-row-content className="min-w-0 p-2.5">
        <SortableContext
          items={sortableItems}
          strategy={rectSortingStrategy}
        >
          <div className="flex min-h-20 flex-wrap content-start gap-2">
            {Array.from({ length: visualItemCount }, (_, visualIndex) => {
              if (activePreview && visualIndex === previewIndex) {
                return (
                  <div
                    key={activePreview.activeId}
                    data-tier-insertion-placeholder
                    data-tier-catalog-drop-gap
                    aria-hidden="true"
                    className={`${sizeClasses.placeholder} shrink-0`}
                  />
                );
              }
              const index =
                activePreview && visualIndex > previewIndex ? visualIndex - 1 : visualIndex;
              const name = row.nikkeNames[index];
              const nikke = name ? nikkesByName.get(name) : null;
              return nikke && name ? (
                <TierNikkeCard
                  key={name}
                  nikke={nikke}
                  rowId={row.id}
                  index={index}
                  canEdit={canEdit}
                  onRemove={() => onRemoveNikke(name)}
                  getPublicUrl={getPublicUrl}
                  cardSize={cardSize}
                />
              ) : null;
            })}
            {row.nikkeNames.length === 0 && !activePreview ? (
              <div className="grid min-h-20 flex-1 place-items-center rounded-xl text-xs text-[var(--muted)]">
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>

    </div>
  );
}

export default function TierBoard({
  board,
  nikkes,
  canEdit,
  saving,
  onChange,
  getPublicUrl,
  bursts,
  elements,
  roles,
}: TierBoardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sectionSize, setSectionSize] = useState<TierSectionSize | null>(null);
  const [minimumSectionSize, setMinimumSectionSize] = useState<TierSectionSize | null>(null);
  const [sectionOffsetX, setSectionOffsetX] = useState(0);
  const [cardSize, setCardSize] = useState<TierCardSize>("default");
  const [catalogLayoutMode, setCatalogLayoutMode] = useState<TierCatalogLayoutMode>(() => {
    if (typeof window === "undefined") return "bottom";
    try {
      return parseTierCatalogLayoutMode(window.localStorage.getItem(TIER_CATALOG_LAYOUT_KEY));
    } catch {
      return "bottom";
    }
  });
  const [tierSectionHeight, setTierSectionHeight] = useState<number | null>(null);
  const [resizingEdge, setResizingEdge] = useState<TierResizeEdge | null>(null);
  const [catalogPreview, setCatalogPreview] = useState<CatalogDropPreview | null>(null);
  const [activeDraggedNikkeName, setActiveDraggedNikkeName] = useState<string | null>(null);
  const minimumSectionSizeRef = useRef<TierSectionSize | null>(null);
  const sectionElementRef = useRef<HTMLElement | null>(null);
  const localLayoutLoadedRef = useRef(false);
  const catalogPreviewRef = useRef<CatalogDropPreview | null>(null);
  const draggedNikkeRef = useRef<string | null>(null);
  const nikkesByName = useMemo(
    () => new Map(nikkes.map((nikke) => [nikke.name, nikke])),
    [nikkes]
  );
  const activeDraggedNikke = activeDraggedNikkeName
    ? nikkesByName.get(activeDraggedNikkeName) ?? null
    : null;
  const assignedTiers = useMemo(() => {
    const map = new Map<string, string>();
    board.rows.forEach((row) => row.nikkeNames.forEach((name) => map.set(name, row.name)));
    return map;
  }, [board.rows]);
  const boardSizeClasses = getTierCardSizeClasses(cardSize);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const setSectionNode = useCallback((node: HTMLElement | null) => {
    sectionElementRef.current = node;
    if (!node || !canEdit || localLayoutLoadedRef.current) return;
    const rect = node.getBoundingClientRect();
    const minimum = { width: Math.round(rect.width), height: Math.round(rect.height) };
    minimumSectionSizeRef.current = minimum;
    setMinimumSectionSize(minimum);
    localLayoutLoadedRef.current = true;

    let stored = null;
    try {
      stored = parseTierLocalLayout(window.localStorage.getItem(TIER_LOCAL_LAYOUT_KEY));
    } catch { }
    if (!stored) {
      setSectionSize(minimum);
      return;
    }
    const normalized = resizeTierSection(
      clampTierSectionSize(stored, minimum),
      { x: 0, y: 0 },
      "right",
      minimum,
      Number.POSITIVE_INFINITY,
      stored.offsetX ?? 0
    );
    setSectionSize(normalized.size);
    setSectionOffsetX(normalized.offsetX);
    setCardSize(stored.cardSize);
  }, [canEdit]);

  useEffect(() => {
    const sectionElement = sectionElementRef.current;
    if (!sectionElement) return;

    const updateHeight = () => {
      setTierSectionHeight(Math.round(sectionElement.getBoundingClientRect().height));
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(sectionElement);
    return () => observer.disconnect();
  }, []);

  function persistLocalLayout(
    size: TierSectionSize,
    nextCardSize: TierCardSize,
    offsetX: number
  ) {
    try {
      window.localStorage.setItem(
        TIER_LOCAL_LAYOUT_KEY,
        JSON.stringify({ ...size, cardSize: nextCardSize, offsetX })
      );
    } catch { }
  }

  function handleResizeStart(
    edge: TierResizeEdge,
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (!canEdit) return;
    event.preventDefault();
    const minimum = minimumSectionSizeRef.current;
    const sectionElement = event.currentTarget.closest("section");
    if (!minimum || !sectionElement) return;
    const sectionRect = sectionElement.getBoundingClientRect();
    setResizingEdge(edge);
    const measuredMinimum = minimum;
    const initial = {
      width: Math.round(sectionRect.width),
      height: sectionSize?.height ?? measuredMinimum.height,
    };
    const initialOffsetX = sectionOffsetX;
    const layoutRoot = sectionElement.closest<HTMLElement>("[data-tier-layout-mode]");
    const sideLayoutRight = layoutRoot?.getBoundingClientRect().right;
    const edgeMaximumWidth =
      edge === "left"
        ? sectionRect.right - VIEWPORT_RESIZE_MARGIN
        : catalogLayoutMode === "side" && sideLayoutRight
          ? sideLayoutRight - sectionRect.left - SIDE_LAYOUT_GAP - SIDE_CATALOG_MIN_WIDTH
          : window.innerWidth - VIEWPORT_RESIZE_MARGIN - sectionRect.left;
    const parsedMaximumWidth = Number.parseFloat(
      window.getComputedStyle(sectionElement).maxWidth
    );
    const configuredMaximumWidth = Number.isFinite(parsedMaximumWidth)
      ? parsedMaximumWidth
      : edgeMaximumWidth;
    const maximumWidth = Math.min(edgeMaximumWidth, configuredMaximumWidth);
    const startX = event.clientX;
    const startY = event.clientY;
    let finalSize = initial;
    let finalOffsetX = initialOffsetX;

    function handlePointerMove(moveEvent: PointerEvent) {
      const result = resizeTierSection(
        initial,
        {
          x: moveEvent.clientX - startX,
          y: moveEvent.clientY - startY,
        },
        edge,
        measuredMinimum,
        maximumWidth,
        initialOffsetX
      );
      finalSize = result.size;
      finalOffsetX = result.offsetX;
      setSectionSize(finalSize);
      setSectionOffsetX(finalOffsetX);
    }

    function handlePointerEnd() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      setResizingEdge(null);
      persistLocalLayout(finalSize, cardSize, finalOffsetX);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd, { once: true });
    window.addEventListener("pointercancel", handlePointerEnd, { once: true });
  }

  function handleCardSizeChange(nextCardSize: TierCardSize) {
    setCardSize(nextCardSize);
    const size = sectionSize ?? minimumSectionSizeRef.current;
    if (size) persistLocalLayout(size, nextCardSize, sectionOffsetX);
  }

  function handleResetLocalLayout() {
    const minimum = minimumSectionSizeRef.current;
    if (minimum) setSectionSize(minimum);
    setSectionOffsetX(0);
    setCardSize("default");
    try {
      window.localStorage.removeItem(TIER_LOCAL_LAYOUT_KEY);
    } catch { }
  }

  function updateRows(rows: TierRow[]) {
    onChange({ ...board, rows });
  }

  function handleDragStart(event: DragStartEvent) {
    const activeData = (event.active.data.current ?? {}) as DragData;
    draggedNikkeRef.current = activeData.nikkeName ?? null;
    setActiveDraggedNikkeName(activeData.nikkeName ?? null);
  }

  function updateCatalogPreview(nextPreview: CatalogDropPreview | null) {
    catalogPreviewRef.current = nextPreview;
    setCatalogPreview((current) =>
      current?.activeId === nextPreview?.activeId &&
      current?.rowId === nextPreview?.rowId &&
      current?.index === nextPreview?.index
        ? current
        : nextPreview
    );
  }

  function handleDragOver(event: DragOverEvent) {
    const activeData = (event.active.data.current ?? {}) as DragData;
    if (activeData.source !== "catalog" || !activeData.nikkeName || !event.over) {
      updateCatalogPreview(null);
      return;
    }

    const overData = (event.over.data.current ?? {}) as DragData;
    const rowId = overData.rowId;
    const targetRow = rowId ? board.rows.find((row) => row.id === rowId) : null;
    if (!rowId || !targetRow) {
      updateCatalogPreview(null);
      return;
    }

    const activeRect = event.active.rect.current.translated;
    let index = getCatalogInsertionIndex(
      rowId,
      activeRect,
      typeof overData.index === "number" ? overData.index : targetRow.nikkeNames.length
    );
    index = Math.max(0, Math.min(index, targetRow.nikkeNames.length));

    const nextPreview: CatalogDropPreview = {
      activeId: String(event.active.id),
      nikkeName: activeData.nikkeName,
      rowId,
      index,
    };
    updateCatalogPreview(nextPreview);
  }

  function clearDraggedNikkeSoon() {
    updateCatalogPreview(null);
    setActiveDraggedNikkeName(null);
    window.setTimeout(() => {
      draggedNikkeRef.current = null;
    }, 0);
  }

  function handleDragEnd(event: DragEndEvent) {
    const previewTarget = catalogPreviewRef.current;
    clearDraggedNikkeSoon();
    if (!canEdit || !event.over) return;
    const activeData = (event.active.data.current ?? {}) as DragData;
    const overData = (event.over.data.current ?? {}) as DragData & { rowId?: string };
    const nikkeName = activeData.nikkeName;
    const targetRowId =
      (activeData.source === "catalog" ? previewTarget?.rowId : undefined) ??
      overData.rowId ??
      (typeof event.over.id === "string" && event.over.id.startsWith("tier-row-")
        ? event.over.id.slice("tier-row-".length)
        : undefined);
    if (!nikkeName || !targetRowId) return;
    const targetIndex =
      activeData.source === "catalog"
        ? previewTarget?.index
        : typeof overData.index === "number"
          ? overData.index
          : undefined;
    onChange(
      moveNikke(board, {
        nikkeName,
        targetRowId,
        targetIndex,
      })
    );
  }

  function handleResetAll() {
    onChange(createDefaultTierBoard());
    handleResetLocalLayout();
  }

  function handleCatalogLayoutModeChange(nextMode: TierCatalogLayoutMode) {
    setCatalogLayoutMode(nextMode);
    try {
      localStorage.setItem(TIER_CATALOG_LAYOUT_KEY, nextMode);
    } catch { }
  }

  function handleCatalogImageClick(nikkeName: string) {
    if (!canEdit || draggedNikkeRef.current === nikkeName) return;
    const finalRow = board.rows.at(-1);
    if (!finalRow) return;
    onChange(
      moveNikke(board, {
        nikkeName,
        targetRowId: finalRow.id,
        targetIndex: finalRow.nikkeNames.length,
      })
    );
  }

  return (
    <DndContext
      id="nikke-tier-dnd"
      sensors={sensors}
      collisionDetection={tierCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={clearDraggedNikkeSoon}
      onDragEnd={handleDragEnd}
    >
      <div
        data-tier-layout-mode={catalogLayoutMode}
        style={
          catalogLayoutMode === "side"
            ? {
                width: "calc(100% + max(0px, (100vw - 72rem) / 2 - 2rem))",
                gridTemplateColumns:
                  sectionSize && minimumSectionSize
                    ? `${getTierSectionLayoutWidth(
                        sectionSize,
                        sectionOffsetX,
                        minimumSectionSize.width
                      )}px minmax(8rem, 1fr)`
                    : "auto minmax(8rem, 1fr)",
              }
            : undefined
        }
        className={
          catalogLayoutMode === "side"
            ? "grid min-w-0 items-start gap-5 overflow-visible"
            : "grid grid-cols-[minmax(0,1fr)] gap-5"
        }
      >
        <section
          ref={setSectionNode}
          className="relative flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] lg:p-5"
          style={
            canEdit && sectionSize
              ? {
                  width: sectionSize.width,
                  height: sectionSize.height,
                  maxWidth:
                    catalogLayoutMode === "side"
                      ? undefined
                      : "calc(100vw - 2rem)",
                  transform: `translateX(${sectionOffsetX}px)`,
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--text)]">
                <EditableLabel
                  value={board.sectionName}
                  canEdit={canEdit}
                  onChange={(sectionName) => onChange({ ...board, sectionName })}
                />
              </h2>
              {saving ? <span className="text-xs text-[var(--muted)]">저장 중…</span> : null}
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-label="티어 설정"
                title="설정"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-xl text-[var(--theme-text-soft)] transition hover:rotate-45 hover:border-cyan-400"
              >
                ⚙
              </button>
            ) : null}
          </div>

          {canEdit && settingsOpen ? (
            <TierSettingsPanel
              rows={board.rows}
              cardSize={cardSize}
              layoutMode={catalogLayoutMode}
              onChange={updateRows}
              onCardSizeChange={handleCardSizeChange}
              onLayoutModeChange={handleCatalogLayoutModeChange}
              onClearAssignments={() => onChange(clearTierAssignments(board))}
              onResetAll={handleResetAll}
              onResetLocalLayout={handleResetLocalLayout}
              onClose={() => setSettingsOpen(false)}
            />
          ) : null}

          <div className={`mt-4 grid min-h-0 flex-1 content-start overflow-y-auto transition-[gap] ${boardSizeClasses.boardGap}`}>
            {board.rows.map((row) => (
              <TierRowView
                key={row.id}
                row={row}
                nikkesByName={nikkesByName}
                canEdit={canEdit}
                onRemoveNikke={(name) => {
                  if (draggedNikkeRef.current === name) return;
                  onChange(removeNikkeFromTier(board, name));
                }}
                onNameChange={(name) =>
                  updateRows(
                    board.rows.map((item) => (item.id === row.id ? { ...item, name } : item))
                  )
                }
                getPublicUrl={getPublicUrl}
                catalogPreview={catalogPreview}
                cardSize={cardSize}
              />
            ))}
          </div>
          {canEdit ? (
            <>
              <button
                type="button"
                data-resize-edge="left"
                onPointerDown={(event) => handleResizeStart("left", event)}
                data-resizing={resizingEdge === "left"}
                aria-label="티어 섹션 왼쪽 크기 조절"
                title="드래그하여 티어 섹션 왼쪽 크기 조절"
                className="tier-resize-handle absolute bottom-0 left-0 h-10 w-10 cursor-nwse-resize touch-none"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="tier-resize-handle-wedge tier-resize-handle-wedge-left"
                >
                  <path d="M2 24 L24 2 A22 22 0 0 1 2 24 Z" />
                </svg>
              </button>
              <button
                type="button"
                data-resize-edge="right"
                onPointerDown={(event) => handleResizeStart("right", event)}
                data-resizing={resizingEdge === "right"}
                aria-label="티어 섹션 오른쪽 크기 조절"
                title="드래그하여 티어 섹션 오른쪽 크기 조절"
                className="tier-resize-handle absolute bottom-0 right-0 h-10 w-10 cursor-nwse-resize touch-none"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="tier-resize-handle-wedge"
                >
                  <path d="M2 24 L24 2 A22 22 0 0 1 2 24 Z" />
                </svg>
              </button>
            </>
          ) : null}
        </section>

        <div
          className={catalogLayoutMode === "side" ? "min-h-0 min-w-0" : ""}
          style={
            catalogLayoutMode === "side" && tierSectionHeight
              ? { height: tierSectionHeight }
              : undefined
          }
        >
          <TierNikkeCatalog
            nikkes={nikkes}
            assignedTiers={assignedTiers}
            canEdit={canEdit}
            getPublicUrl={getPublicUrl}
            bursts={bursts}
            elements={elements}
            roles={roles}
            layoutMode={catalogLayoutMode}
            onImageClick={handleCatalogImageClick}
          />
        </div>
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 180,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeDraggedNikke ? (
          <div className="pointer-events-none">
            <TierNikkeCardVisual
              nikke={activeDraggedNikke}
              getPublicUrl={getPublicUrl}
              cardSize={cardSize}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
