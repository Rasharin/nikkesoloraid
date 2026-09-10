import { NextResponse } from "next/server";
import { getBlaBlaLinkSessionHealth } from "@/lib/server/blablalink-api";

export const runtime = "nodejs";

export async function GET() {
  const result = await getBlaBlaLinkSessionHealth();
  const healthy = result.upstream?.code === 0;
  return NextResponse.json(result, { status: healthy ? 200 : 503 });
}
