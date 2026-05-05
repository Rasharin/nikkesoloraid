export type ScoreDisplayMode = "number" | "eok";

const EOK_UNIT = 100_000_000;
const MIN_EOK_DISPLAY = 10_000_000;
const EOK_SUFFIX = "\uC5B5";
const SCORE_GROUP_SEPARATOR_PATTERN = /[,，、]/g;

export function parseScoreInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(SCORE_GROUP_SEPARATOR_PATTERN, "").replace(/\s+/g, "");
  if (!compact) return null;

  if (compact.includes(EOK_SUFFIX)) {
    const normalized = compact.replaceAll(EOK_SUFFIX, "");
    if (!normalized) return null;

    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) return null;

    return Math.round(value * EOK_UNIT);
  }

  const value = Number(compact);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function formatScore(score: number, mode: ScoreDisplayMode): string {
  if (!Number.isFinite(score)) return "0";

  if (mode === "eok" && Math.abs(score) >= MIN_EOK_DISPLAY) {
    return `${(score / EOK_UNIT).toLocaleString("ko-KR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${EOK_SUFFIX}`;
  }

  return Math.round(score).toLocaleString("en-US");
}

export function formatPlainScoreText(input: string): string {
  if (input.includes(EOK_SUFFIX)) return input;

  const withoutSpaces = input.replace(/\s+/g, "").replace(SCORE_GROUP_SEPARATOR_PATTERN, ",");
  if (/^[\d,]+(?:\.\d*)?$/.test(withoutSpaces) && withoutSpaces.endsWith(",")) {
    return withoutSpaces;
  }

  const compact = withoutSpaces.replaceAll(",", "");
  if (!/^\d+(?:\.\d*)?$/.test(compact)) return input;

  const [integerPart, fractionPart] = compact.split(".");
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionPart === undefined ? formattedInteger : `${formattedInteger}.${fractionPart}`;
}
