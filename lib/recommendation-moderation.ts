export const RECOMMENDATION_MODERATION_NOTICE =
  "저장된 덱이 현재 서버에 추천 조합에 적용되지 않도록 조치 되었습니다.\n수정 후 다시 적용이 가능합니다.";

export type ModerationAction = "hide" | "update_score" | "delete" | "block_user";

export function parseModerationAction(value: unknown): ModerationAction | null {
  return value === "hide" || value === "update_score" || value === "delete" || value === "block_user"
    ? value
    : null;
}

export function parsePositiveSafeScore(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const normalized = typeof value === "string" ? value.trim() : value;
  if (typeof normalized === "string" && !/^\d+$/.test(normalized)) return null;
  const score = Number(normalized);
  return Number.isSafeInteger(score) && score > 0 ? score : null;
}

