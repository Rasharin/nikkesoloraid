"use client";

import { useSortable } from "@dnd-kit/sortable";
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: getDeckSlotId(index),
    animateLayoutChanges: () => false,
    data: {
      source: "deck",
      slotIndex: index,
      nikkeName: name ?? undefined,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  const isFilled = Boolean(name && nikke);
  const displayName = nikke ? formatNikkeDisplayName(nikke.name) : "";
  const showDropHint = hovered && Boolean(activeDrag);
  const dropStateClass = showDropHint
    ? canDrop
      ? "border-cyan-300/90 bg-cyan-400/10 ring-2 ring-cyan-300/60 shadow-[0_0_0_1px_rgba(103,232,249,0.35)]"
      : "border-red-400/80 bg-red-400/10 ring-2 ring-red-400/45 shadow-[0_0_0_1px_rgba(248,113,113,0.28)]"
    : isDragging
      ? "border-white/20 bg-neutral-950/20 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
      : "border-neutral-800";

  return (
    <div ref={setNodeRef} style={style} className={`relative isolate flex min-w-0 flex-col items-center transition-transform ${showDropHint && canDrop ? "z-10" : ""}`}>
      <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border bg-neutral-950/40 transition-all duration-150 ${dropStateClass}`}>
        {isFilled ? (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className={`h-full w-full cursor-grab select-none touch-none transition-all duration-150 active:cursor-grabbing ${
              isDragging ? "scale-[0.97] opacity-35 saturate-50" : "opacity-100"
            }`}
            title={`${displayName} 클릭해서 제거, 드래그해서 순서 변경`}
            aria-label={`${displayName} 클릭해서 제거, 드래그해서 순서 변경`}
            {...attributes}
            {...listeners}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={displayName} draggable={false} className="h-full w-full object-cover pointer-events-none" />
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
