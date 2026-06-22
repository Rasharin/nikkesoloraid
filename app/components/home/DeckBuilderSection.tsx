"use client";

import Image from "next/image";
import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { memo, useMemo, type Ref } from "react";
import { rectSortingStrategy, SortableContext, arrayMove } from "@dnd-kit/sortable";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import { formatPlainScoreText } from "../../../lib/score-format";
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
  onCopyDeck?: () => void;
  onClearDraft: () => void;
  onDeleteDeck?: () => void;
  onSaveAllDecks?: () => void;
  showSaveAll?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  note?: string;
  onNoteChange?: (value: string) => void;
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
  onCopyDeck,
  onClearDraft,
  onDeleteDeck,
  onSaveAllDecks,
  showSaveAll,
  selected,
  onToggleSelected,
  note,
  onNoteChange,
  className,
}: DeckBuilderSectionProps) {
  const slotIds = useMemo(() => draft.map((_, index) => getDeckSlotId(index, deckIndex)), [deckIndex, draft]);

  return (
    <section ref={sectionRef} className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 ${className ?? ""}`}>
      <div>
        <SortableContext items={slotIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-5 gap-0.5">
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

        <div className="mt-1.5 flex gap-1.5">
          <input
            ref={scoreRef}
            inputMode="text"
            value={score}
            onChange={(event) => onScoreChange(formatPlainScoreText(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSaveDeck();
              }
            }}
            placeholder="점수 입력"
            className="w-1/2 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--theme-input)] px-3 py-2 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--theme-border-strong)]"
          />
          {onNoteChange !== undefined ? (
            <input
              type="text"
              value={note ?? ""}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="메모"
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--theme-input)] px-3 py-2 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--theme-border-strong)]"
            />
          ) : null}
        </div>

        <div className="mt-3 flex flex-nowrap gap-1.5">
          <button
            type="button"
            onClick={onSaveDeck}
            className="deck-save-button min-w-0 flex-[1.2] whitespace-nowrap rounded-xl border border-transparent bg-white px-2 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-200 active:scale-[0.99] dark:border-transparent sm:text-sm"
          >
            덱 저장
          </button>
          {onCopyDeck ? (
            <button
              type="button"
              onClick={onCopyDeck}
              className="min-w-0 whitespace-nowrap rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-2 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:border-cyan-300/70 hover:bg-cyan-500/15 active:scale-[0.99] sm:text-sm"
            >
              복사
            </button>
          ) : null}
          {onToggleSelected ? (
            <button
              type="button"
              onClick={onToggleSelected}
              className={`min-w-0 whitespace-nowrap rounded-xl border px-2 py-1.5 text-xs font-semibold transition active:scale-[0.99] sm:text-sm ${
                selected
                  ? "border-yellow-500/60 bg-yellow-400/20 text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text)] hover:border-[var(--theme-border-strong)]"
              }`}
              aria-pressed={selected}
            >
              선택
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClearDraft}
            className="min-w-0 whitespace-nowrap rounded-xl border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--card)] active:scale-[0.99] sm:text-sm"
          >
            비우기
          </button>
          {onDeleteDeck ? (
            <button
              type="button"
              onClick={onDeleteDeck}
              className="min-w-0 whitespace-nowrap rounded-xl border border-red-500/40 px-2 py-1.5 text-xs text-[var(--text)] transition hover:border-red-400 hover:bg-red-500/15 active:scale-[0.99] sm:text-sm"
            >
              삭제
            </button>
          ) : null}
        </div>
        {showSaveAll && onSaveAllDecks ? (
          <button
            type="button"
            onClick={onSaveAllDecks}
            className="mt-2 w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-1.5 text-sm font-semibold text-[var(--text)] active:scale-[0.99]"
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
      className="pointer-events-none relative z-[80] origin-center scale-[1.03] cursor-grabbing rounded-2xl border border-cyan-200/70 bg-[var(--theme-panel)] p-1.5 shadow-[0_28px_70px_rgba(0,0,0,0.5)] ring-2 ring-cyan-300/45"
      style={{ width: width ? `${Math.round(width)}px` : "88px" }}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {imageUrl ? (
          <Image fill src={imageUrl} alt={nikke.name} draggable={false} className="object-cover" sizes="(max-width: 640px) 20vw, 100px" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
        )}
      </div>
      <div className="mt-1 min-h-[2.5rem] text-center text-[11px] leading-tight text-[var(--text)]">
        {formatNikkeDisplayName(nikke.name)}
      </div>
    </div>
  );
}

const DeckBuilderSection = memo(DeckBuilderSectionComponent);

export default DeckBuilderSection;
