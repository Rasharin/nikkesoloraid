import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { createGlobalRefreshVersion, shouldApplyGlobalRefreshVersion } = jiti("../lib/global-refresh.ts");

test("createGlobalRefreshVersion returns an ISO timestamp", () => {
  assert.equal(createGlobalRefreshVersion(new Date("2026-07-03T09:30:00.000Z")), "2026-07-03T09:30:00.000Z");
});

test("shouldApplyGlobalRefreshVersion only refreshes when the remote version changes", () => {
  assert.equal(shouldApplyGlobalRefreshVersion("2026-07-03T09:30:00.000Z", ""), true);
  assert.equal(
    shouldApplyGlobalRefreshVersion("2026-07-03T09:30:00.000Z", "2026-07-03T09:30:00.000Z"),
    false
  );
  assert.equal(shouldApplyGlobalRefreshVersion("", "2026-07-03T09:30:00.000Z"), false);
});
