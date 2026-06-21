import { NextResponse } from "next/server";
import { isContactPostStatus, isContactPostVisibility } from "@/lib/contact-board";
import {
  createContactAdminClient,
  getContactServerEnv,
  getOptionalUserId,
  isMasterUser,
  mapContactPostDetail,
  type ContactPostRow,
} from "../contact-server";

export const runtime = "nodejs";

const CONTACT_POST_COLUMNS =
  "id,title,content,visibility,status,password_hash,user_id,reply_content,replied_by,replied_at,created_at,updated_at";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function requireMaster() {
  const env = getContactServerEnv();
  if (!env) {
    return {
      error: NextResponse.json(
        {
          error: "문의 게시판 서버 설정이 필요합니다.",
          setupRequired: true,
        },
        { status: 503 }
      ),
    };
  }

  const admin = createContactAdminClient(env);
  const userId = await getOptionalUserId(env);
  try {
    const master = await isMasterUser(admin, userId);
    if (!master || !userId) {
      return { error: NextResponse.json({ error: "마스터 계정만 처리할 수 있습니다." }, { status: 403 }) };
    }
    return { env, admin, userId };
  } catch (error) {
    console.error("[contact/posts] master check failed", error);
    return { error: NextResponse.json({ error: "권한 확인에 실패했습니다." }, { status: 500 }) };
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const masterContext = await requireMaster();
  if ("error" in masterContext) return masterContext.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "문의 글을 찾을 수 없습니다." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const updatePayload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if ("replyContent" in payload) {
    const replyContent = normalizeText(payload.replyContent);
    updatePayload.reply_content = replyContent || null;
    updatePayload.replied_by = replyContent ? masterContext.userId : null;
    updatePayload.replied_at = replyContent ? new Date().toISOString() : null;
  }
  if (isContactPostVisibility(payload.visibility)) {
    updatePayload.visibility = payload.visibility;
  }
  if (isContactPostStatus(payload.status)) {
    updatePayload.status = payload.status;
  }

  if (Object.keys(updatePayload).length === 1) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  try {
    const { data, error } = await masterContext.admin
      .from("contact_posts")
      .update(updatePayload)
      .eq("id", id)
      .select(CONTACT_POST_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "문의 글을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ post: mapContactPostDetail(data as ContactPostRow, masterContext.userId, true) });
  } catch (error) {
    console.error("[contact/posts] update failed", error);
    return NextResponse.json({ error: "문의 글 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const masterContext = await requireMaster();
  if ("error" in masterContext) return masterContext.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "문의 글을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const { error } = await masterContext.admin.from("contact_posts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact/posts] delete failed", error);
    return NextResponse.json({ error: "문의 글 삭제에 실패했습니다." }, { status: 500 });
  }
}
