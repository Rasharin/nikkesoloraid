import { NextResponse } from "next/server";
import { verifyContactPassword } from "@/lib/contact-password";
import {
  canOpenContactPost,
  createContactAdminClient,
  getContactServerEnv,
  getOptionalUserId,
  isMasterUser,
  mapContactPostDetail,
  type ContactPostRow,
} from "../../contact-server";

export const runtime = "nodejs";

const CONTACT_POST_COLUMNS =
  "id,title,content,visibility,status,password_hash,user_id,reply_content,replied_by,replied_at,created_at,updated_at";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const env = getContactServerEnv();
  if (!env) {
    return NextResponse.json(
      {
        error: "문의 게시판 서버 설정이 필요합니다.",
        setupRequired: true,
      },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "문의 글을 찾을 수 없습니다." }, { status: 404 });
  }

  let password = "";
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object") {
      password = normalizeText((body as Record<string, unknown>).password);
    }
  } catch {
    password = "";
  }

  const admin = createContactAdminClient(env);
  const userId = await getOptionalUserId(env);

  try {
    const master = await isMasterUser(admin, userId);
    const { data, error } = await admin
      .from("contact_posts")
      .select(CONTACT_POST_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "문의 글을 찾을 수 없습니다." }, { status: 404 });
    }

    const row = data as ContactPostRow;
    const canOpenBySession = canOpenContactPost(row, userId, master);
    const canOpenByPassword = row.visibility === "private" && (await verifyContactPassword(password, row.password_hash));
    if (!canOpenBySession && !canOpenByPassword) {
      return NextResponse.json({ error: "비공개 문의 비밀번호를 확인해 주세요." }, { status: 403 });
    }

    return NextResponse.json({ post: mapContactPostDetail(row, userId, master), isMaster: master });
  } catch (error) {
    console.error("[contact/posts/open] open failed", error);
    return NextResponse.json({ error: "문의 글을 열지 못했습니다." }, { status: 500 });
  }
}
