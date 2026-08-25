import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { buildBest5ChartPoints, type BlaBlaLinkServerKey } from "@/lib/blablalink";
import { BlaBlaLinkProfileUrlError, parseBlaBlaLinkProfileUrl } from "@/lib/blablalink/profile-url";
import { isBlaBlaLinkServerKey } from "@/lib/blablalink/constants";
import { BlaBlaLinkError, fetchBlaBlaLinkProfile, getBlaBlaLinkServerSessionCookie, hashGameOpenId } from "@/lib/server/blablalink-api";

export const runtime = "nodejs";

async function getClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const store = await cookies();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return { client, admin };
}

export async function GET() {
  const clients = await getClients();
  if (!clients) return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 500 });
  const { data: authData } = await clients.client.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인 세션이 만료되었습니다." }, { status: 401 });
  const [{ data: integration }, { data: characters }] = await Promise.all([
    clients.client.from("blablalink_integrations").select("server_key,synchro_level,synced_at").maybeSingle(),
    clients.client.from("blablalink_user_characters").select("nikke_id"),
  ]);
  let chartPoints: Array<{ synchroLevel: number; total: number }> = [];
  if (clients.admin) {
    const { data: rows } = await clients.admin.from("blablalink_best5_snapshots").select("synchro_level,total");
    chartPoints = buildBest5ChartPoints((rows ?? []).map((row) => ({ synchroLevel: Number(row.synchro_level), total: Number(row.total) })));
  }
  return NextResponse.json({
    integration: integration ? {
      connected: true,
      server: integration.server_key,
      synchroLevel: integration.synchro_level,
      syncedAt: integration.synced_at,
      ownedNikkeIds: (characters ?? []).map((row) => row.nikke_id),
    } : null,
    chartPoints,
  });
}

export async function POST(request: Request) {
  const clients = await getClients();
  if (!clients) return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 500 });
  const { data: authData } = await clients.client.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인 세션이 만료되었습니다." }, { status: 401 });
  const body = await request.json().catch(() => null) as { server?: BlaBlaLinkServerKey; profileUrl?: string } | null;
  if (!isBlaBlaLinkServerKey(body?.server) || !body?.profileUrl) {
    return NextResponse.json({ error: "올바른 블라블라링크 프로필 링크를 입력해주세요." }, { status: 400 });
  }
  try {
    const { openId } = parseBlaBlaLinkProfileUrl(body.profileUrl);
    const sessionCookie = getBlaBlaLinkServerSessionCookie();
    const { data: nikkes, error: nikkesError } = await clients.client.from("nikkes").select("id,name,resource_id");
    if (nikkesError) throw nikkesError;
    const profile = await fetchBlaBlaLinkProfile({
      server: body.server,
      openId,
      sessionCookie,
      nikkes: nikkes ?? [],
    });
    const syncedAt = new Date().toISOString();
    const { error: integrationError } = await clients.client.from("blablalink_integrations").upsert({
      user_id: userId,
      server_key: body.server,
      game_openid_hash: hashGameOpenId(openId),
      synchro_level: profile.synchroLevel,
      synced_at: syncedAt,
    });
    if (integrationError) throw integrationError;
    const rows = profile.characters.map((character) => ({
      user_id: userId,
      nikke_id: character.nikkeId,
      name_code: character.nameCode,
      resource_id: character.resourceId,
      level: character.level,
      breakthrough: character.breakthrough,
      core: character.core,
      details: character.details,
      synced_at: syncedAt,
    }));
    if (rows.length) {
      const { error } = await clients.client.from("blablalink_user_characters").upsert(rows, { onConflict: "user_id,nikke_id" });
      if (error) throw error;
    }
    const { data: existing } = await clients.client.from("blablalink_user_characters").select("nikke_id");
    const nextIds = new Set(rows.map((row) => row.nikke_id));
    const staleIds = (existing ?? []).map((row) => row.nikke_id).filter((id) => !nextIds.has(id));
    if (staleIds.length) await clients.client.from("blablalink_user_characters").delete().in("nikke_id", staleIds);
    const { data: recommendations } = await clients.client.from("solo_raid_recommendations").select("raid_key,total,decks");
    const snapshots = (recommendations ?? []).filter((row) => Number(row.total) > 0).map((row) => ({
      user_id: userId, raid_key: row.raid_key, synchro_level: profile.synchroLevel,
      total: row.total, decks: row.decks, synced_at: syncedAt,
    }));
    if (snapshots.length) await clients.client.from("blablalink_best5_snapshots").upsert(snapshots, { onConflict: "user_id,raid_key,synchro_level" });
    console.info("[blablalink] sync complete", { userId, mapped: rows.length, unmappedNameCodes: profile.unmappedNameCodes });
    return NextResponse.json({ integration: { connected: true, server: body.server, synchroLevel: profile.synchroLevel, syncedAt, ownedNikkeIds: rows.map((row) => row.nikke_id) }, unmappedCount: profile.unmappedNameCodes.length });
  } catch (error) {
    if (error instanceof BlaBlaLinkProfileUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof BlaBlaLinkError) {
      const status = error.code === "AUTH" ? 401 : error.code === "ACCOUNT" ? 404 : error.code === "CONFIG" ? 503 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("[blablalink] sync failed", error);
    return NextResponse.json({ error: "BlaBlaLink 동기화 중 오류가 발생했습니다." }, { status: 500 });
  }
}
