"use client";

import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { memo, useMemo, type Ref } from "react";
import { rectSortingStrategy, SortableContext, arrayMove } from "@dnd-kit/sortable";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import DeckSlot from "./DeckSlot";
import { getDeckSlotId, parseDeckSlotTarget, type DraftSlot, type DragItemData, type NikkeRow } from "./deckBuilderTypes";

type DeckBuilderSectionProps = {
  deckIndex?: number;
  title?: string;
  draft: DraftSlot[];
  nikkeMap: Map<string, NikkeRow>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  score: string;
  scoreRef: Ref<HTMLInputElement>;
  sectionRef?: Ref<HTMLElement>;
  editingId: string | null;
  activeDrag: DragItemData | null;
  hoveredSlotIndex: number | null;
  onScoreChange: (value: string) => void;
  onRemoveFromDraft: (index: number) => void;
  onSaveDeck: () => void;
  onClearDraft: () => void;
  onDeleteDeck?: () => void;
  onSaveAllDecks?: () => void;
  showSaveAll?: boolean;
  className?: string;
};

function DeckBuilderSectionComponent({
  deckIndex = 0,
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
  onDeleteDeck,
  onSaveAllDecks,
  showSaveAll,
  className,
}: DeckBuilderSectionProps) {
  const slotIds = useMemo(() => draft.map((_, index) => getDeckSlotId(index, deckIndex)), [deckIndex, draft]);

  return (
    <section ref={sectionRef} className={`rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 ${className ?? ""}`}>
      <div>
        <SortableContext items={slotIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-5 gap-2">
            {draft.map((name, index) => {
              const nikke = name ? nikkeMap.get(name) : undefined;
              const imageUrl = nikke?.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

              return (
                <DeckSlot
                  key={getDeckSlotId(index, deckIndex)}
                  deckIndex={deckIndex}
                  index={index}
                  name={name}
                  nikke={nikke}
                  imageUrl={imageUrl}
                  activeDrag={activeDrag}
                  hovered={hoveredSlotIndex === index}
                  canDrop={getSlotDropAvailability(index, deckIndex, draft, activeDrag)}
                  onRemove={onRemoveFromDraft}
                />
              );
            })}
          </div>
        </SortableContext>

        <div className="mt-2">
          <input
            ref={scoreRef}
            inputMode="decimal"
            value={score}
            onChange={(event) => onScoreChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSaveDeck();
              }
            }}
            placeholder="점수입력 (예: 6510755443 또는 23.3억)"
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-base outline-none transition focus:border-white/40"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onSaveDeck}
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-base font-semibold text-neutral-900 active:scale-[0.99]"
          >
            {editingId ? "수정 저장" : "덱 저장"}
          </button>
          <button
            type="button"
            onClick={onClearDraft}
            className="rounded-2xl border border-neutral-700 px-4 py-3 text-base active:scale-[0.99]"
          >
            비우기
          </button>
          {onDeleteDeck ? (
            <button
              type="button"
              onClick={onDeleteDeck}
              className="rounded-2xl border border-red-500/40 px-4 py-3 text-base text-red-200 active:scale-[0.99]"
            >
              삭제
            </button>
          ) : null}
        </div>
        {showSaveAll && onSaveAllDecks ? (
          <button
            type="button"
            onClick={onSaveAllDecks}
            className="mt-2 w-full rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-base font-semibold text-cyan-100 active:scale-[0.99]"
          >
            작성된 덱 모두 저장
          </button>
        ) : null}
      </div>
    </section>
  );
}

function getSlotDropAvailability(index: number, deckIndex: number, draft: DraftSlot[], activeDrag: DragItemData | null): boolean {
  if (!activeDrag) return false;

  if (activeDrag.source === "selected" || activeDrag.source === "spare") {
    return !draft.includes(activeDrag.nikkeName);
  }

  if (activeDrag.source !== "deck") {
    return false;
  }

  if (typeof activeDrag.slotIndex !== "number") {
    return false;
  }

  if (activeDrag.deckIndex === deckIndex && activeDrag.slotIndex === index) {
    return false;
  }

  return activeDrag.nikkeName ? !draft.includes(activeDrag.nikkeName) || draft[index] === activeDrag.nikkeName : true;
}

export function moveDraftSlot(draft: DraftSlot[], fromIndex: number, toIndex: number): DraftSlot[] {
  return arrayMove(draft, fromIndex, toIndex);
}

export function getHoveredSlotIndex(event: DragOverEvent): number | null {
  return parseDeckSlotTarget(event.over?.id)?.slotIndex ?? null;
}

export function getDroppedSlotIndex(event: DragEndEvent): number | null {
  return parseDeckSlotTarget(event.over?.id)?.slotIndex ?? null;
}

export function getHoveredDeckSlotTarget(event: DragOverEvent) {
  return parseDeckSlotTarget(event.over?.id);
}

export function getDroppedDeckSlotTarget(event: DragEndEvent) {
  return parseDeckSlotTarget(event.over?.id);
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
