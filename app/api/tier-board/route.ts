import { NextResponse } from "next/server";
import {
  canEditTierBoard,
  createTierBoardAdminClient,
  getTierBoardServerEnv,
  getTierBoardUserId,
  loadTierBoard,
  saveTierBoard,
  type SaveTierBoardInput,
} from "./tier-board-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getTierBoardServerEnv();
  if (!env) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });
  }

  try {
    const admin = createTierBoardAdminClient(env);
    const userId = await getTierBoardUserId(env);
    const [board, canEdit] = await Promise.all([
      loadTierBoard(admin),
      canEditTierBoard(admin, userId),
    ]);
    return NextResponse.json(
      { board, canEdit },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("[tier-board] load failed", error);
    return NextResponse.json({ error: "티어 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const env = getTierBoardServerEnv();
  if (!env) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });
  }

  try {
    const admin = createTierBoardAdminClient(env);
    const userId = await getTierBoardUserId(env);
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const canEdit = await canEditTierBoard(admin, userId);
    if (!canEdit) return NextResponse.json({ error: "편집 권한이 없습니다." }, { status: 403 });

    const input = (await request.json().catch(() => ({}))) as SaveTierBoardInput;
    const result = await saveTierBoard(admin, userId, input);
    if (result.kind === "conflict") {
      return NextResponse.json(
        { error: "다른 편집자가 먼저 수정했습니다.", board: result.board },
        { status: 409 }
      );
    }
    return NextResponse.json({ board: result.board });
  } catch (error) {
    console.error("[tier-board] save failed", error);
    return NextResponse.json({ error: "티어 정보를 저장하지 못했습니다." }, { status: 500 });
  }
}
