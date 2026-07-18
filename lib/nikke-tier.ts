export const TIER_ROW_MIN = 1;
export const TIER_ROW_MAX = 20;
export const DEFAULT_TIER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
] as const;

const DEFAULT_TIER_NAMES = ["S", "A", "B", "C", "D"] as const;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export type TierRow = {
  id: string;
  name: string;
  color: string;
  nikkeNames: string[];
};

export type TierBoardData = {
  sectionName: string;
  rows: TierRow[];
  updatedAt: string | null;
};

export type TierMove = {
  nikkeName: string;
  targetRowId: string;
  targetIndex?: number;
};

export function getDefaultTierName(index: number) {
  return DEFAULT_TIER_NAMES[index] ?? `티어 ${index + 1}`;
}

export function getDefaultTierColor(index: number) {
  return DEFAULT_TIER_COLORS[index % DEFAULT_TIER_COLORS.length];
}

export function createDefaultTierBoard(): TierBoardData {
  return {
    sectionName: "니케 티어",
    rows: DEFAULT_TIER_NAMES.map((name, index) => ({
      id: `tier-${name.toLowerCase()}`,
      name,
      color: getDefaultTierColor(index),
      nikkeNames: [],
    })),
    updatedAt: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeUpdatedAt(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return value;
}

export function normalizeTierBoard(value: unknown, validNikkeNames?: ReadonlySet<string>): TierBoardData {
  const fallback = createDefaultTierBoard();
  if (!isRecord(value)) return fallback;

  const sectionName =
    typeof value.sectionName === "string" && value.sectionName.trim()
      ? value.sectionName.trim()
      : fallback.sectionName;
  const sourceRows = Array.isArray(value.rows) ? value.rows.slice(0, TIER_ROW_MAX) : [];
  const usedRowIds = new Set<string>();
  const seenNikkes = new Set<string>();

  const rows = sourceRows
    .filter(isRecord)
    .map((row, index): TierRow => {
      const requestedId = typeof row.id === "string" ? row.id.trim() : "";
      let id = requestedId || `tier-${index + 1}`;
      while (usedRowIds.has(id)) id = `${id}-${index + 1}`;
      usedRowIds.add(id);

      const name =
        typeof row.name === "string" && row.name.trim()
          ? row.name.trim()
          : getDefaultTierName(index);
      const requestedColor = typeof row.color === "string" ? row.color.trim().toLowerCase() : "";
      const color = HEX_COLOR_PATTERN.test(requestedColor)
        ? requestedColor
        : getDefaultTierColor(index);
      const nikkeNames = Array.isArray(row.nikkeNames)
        ? row.nikkeNames.filter((item): item is string => {
            if (typeof item !== "string") return false;
            const nikkeName = item.trim();
            if (!nikkeName || seenNikkes.has(nikkeName)) return false;
            if (validNikkeNames && !validNikkeNames.has(nikkeName)) return false;
            seenNikkes.add(nikkeName);
            return true;
          }).map((item) => item.trim())
        : [];

      return { id, name, color, nikkeNames };
    });

  return {
    sectionName,
    rows: rows.length >= TIER_ROW_MIN ? rows : fallback.rows,
    updatedAt: normalizeUpdatedAt(value.updatedAt),
  };
}

export function moveNikke(board: TierBoardData, move: TierMove): TierBoardData {
  if (!board.rows.some((row) => row.id === move.targetRowId)) return board;

  const rows = board.rows.map((row) => ({
    ...row,
    nikkeNames: row.nikkeNames.filter((name) => name !== move.nikkeName),
  }));
  const target = rows.find((row) => row.id === move.targetRowId);
  if (!target) return board;

  const targetIndex = Math.max(
    0,
    Math.min(move.targetIndex ?? target.nikkeNames.length, target.nikkeNames.length)
  );
  target.nikkeNames.splice(targetIndex, 0, move.nikkeName);

  return { ...board, rows };
}

export function removeTierRow(board: TierBoardData, rowId: string): TierBoardData {
  if (board.rows.length <= TIER_ROW_MIN || !board.rows.some((row) => row.id === rowId)) {
    return board;
  }
  return { ...board, rows: board.rows.filter((row) => row.id !== rowId) };
}

export function getContrastingTextColor(hex: string) {
  if (!HEX_COLOR_PATTERN.test(hex)) return "#ffffff";
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => {
    const value = Number.parseInt(part, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.45 ? "#111827" : "#ffffff";
}
