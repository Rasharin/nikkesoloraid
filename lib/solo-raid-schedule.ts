export type SoloRaidScheduleStatus = "scheduled" | "active" | "completed" | "cancelled";

export type SoloRaidScheduleActionCandidate = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: SoloRaidScheduleStatus;
  createdAt: string;
};

export function parseKstDateTimeInput(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const utcMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 9, Number(minute), 0, 0);
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatIsoToKstDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 16);
}

export function validateSoloRaidScheduleWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): { ok: true } | { ok: false; reason: string } {
  const startMs = startsAt ? Date.parse(startsAt) : NaN;
  const endMs = endsAt ? Date.parse(endsAt) : NaN;

  if (!Number.isFinite(startMs)) return { ok: false, reason: "시작 시각을 확인해주세요." };
  if (!Number.isFinite(endMs)) return { ok: false, reason: "종료 시각을 확인해주세요." };
  if (endMs <= startMs) return { ok: false, reason: "종료 시각은 시작 시각보다 늦어야 합니다." };
  return { ok: true };
}

export function canEditSoloRaidScheduleWindow(status: SoloRaidScheduleStatus) {
  return status === "scheduled";
}

export function canDeleteSoloRaidSchedule(status: SoloRaidScheduleStatus) {
  return status === "scheduled";
}

export function buildImmediateSoloRaidScheduleWindow(
  nowIso: string,
  endsAt: string | null | undefined
): { ok: true; window: { startsAt: string; endsAt: string } | null } | { ok: false; reason: string } {
  if (!endsAt) return { ok: true, window: null };

  const nowMs = Date.parse(nowIso);
  const endMs = Date.parse(endsAt);
  if (!Number.isFinite(nowMs)) return { ok: false, reason: "현재 시각을 확인해주세요." };
  if (!Number.isFinite(endMs)) return { ok: false, reason: "종료 시각을 확인해주세요." };
  if (endMs <= nowMs) return { ok: false, reason: "종료 시각은 현재 시각보다 늦어야 합니다." };

  return {
    ok: true,
    window: {
      startsAt: new Date(nowMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
    },
  };
}

export function buildActiveSoloRaidEndScheduleWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): { ok: true; window: { startsAt: string; endsAt: string } } | { ok: false; reason: string } {
  const validation = validateSoloRaidScheduleWindow(startsAt, endsAt);
  if (!validation.ok) return validation;

  return {
    ok: true,
    window: {
      startsAt: new Date(Date.parse(startsAt as string)).toISOString(),
      endsAt: new Date(Date.parse(endsAt as string)).toISOString(),
    },
  };
}

function compareScheduleStart(a: SoloRaidScheduleActionCandidate, b: SoloRaidScheduleActionCandidate) {
  const startDiff = Date.parse(a.startsAt) - Date.parse(b.startsAt);
  if (startDiff !== 0) return startDiff;
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export function selectDueSoloRaidScheduleActions(
  schedules: readonly SoloRaidScheduleActionCandidate[],
  nowIso: string
): { start: SoloRaidScheduleActionCandidate | null; ends: SoloRaidScheduleActionCandidate[] } {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) return { start: null, ends: [] };

  const start =
    schedules
      .filter((schedule) => schedule.status === "scheduled" && Date.parse(schedule.startsAt) <= nowMs)
      .sort(compareScheduleStart)[0] ?? null;

  const ends = schedules
    .filter((schedule) => schedule.status === "active" && Date.parse(schedule.endsAt) <= nowMs)
    .sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt));

  return { start, ends };
}
