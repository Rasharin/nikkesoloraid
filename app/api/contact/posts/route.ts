import { NextResponse } from "next/server";
import { hashContactPassword } from "@/lib/contact-password";
import { isContactPostVisibility } from "@/lib/contact-board";
import {
  createContactAdminClient,
  getContactServerEnv,
  getOptionalUserId,
  isMasterUser,
  mapContactPostSummary,
  type ContactPostRow,
} from "./contact-server";

export const runtime = "nodejs";

const CONTACT_POST_COLUMNS =
  "id,title,content,visibility,status,password_hash,user_id,reply_content,replied_by,replied_at,created_at,updated_at";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isMissingContactPostsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "42P01" || code === "PGRST205" || message.includes("contact_posts");
}

export async function GET() {
  const env = getContactServerEnv();
  if (!env) {
    return NextResponse.json(
      {
        error: "문의 게시판 서버 설정이 필요합니다.",
        setupRequired: true,
        posts: [],
        isMaster: false,
      },
      { status: 503 }
    );
  }

  const admin = createContactAdminClient(env);
  const userId = await getOptionalUserId(env);

  try {
    const master = await isMasterUser(admin, userId);
    const { data, error } = await admin
      .from("contact_posts")
      .select(CONTACT_POST_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const posts = ((data ?? []) as ContactPostRow[]).map((row) => mapContactPostSummary(row, userId, master));
    return NextResponse.json({ posts, isMaster: master });
  } catch (error) {
    if (isMissingContactPostsError(error)) {
      return NextResponse.json({
        posts: [],
        isMaster: false,
        setupRequired: true,
      });
    }

    console.warn("[contact/posts] list failed", error);
    return NextResponse.json({
      posts: [],
      isMaster: false,
      setupRequired: true,
    });
  }
}

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = normalizeText(payload.title);
  const content = normalizeText(payload.content);
  const visibility = isContactPostVisibility(payload.visibility) ? payload.visibility : "private";
  const password = normalizeText(payload.password);

  if (!title) {
    return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "문의 내용을 입력해 주세요." }, { status: 400 });
  }
  if (visibility === "private" && !password) {
    return NextResponse.json({ error: "비공개 문의는 조회 비밀번호가 필요합니다." }, { status: 400 });
  }

  const admin = createContactAdminClient(env);
  const userId = await getOptionalUserId(env);

  try {
    const passwordHash = visibility === "private" ? await hashContactPassword(password) : null;
    const master = await isMasterUser(admin, userId);
    const { data, error } = await admin
      .from("contact_posts")
      .insert({
        title,
        content,
        visibility,
        status: "received",
        password_hash: passwordHash,
        user_id: userId,
      })
      .select(CONTACT_POST_COLUMNS)
      .single();

    if (error) throw error;

    return NextResponse.json({ post: mapContactPostSummary(data as ContactPostRow, userId, master) });
  } catch (error) {
    console.error("[contact/posts] create failed", error);
    return NextResponse.json({ error: "문의 등록에 실패했습니다." }, { status: 500 });
  }
}
