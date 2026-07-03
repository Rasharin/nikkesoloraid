import { NextResponse } from "next/server";
import { createScheduleAdminClient, getScheduleMasterContext, getScheduleServerEnv, processSoloRaidSchedules } from "../schedule-server";

export const runtime = "nodejs";

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const env = getScheduleServerEnv();
  if (!env) return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });

  try {
    const admin = createScheduleAdminClient(env);
    const result = await processSoloRaidSchedules(admin);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[solo-raid-schedules/process] cron failed", error);
    return NextResponse.json({ error: "예약 처리에 실패했습니다." }, { status: 500 });
  }
}

export async function POST() {
  const context = await getScheduleMasterContext();
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });

  try {
    const result = await processSoloRaidSchedules(context.admin);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[solo-raid-schedules/process] manual failed", error);
    return NextResponse.json({ error: "예약 처리에 실패했습니다." }, { status: 500 });
  }
}
