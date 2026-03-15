"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { memo } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";
import type { NikkeRow } from "./deckBuilderTypes";

type DraggableNikkeCardProps = {
  nikke: NikkeRow;
  imageUrl: string;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
};

function DraggableNikkeCardComponent({ nikke, imageUrl, onAdd, onRemove }: DraggableNikkeCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `selected-${nikke.name}`,
    data: {
      source: "selected",
      nikkeName: nikke.name,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onAdd(nikke.name)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onAdd(nikke.name);
        }
      }}
      className={`relative flex flex-col items-center outline-none transition ${
        isDragging ? "z-10 opacity-60" : "opacity-100"
      }`}
      title={nikke.name}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove(nikke.name);
        }}
        aria-label={`${nikke.name} 제거`}
        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-red-400 transition hover:bg-black/90 hover:text-red-300 active:scale-[0.95]"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M6 6L18 18" />
          <path d="M18 6L6 18" />
        </svg>
      </button>

      <div
        className={`aspect-square w-full overflow-hidden rounded-xl border bg-neutral-950/40 transition ${
          isDragging ? "border-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]" : "border-neutral-800"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? (
          <img src={imageUrl} alt={nikke.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
        )}
      </div>

      <div className="mt-1 break-words text-center text-xs leading-tight text-neutral-200 line-clamp-2">
        {formatNikkeDisplayName(nikke.name)}
      </div>
    </div>
  );
}

const DraggableNikkeCard = memo(DraggableNikkeCardComponent);

export default DraggableNikkeCard;
