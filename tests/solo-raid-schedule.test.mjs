import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  canDeleteSoloRaidSchedule,
  canEditSoloRaidScheduleWindow,
  buildActiveSoloRaidEndScheduleWindow,
  buildImmediateSoloRaidScheduleWindow,
  formatIsoToKstDateTimeInput,
  parseKstDateTimeInput,
  selectDueSoloRaidScheduleActions,
  validateSoloRaidScheduleWindow,
} = jiti("../lib/solo-raid-schedule.ts");

test("parseKstDateTimeInput converts Korean local datetime to UTC ISO", () => {
  assert.equal(parseKstDateTimeInput("2026-07-03T18:30"), "2026-07-03T09:30:00.000Z");
});

test("formatIsoToKstDateTimeInput formats UTC ISO for datetime-local inputs", () => {
  assert.equal(formatIsoToKstDateTimeInput("2026-07-03T09:30:00.000Z"), "2026-07-03T18:30");
});

test("validateSoloRaidScheduleWindow rejects end times that are not after start times", () => {
  assert.deepEqual(validateSoloRaidScheduleWindow("2026-07-03T09:30:00.000Z", "2026-07-03T09:30:00.000Z"), {
    ok: false,
    reason: "종료 시각은 시작 시각보다 늦어야 합니다.",
  });
});

test("validateSoloRaidScheduleWindow accepts a valid schedule window", () => {
  assert.deepEqual(validateSoloRaidScheduleWindow("2026-07-03T09:30:00.000Z", "2026-07-10T09:30:00.000Z"), {
    ok: true,
  });
});

test("scheduled schedules can be edited and deleted, active schedules cannot", () => {
  assert.equal(canEditSoloRaidScheduleWindow("scheduled"), true);
  assert.equal(canDeleteSoloRaidSchedule("scheduled"), true);
  assert.equal(canEditSoloRaidScheduleWindow("active"), false);
  assert.equal(canDeleteSoloRaidSchedule("active"), false);
});

test("buildImmediateSoloRaidScheduleWindow returns no schedule when no end is provided", () => {
  assert.deepEqual(buildImmediateSoloRaidScheduleWindow("2026-07-03T09:30:00.000Z", null), { ok: true, window: null });
});

test("buildImmediateSoloRaidScheduleWindow creates an active window from now to end", () => {
  assert.deepEqual(
    buildImmediateSoloRaidScheduleWindow("2026-07-03T09:30:00.000Z", "2026-07-10T09:30:00.000Z"),
    {
      ok: true,
      window: {
        startsAt: "2026-07-03T09:30:00.000Z",
        endsAt: "2026-07-10T09:30:00.000Z",
      },
    }
  );
});

test("buildImmediateSoloRaidScheduleWindow rejects end times before now", () => {
  assert.deepEqual(buildImmediateSoloRaidScheduleWindow("2026-07-03T09:30:00.000Z", "2026-07-03T09:29:00.000Z"), {
    ok: false,
    reason: "종료 시각은 현재 시각보다 늦어야 합니다.",
  });
});

test("buildActiveSoloRaidEndScheduleWindow updates an active raid end time", () => {
  assert.deepEqual(
    buildActiveSoloRaidEndScheduleWindow("2026-07-03T09:30:00.000Z", "2026-07-10T09:30:00.000Z"),
    {
      ok: true,
      window: {
        startsAt: "2026-07-03T09:30:00.000Z",
        endsAt: "2026-07-10T09:30:00.000Z",
      },
    }
  );
});

test("buildActiveSoloRaidEndScheduleWindow rejects end times before the active raid start", () => {
  const result = buildActiveSoloRaidEndScheduleWindow("2026-07-03T09:30:00.000Z", "2026-07-03T09:29:00.000Z");

  assert.equal(result.ok, false);
});

test("selectDueSoloRaidScheduleActions selects one due start and all due ends", () => {
  const nowIso = "2026-07-03T09:30:00.000Z";
  const result = selectDueSoloRaidScheduleActions(
    [
      {
        id: "later",
        startsAt: "2026-07-03T09:29:00.000Z",
        endsAt: "2026-07-10T09:30:00.000Z",
        status: "scheduled",
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "first",
        startsAt: "2026-07-03T09:00:00.000Z",
        endsAt: "2026-07-10T09:30:00.000Z",
        status: "scheduled",
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "ending",
        startsAt: "2026-06-26T09:00:00.000Z",
        endsAt: "2026-07-03T09:00:00.000Z",
        status: "active",
        createdAt: "2026-06-20T00:00:00.000Z",
      },
    ],
    nowIso
  );

  assert.equal(result.start?.id, "first");
  assert.deepEqual(result.ends.map((item) => item.id), ["ending"]);
});
