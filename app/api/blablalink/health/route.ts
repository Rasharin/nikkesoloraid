import { NextResponse } from "next/server";
import { getBlaBlaLinkProxyHealth, getBlaBlaLinkSessionHealth, getBlaBlaLinkProxyUrl } from "@/lib/server/blablalink-api";

export const runtime = "nodejs";

export async function GET() {
  const result = getBlaBlaLinkProxyUrl()
    ? await getBlaBlaLinkProxyHealth()
    : await getBlaBlaLinkSessionHealth();
  if (!result) return NextResponse.json({ error: "BlaBlaLink 연결 설정이 없습니다." }, { status: 503 });
  const healthy = (result as { upstream?: { code?: number | null } }).upstream?.code === 0;
  return NextResponse.json(result, { status: healthy ? 200 : 503 });
}
