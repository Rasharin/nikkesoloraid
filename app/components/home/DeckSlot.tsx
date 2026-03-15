"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import { getDeckSlotId, type DragItemData, type NikkeRow } from "./deckBuilderTypes";

type DeckSlotProps = {
  index: number;
  name: string | null;
  nikke: NikkeRow | undefined;
  imageUrl: string;
  activeDrag: DragItemData | null;
  hovered: boolean;
  canDrop: boolean;
  onRemove: (index: number) => void;
};

export default function DeckSlot({
  index,
  name,
  nikke,
  imageUrl,
  activeDrag,
  hovered,
  canDrop,
  onRemove,
}: DeckSlotProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getDeckSlotId(index),
    animateLayoutChanges: (args) => {
      if (args.wasDragging) return false;
      return defaultAnimateLayoutChanges(args);
    },
    data: {
      source: "deck",
      slotIndex: index,
      nikkeName: name ?? undefined,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFilled = Boolean(name && nikke);
  const displayName = nikke ? formatNikkeDisplayName(nikke.name) : "";
  const showDropHint = hovered && Boolean(activeDrag);
  const dropStateClass = showDropHint
    ? canDrop
      ? "border-cyan-300/80 shadow-[0_0_0_1px_rgba(103,232,249,0.35)]"
      : "border-red-400/70 shadow-[0_0_0_1px_rgba(248,113,113,0.28)]"
    : isDragging
      ? "border-white/50 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
      : "border-neutral-800";

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col items-center">
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-2xl border bg-neutral-950/40 transition ${dropStateClass}`}
      >
        {isFilled ? (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className={`h-full w-full cursor-grab select-none active:cursor-grabbing ${
              isDragging ? "opacity-30" : "opacity-100"
            }`}
            title={`${displayName} 클릭해서 제거, 드래그해서 순서 변경`}
            aria-label={`${displayName} 클릭해서 제거, 드래그해서 순서 변경`}
            {...attributes}
            {...listeners}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={displayName} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="grid h-full w-full place-items-center text-lg text-neutral-600">+</div>
        )}
      </div>

      <div className="mt-1 min-h-[2.5rem] text-center text-xs leading-tight text-neutral-200">
        {name ? formatNikkeDisplayName(name) : ""}
      </div>
    </div>
  );
}
