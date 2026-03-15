"use client";

import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { memo, useMemo, type RefObject } from "react";
import { rectSortingStrategy, SortableContext, arrayMove } from "@dnd-kit/sortable";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import DeckSlot from "./DeckSlot";
import { getDeckSlotId, parseDeckSlotIndex, type DraftSlot, type DragItemData, type NikkeRow } from "./deckBuilderTypes";

type DeckBuilderSectionProps = {
  title: string;
  draft: DraftSlot[];
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  score: string;
  scoreRef: RefObject<HTMLInputElement | null>;
  sectionRef: RefObject<HTMLElement | null>;
  editingId: string | null;
  activeDrag: DragItemData | null;
  hoveredSlotIndex: number | null;
  onScoreChange: (value: string) => void;
  onRemoveFromDraft: (index: number) => void;
  onSaveDeck: () => void;
  onClearDraft: () => void;
  className?: string;
};

function DeckBuilderSectionComponent({
  title,
  draft,
  nikkeMap,
  getPublicUrl,
  score,
  scoreRef,
  sectionRef,
  editingId,
  activeDrag,
  hoveredSlotIndex,
  onScoreChange,
  onRemoveFromDraft,
  onSaveDeck,
  onClearDraft,
  className,
}: DeckBuilderSectionProps) {
  const slotIds = useMemo(() => draft.map((_, index) => getDeckSlotId(index)), [draft]);

  return (
    <section ref={sectionRef} className={`rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="text-xs text-neutral-500">드래그 또는 클릭으로 구성</div>
      </div>

      <div className="mt-3">
        <SortableContext items={slotIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-5 gap-2">
            {draft.map((name, index) => {
              const nikke = name ? nikkeMap.get(name) : undefined;
              const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

              return (
                <DeckSlot
                  key={getDeckSlotId(index)}
                  index={index}
                  name={name}
                  nikke={nikke}
                  imageUrl={imageUrl}
                  activeDrag={activeDrag}
                  hovered={hoveredSlotIndex === index}
                  canDrop={getSlotDropAvailability(index, draft, activeDrag)}
                  onRemove={onRemoveFromDraft}
                />
              );
            })}
          </div>
        </SortableContext>

        <div className="mt-1">
          <input
            ref={scoreRef}
            inputMode="numeric"
            value={score}
            onChange={(event) => onScoreChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSaveDeck();
              }
            }}
            placeholder="점수입력 (예: 6510755443)"
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-base outline-none transition focus:border-white/40"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onSaveDeck}
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-base font-semibold text-neutral-900 active:scale-[0.99]"
          >
            {editingId ? "수정 저장" : "덱 저장"}
          </button>
          <button
            onClick={onClearDraft}
            className="rounded-2xl border border-neutral-700 px-4 py-3 text-base active:scale-[0.99]"
          >
            비우기
          </button>
        </div>
      </div>
    </section>
  );
}

function getSlotDropAvailability(index: number, draft: DraftSlot[], activeDrag: DragItemData | null): boolean {
  if (!activeDrag) return false;

  if (activeDrag.source === "selected") {
    if (draft[index] !== null) return false;
    return !draft.includes(activeDrag.nikkeName);
  }

  if (typeof activeDrag.slotIndex !== "number" || activeDrag.slotIndex === index) {
    return false;
  }

  return true;
}

export function moveDraftSlot(draft: DraftSlot[], fromIndex: number, toIndex: number): DraftSlot[] {
  return arrayMove(draft, fromIndex, toIndex);
}

export function getHoveredSlotIndex(event: DragOverEvent): number | null {
  return parseDeckSlotIndex(event.over?.id);
}

export function getDroppedSlotIndex(event: DragEndEvent): number | null {
  return parseDeckSlotIndex(event.over?.id);
}

export function renderDragOverlayCard(nikke: NikkeRow | undefined, imageUrl: string, width?: number | null) {
  if (!nikke) return null;

  return (
    <div
      className="pointer-events-none relative z-[80] origin-center scale-[1.03] cursor-grabbing rounded-2xl border border-cyan-200/70 bg-neutral-900/95 p-1.5 shadow-[0_28px_70px_rgba(0,0,0,0.5)] ring-2 ring-cyan-300/45"
      style={{ width: width ? `${Math.round(width)}px` : "88px" }}
    >
      <div className="aspect-square overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? (
          <img src={imageUrl} alt={nikke.name} draggable={false} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
        )}
      </div>
      <div className="mt-1 min-h-[2.5rem] text-center text-[11px] leading-tight text-neutral-100">
        {formatNikkeDisplayName(nikke.name)}
      </div>
    </div>
  );
}

const DeckBuilderSection = memo(DeckBuilderSectionComponent);

export default DeckBuilderSection;
