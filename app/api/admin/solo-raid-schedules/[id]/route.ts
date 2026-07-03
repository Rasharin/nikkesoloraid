import { NextResponse } from "next/server";
import { canDeleteSoloRaidSchedule, canEditSoloRaidScheduleWindow, validateSoloRaidScheduleWindow } from "@/lib/solo-raid-schedule";
import {
  getScheduleMasterContext,
  mapSoloRaidSchedule,
  processSoloRaidSchedules,
  SOLO_RAID_SCHEDULE_COLUMNS,
  type SoloRaidScheduleRow,
} from "../schedule-server";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const masterContext = await getScheduleMasterContext();
  if ("error" in masterContext) return NextResponse.json({ error: masterContext.error }, { status: masterContext.status });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const startsAt = text(body.startsAt);
  const endsAt = text(body.endsAt);
  const validation = validateSoloRaidScheduleWindow(startsAt, endsAt);
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 400 });

  const { data: current, error: currentError } = await masterContext.admin
    .from("solo_raid_schedules")
    .select(SOLO_RAID_SCHEDULE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("[solo-raid-schedules] load for update failed", currentError);
    return NextResponse.json({ error: "예약을 불러오지 못했습니다." }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  if (!canEditSoloRaidScheduleWindow((current as SoloRaidScheduleRow).status)) {
    return NextResponse.json({ error: "시작된 예약은 기간을 수정할 수 없습니다." }, { status: 400 });
  }

  const { data, error } = await masterContext.admin
    .from("solo_raid_schedules")
    .update({ starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "scheduled")
    .select(SOLO_RAID_SCHEDULE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[solo-raid-schedules] update failed", error);
    return NextResponse.json({ error: "예약 수정에 실패했습니다." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });

  const processResult = await processSoloRaidSchedules(masterContext.admin).catch((processError) => {
    console.error("[solo-raid-schedules] post-update process failed", processError);
    return null;
  });

  return NextResponse.json({ schedule: mapSoloRaidSchedule(data as SoloRaidScheduleRow), processed: processResult });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const masterContext = await getScheduleMasterContext();
  if ("error" in masterContext) return NextResponse.json({ error: masterContext.error }, { status: masterContext.status });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });

  const { data: current, error: currentError } = await masterContext.admin
    .from("solo_raid_schedules")
    .select(SOLO_RAID_SCHEDULE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("[solo-raid-schedules] load for delete failed", currentError);
    return NextResponse.json({ error: "예약을 불러오지 못했습니다." }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  if (!canDeleteSoloRaidSchedule((current as SoloRaidScheduleRow).status)) {
    return NextResponse.json({ error: "시작된 예약은 삭제할 수 없습니다." }, { status: 400 });
  }

  const { error } = await masterContext.admin
    .from("solo_raid_schedules")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "scheduled");

  if (error) {
    console.error("[solo-raid-schedules] delete failed", error);
    return NextResponse.json({ error: "예약 삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
