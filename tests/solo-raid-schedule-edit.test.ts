import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSoloRaidScheduleLabel,
  resolveSoloRaidScheduleDraftText,
  validateSoloRaidScheduleEdit,
} from "../lib/solo-raid-schedule.ts";

test("formatSoloRaidScheduleLabel shortens names longer than 15 characters", () => {
  assert.equal(formatSoloRaidScheduleLabel("123456789012345"), "123456789012345");
  assert.equal(formatSoloRaidScheduleLabel("1234567890123456"), "123456789012345...");
});

test("validateSoloRaidScheduleEdit trims and returns the complete editable schedule", () => {
  assert.deepEqual(
    validateSoloRaidScheduleEdit({
      title: "  긴 보스 이름  ",
      description: "  예약 설명  ",
      startsAt: "2026-07-03T09:30:00.000Z",
      endsAt: "2026-07-10T09:30:00.000Z",
    }),
    {
      ok: true,
      value: {
        title: "긴 보스 이름",
        description: "예약 설명",
        startsAt: "2026-07-03T09:30:00.000Z",
        endsAt: "2026-07-10T09:30:00.000Z",
      },
    }
  );
});

test("validateSoloRaidScheduleEdit rejects an empty boss name", () => {
  const result = validateSoloRaidScheduleEdit({
    title: "   ",
    description: "설명",
    startsAt: "2026-07-03T09:30:00.000Z",
    endsAt: "2026-07-10T09:30:00.000Z",
  });

  assert.equal(result.ok, false);
});

test("resolveSoloRaidScheduleDraftText keeps the latest IME input value", () => {
  assert.equal(resolveSoloRaidScheduleDraftText("사치스러운 거", "사치스러운 거미"), "사치스러운 거미");
  assert.equal(resolveSoloRaidScheduleDraftText("사치스러운 거미", null), "사치스러운 거미");
});
