import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  HEARTBEAT_INTERVAL_MS,
  RECOMMENDATION_REFRESH_INTERVAL_MS,
  ADMIN_STATS_REFRESH_INTERVAL_MS,
  shouldLoadCommunityRecommendations,
  shouldClearCommunityRecommendationDecks,
  shouldRefreshVisibleData,
  shouldRefreshAdminStats,
} = jiti("../lib/request-scheduling.ts");

test("recommendations load only on the recommendation tab with a real raid key", () => {
  assert.equal(
    shouldLoadCommunityRecommendations({
      tab: "recommend",
      raidKey: "raid-1",
      authResolved: true,
      isVisible: true,
    }),
    true
  );
  assert.equal(
    shouldLoadCommunityRecommendations({
      tab: "home",
      raidKey: "raid-1",
      authResolved: true,
      isVisible: true,
    }),
    false
  );
  assert.equal(
    shouldLoadCommunityRecommendations({
      tab: "recommend",
      raidKey: "__season_off__",
      authResolved: true,
      isVisible: true,
    }),
    false
  );
});

test("visible refresh waits for the configured interval and skips hidden tabs", () => {
  assert.equal(
    shouldRefreshVisibleData({
      now: RECOMMENDATION_REFRESH_INTERVAL_MS,
      lastRefreshAt: 0,
      intervalMs: RECOMMENDATION_REFRESH_INTERVAL_MS,
      isVisible: true,
    }),
    true
  );
  assert.equal(
    shouldRefreshVisibleData({
      now: RECOMMENDATION_REFRESH_INTERVAL_MS - 1,
      lastRefreshAt: 0,
      intervalMs: RECOMMENDATION_REFRESH_INTERVAL_MS,
      isVisible: true,
    }),
    false
  );
  assert.equal(
    shouldRefreshVisibleData({
      now: HEARTBEAT_INTERVAL_MS,
      lastRefreshAt: 0,
      intervalMs: HEARTBEAT_INTERVAL_MS,
      isVisible: false,
    }),
    false
  );
});

test("disabled recommendation loading only clears non-empty deck state", () => {
  assert.equal(shouldClearCommunityRecommendationDecks([]), false);
  assert.equal(shouldClearCommunityRecommendationDecks([{ id: "deck-1" }]), true);
});

test("admin stats refresh only for mypage managers after throttle window", () => {
  assert.equal(
    shouldRefreshAdminStats({
      canManageBosses: true,
      tab: "mypage",
      now: ADMIN_STATS_REFRESH_INTERVAL_MS,
      lastRefreshAt: 0,
    }),
    true
  );
  assert.equal(
    shouldRefreshAdminStats({
      canManageBosses: true,
      tab: "home",
      now: ADMIN_STATS_REFRESH_INTERVAL_MS,
      lastRefreshAt: 0,
    }),
    false
  );
  assert.equal(
    shouldRefreshAdminStats({
      canManageBosses: true,
      tab: "mypage",
      now: ADMIN_STATS_REFRESH_INTERVAL_MS - 1,
      lastRefreshAt: 0,
    }),
    false
  );
});
