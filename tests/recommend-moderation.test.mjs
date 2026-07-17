import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const jiti = createJiti(import.meta.url);
const { isDeckHiddenAfterModeration } = jiti("../lib/recommend.ts");

test("a deck remains hidden while its updated timestamp matches the moderated version", () => {
  assert.equal(
    isDeckHiddenAfterModeration("2026-07-17T10:00:00.000Z", "2026-07-17T10:00:00.000Z"),
    true
  );
});

test("a user score edit after moderation makes the deck visible again", () => {
  assert.equal(
    isDeckHiddenAfterModeration("2026-07-17T10:01:00.000Z", "2026-07-17T10:00:00.000Z"),
    false
  );
});

test("invalid timestamps fail closed and keep the moderated deck hidden", () => {
  assert.equal(isDeckHiddenAfterModeration(null, "invalid"), true);
});
