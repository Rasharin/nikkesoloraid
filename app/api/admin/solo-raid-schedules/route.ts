import { NextResponse } from "next/server";
import { validateSoloRaidScheduleWindow } from "@/lib/solo-raid-schedule";
import {
  buildUniqueRaidKey,
  getScheduleMasterContext,
  mapSoloRaidSchedule,
  processSoloRaidSchedules,
  SOLO_RAID_SCHEDULE_COLUMNS,
  type SoloRaidScheduleRow,
} from "./schedule-server";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const context = await getScheduleMasterContext();
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });

  const { data, error } = await context.admin
    .from("solo_raid_schedules")
    .select(SOLO_RAID_SCHEDULE_COLUMNS)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("[solo-raid-schedules] list failed", error);
    return NextResponse.json({ error: "예약 목록을 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ schedules: ((data ?? []) as SoloRaidScheduleRow[]).map(mapSoloRaidSchedule) });
}

export async function POST(request: Request) {
  const context = await getScheduleMasterContext();
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const raidLabel = text(body.raidLabel ?? body.title);
  const description = text(body.description);
  const imagePath = text(body.imagePath);
  const startsAt = text(body.startsAt);
  const endsAt = text(body.endsAt);

  if (!raidLabel) return NextResponse.json({ error: "보스명을 입력해주세요." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "보스 설명을 입력해주세요." }, { status: 400 });
  if (!imagePath) return NextResponse.json({ error: "보스 이미지를 선택해주세요." }, { status: 400 });

  const validation = validateSoloRaidScheduleWindow(startsAt, endsAt);
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 400 });

  const raidKey = await buildUniqueRaidKey(context.admin, raidLabel);
  if (!raidKey) return NextResponse.json({ error: "보스명 형식이 맞지 않습니다." }, { status: 400 });

  const nowIso = new Date().toISOString();
  const { data, error } = await context.admin
    .from("solo_raid_schedules")
    .insert({
      raid_key: raidKey,
      raid_label: raidLabel,
      description,
      image_path: imagePath,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "scheduled",
      created_by: context.userId,
      updated_at: nowIso,
    })
    .select(SOLO_RAID_SCHEDULE_COLUMNS)
    .single();

  if (error) {
    console.error("[solo-raid-schedules] create failed", error);
    return NextResponse.json({ error: "예약 저장에 실패했습니다." }, { status: 500 });
  }

  const processResult = await processSoloRaidSchedules(context.admin).catch((error) => {
    console.error("[solo-raid-schedules] post-create process failed", error);
    return null;
  });

  return NextResponse.json({
    schedule: mapSoloRaidSchedule(data as SoloRaidScheduleRow),
    processed: processResult,
  });
}
