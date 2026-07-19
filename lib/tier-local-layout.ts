export const TIER_LOCAL_LAYOUT_KEY = "soloraid_tier_local_layout_v1";

export type TierCardSize = "small" | "default" | "large";

export type TierSectionSize = {
  width: number;
  height: number;
};

export type TierLocalLayout = TierSectionSize & {
  cardSize: TierCardSize;
  offsetX?: number;
};

export type TierResizeEdge = "left" | "right";

export type TierCardSizeClasses = {
  card: string;
  name: string;
  placeholder: string;
  imageSizes: string;
  rowMinHeight: string;
  boardGap: string;
};

const CARD_SIZE_CLASSES: Record<TierCardSize, TierCardSizeClasses> = {
  small: {
    card: "w-14 sm:w-16",
    name: "text-[11px] sm:text-xs",
    placeholder: "h-[84px] w-14 sm:h-[94px] sm:w-16",
    imageSizes: "64px",
    rowMinHeight: "min-h-[7rem]",
    boardGap: "gap-2",
  },
  default: {
    card: "w-16 sm:w-20",
    name: "text-[13px]",
    placeholder: "h-[94px] w-16 sm:h-[110px] sm:w-20",
    imageSizes: "80px",
    rowMinHeight: "min-h-[8.5rem]",
    boardGap: "gap-2.5",
  },
  large: {
    card: "w-20 sm:w-24",
    name: "text-sm",
    placeholder: "h-[110px] w-20 sm:h-[126px] sm:w-24",
    imageSizes: "96px",
    rowMinHeight: "min-h-[10rem]",
    boardGap: "gap-4",
  },
};

function isCardSize(value: unknown): value is TierCardSize {
  return value === "small" || value === "default" || value === "large";
}

export function parseTierLocalLayout(value: string | null): TierLocalLayout | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      !Number.isFinite(parsed.width) ||
      !Number.isFinite(parsed.height) ||
      Number(parsed.width) <= 0 ||
      Number(parsed.height) <= 0 ||
      !isCardSize(parsed.cardSize)
    ) {
      return null;
    }
    return {
      width: Number(parsed.width),
      height: Number(parsed.height),
      cardSize: parsed.cardSize,
      ...(Number.isFinite(parsed.offsetX) ? { offsetX: Number(parsed.offsetX) } : {}),
    };
  } catch {
    return null;
  }
}

export function clampTierSectionSize(
  size: TierSectionSize,
  minimum: TierSectionSize
): TierSectionSize {
  return {
    width: Math.max(size.width, minimum.width),
    height: Math.max(size.height, minimum.height),
  };
}

export function getTierCardSizeClasses(size: TierCardSize): TierCardSizeClasses {
  return CARD_SIZE_CLASSES[size];
}

export function resizeTierSection(
  initial: TierSectionSize,
  delta: { x: number; y: number },
  edge: TierResizeEdge,
  minimum: TierSectionSize,
  maximumWidth = Number.POSITIVE_INFINITY
): { size: TierSectionSize; offsetDeltaX: number } {
  const requestedWidth = initial.width + (edge === "left" ? -delta.x : delta.x);
  const effectiveMaximumWidth = Math.max(0, maximumWidth);
  const effectiveMinimumWidth = Math.min(minimum.width, effectiveMaximumWidth);
  const size = {
    width: Math.min(
      Math.max(requestedWidth, effectiveMinimumWidth),
      effectiveMaximumWidth
    ),
    height: Math.max(initial.height + delta.y, minimum.height),
  };

  return {
    size,
    offsetDeltaX: edge === "left" ? initial.width - size.width : 0,
  };
}
