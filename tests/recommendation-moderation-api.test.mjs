import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  parseModerationAction,
  parsePositiveSafeScore,
  formatModeratedDeckSummary,
  RECOMMENDATION_MODERATION_NOTICE,
} = jiti("../lib/recommendation-moderation.ts");

test("parseModerationAction accepts only supported master actions", () => {
  assert.equal(parseModerationAction("hide"), "hide");
  assert.equal(parseModerationAction("update_score"), "update_score");
  assert.equal(parseModerationAction("delete"), "delete");
  assert.equal(parseModerationAction("block_user"), "block_user");
  assert.equal(parseModerationAction("anything_else"), null);
});

test("parsePositiveSafeScore rejects invalid and unsafe scores", () => {
  assert.equal(parsePositiveSafeScore("123456789"), 123456789);
  assert.equal(parsePositiveSafeScore(0), null);
  assert.equal(parsePositiveSafeScore("1.5"), null);
  assert.equal(parsePositiveSafeScore(Number.MAX_SAFE_INTEGER + 1), null);
});

test("moderation notice uses the approved copy", () => {
  assert.equal(
    RECOMMENDATION_MODERATION_NOTICE,
    "저장된 덱이 현재 서버에 적용되지 않도록 조치 되었습니다.\n수정 후 다시 적용이 가능합니다."
  );
});

test("formatModeratedDeckSummary shows the hidden deck characters and score in eok", () => {
  assert.equal(
    formatModeratedDeckSummary(["라피", "나유타", "헬름", "레이븐", "이브"], 30_000_000_000),
    "라피/나유타/헬름/레이븐/이브   300억"
  );
});
