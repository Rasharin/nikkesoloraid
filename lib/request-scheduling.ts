export const RECOMMENDATION_REFRESH_INTERVAL_MS = 1000 * 60;
export const HEARTBEAT_INTERVAL_MS = 1000 * 60 * 5;
export const ADMIN_STATS_REFRESH_INTERVAL_MS = 1000 * 60;

type RecommendationLoadInput = {
  tab: string;
  raidKey: string | null | undefined;
  authResolved: boolean;
  isVisible: boolean;
};

type VisibleRefreshInput = {
  now: number;
  lastRefreshAt: number;
  intervalMs: number;
  isVisible: boolean;
};

type AdminStatsRefreshInput = {
  canManageBosses: boolean;
  tab: string;
  now: number;
  lastRefreshAt: number;
};

export function shouldLoadCommunityRecommendations({
  tab,
  raidKey,
  authResolved,
  isVisible,
}: RecommendationLoadInput): boolean {
  const normalizedRaidKey = raidKey?.trim() ?? "";
  return authResolved && isVisible && tab === "recommend" && normalizedRaidKey.length > 0 && normalizedRaidKey !== "__season_off__";
}

export function shouldRefreshVisibleData({ now, lastRefreshAt, intervalMs, isVisible }: VisibleRefreshInput): boolean {
  return isVisible && now - lastRefreshAt >= intervalMs;
}

export function shouldClearCommunityRecommendationDecks(decks: readonly unknown[]): boolean {
  return decks.length > 0;
}

export function shouldRefreshAdminStats({ canManageBosses, tab, now, lastRefreshAt }: AdminStatsRefreshInput): boolean {
  return canManageBosses && tab === "mypage" && now - lastRefreshAt >= ADMIN_STATS_REFRESH_INTERVAL_MS;
}
