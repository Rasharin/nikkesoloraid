import assert from "node:assert/strict";
import test from "node:test";

import { archiveSessionReducer, createArchiveSessionState } from "../lib/archive-session.ts";

const ownerAArchive = {
  generatedAt: "2026-11-11T00:00:00.000Z",
  closureDate: "2027-11-11",
  soloDecks: [{
    kind: "solo" as const,
    id: "deck-a",
    raidKey: "solo-a",
    raidLabel: "solo-a",
    deckKey: "A|B|C|D|E",
    chars: ["A", "B", "C", "D", "E"],
    score: 1,
    note: "owner A",
    createdAt: "2026-01-01T00:00:00.000Z",
  }],
  unionDecks: [],
};

test("account transition clears the previous archive atomically", () => {
  let state = createArchiveSessionState();
  state = archiveSessionReducer(state, { type: "owner-changed", ownerId: "owner-a" });
  const ownerAGeneration = state.generation;
  state = archiveSessionReducer(state, { type: "load-succeeded", ownerId: "owner-a", generation: ownerAGeneration, archive: ownerAArchive });
  assert.equal(state.archiveOwnerId, "owner-a");
  assert.equal(state.archive.soloDecks.length, 1);

  state = archiveSessionReducer(state, { type: "owner-changed", ownerId: "owner-b" });
  assert.equal(state.ownerId, "owner-b");
  assert.equal(state.archiveOwnerId, null);
  assert.equal(state.archive.soloDecks.length, 0);
});

test("a deferred response from the previous account is ignored", () => {
  let state = createArchiveSessionState();
  state = archiveSessionReducer(state, { type: "owner-changed", ownerId: "owner-a" });
  const staleGeneration = state.generation;
  state = archiveSessionReducer(state, { type: "owner-changed", ownerId: "owner-b" });
  const switchedState = state;

  state = archiveSessionReducer(state, { type: "load-succeeded", ownerId: "owner-a", generation: staleGeneration, archive: ownerAArchive });
  assert.deepEqual(state, switchedState);
});

test("same-owner token refresh preserves the loaded archive", () => {
  let state = createArchiveSessionState();
  state = archiveSessionReducer(state, { type: "owner-changed", ownerId: "owner-a" });
  state = archiveSessionReducer(state, { type: "load-succeeded", ownerId: "owner-a", generation: state.generation, archive: ownerAArchive });

  const refreshed = archiveSessionReducer(state, { type: "owner-changed", ownerId: "owner-a" });
  assert.deepEqual(refreshed, state);
});
