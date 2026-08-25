import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findDuplicateResourceIds,
  getBlaBlaLinkMappingStatus,
  planAutomaticBlaBlaLinkMappings,
  type BlaBlaLinkMappingSource,
} from "@/lib/blablalink-mapping";
import { fetchBlaBlaLinkMappingCandidates } from "@/lib/server/blablalink-api";

export const runtime = "nodejs";

async function getMasterClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { client: null, error: "Supabase 환경변수가 설정되지 않았습니다.", status: 500 } as const;
  const store = await cookies();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
  const { data: authData } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { client: null, error: "로그인 세션이 만료되었습니다.", status: 401 } as const;
  const { data: config } = await client.from("app_config").select("master_user_id").limit(1).maybeSingle();
  if (config?.master_user_id !== userId) return { client: null, error: "관리자 권한이 필요합니다.", status: 403 } as const;
  return { client, error: null, status: 200 } as const;
}

async function loadRows(client: SupabaseClient) {
  const { data, error } = await client.from("nikkes")
    .select("id,name,image_path,resource_id,name_code,mapping_source,mapping_verified")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    resource_id: row.resource_id === null ? null : Number(row.resource_id),
    name_code: row.name_code === null ? null : Number(row.name_code),
    mapping_source: row.mapping_source as BlaBlaLinkMappingSource | null,
    mapping_verified: Boolean(row.mapping_verified),
  }));
}

export async function GET() {
  const auth = await getMasterClient();
  if (!auth.client) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const [rows, candidates] = await Promise.all([loadRows(auth.client), fetchBlaBlaLinkMappingCandidates()]);
    const duplicates = findDuplicateResourceIds(rows.map((row) => ({ resourceId: row.resource_id })));
    const usedIds = new Set(rows.flatMap((row) => row.resource_id === null ? [] : [row.resource_id]));
    return NextResponse.json({
      mappings: rows.map((row) => ({
        ...row,
        status: getBlaBlaLinkMappingStatus({
          resourceId: row.resource_id,
          mappingSource: row.mapping_source,
          mappingVerified: row.mapping_verified,
        }, duplicates),
      })),
      candidates,
      unassignedCandidates: candidates.filter((candidate) => !usedIds.has(candidate.resourceId)),
    });
  } catch (error) {
    console.error("[blablalink mappings] load failed", error);
    return NextResponse.json({ error: "BlaBlaLink 매핑 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}

type MutationBody =
  | { action: "manual"; nikkeId: string; resourceId: number }
  | { action: "verify"; nikkeId: string }
  | { action: "verify-all" }
  | { action: "reset"; nikkeId: string }
  | { action: "auto" };

export async function POST(request: Request) {
  const auth = await getMasterClient();
  if (!auth.client) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => null) as MutationBody | null;
  if (!body) return NextResponse.json({ error: "요청을 확인할 수 없습니다." }, { status: 400 });
  try {
    if (body.action === "verify-all") {
      const { data, error } = await auth.client.from("nikkes")
        .update({ mapping_verified: true })
        .eq("mapping_verified", false)
        .not("resource_id", "is", null)
        .select("id");
      if (error) throw error;
      return NextResponse.json({ ok: true, verified: data?.length ?? 0 });
    } else if (body.action === "verify") {
      const { error } = await auth.client.from("nikkes").update({ mapping_verified: true }).eq("id", body.nikkeId);
      if (error) throw error;
    } else if (body.action === "reset") {
      const { error } = await auth.client.from("nikkes").update({
        resource_id: null, name_code: null, mapping_source: "auto", mapping_verified: false,
      }).eq("id", body.nikkeId);
      if (error) throw error;
    } else if (body.action === "manual") {
      if (!Number.isInteger(body.resourceId)) return NextResponse.json({ error: "resource_id가 올바르지 않습니다." }, { status: 400 });
      const [rows, candidates] = await Promise.all([loadRows(auth.client), fetchBlaBlaLinkMappingCandidates()]);
      const occupied = rows.find((row) => row.resource_id === body.resourceId && row.id !== body.nikkeId);
      if (occupied) return NextResponse.json({ error: `이미 ${occupied.name}에 연결된 resource_id입니다.` }, { status: 409 });
      const candidate = candidates.find((item) => item.resourceId === body.resourceId);
      if (!candidate) return NextResponse.json({ error: "선택한 BlaBlaLink 캐릭터를 찾을 수 없습니다." }, { status: 400 });
      const { error } = await auth.client.from("nikkes").update({
        resource_id: candidate.resourceId,
        name_code: candidate.nameCode,
        mapping_source: "manual",
        mapping_verified: true,
      }).eq("id", body.nikkeId);
      if (error) throw error;
    } else if (body.action === "auto") {
      const [rows, candidates] = await Promise.all([loadRows(auth.client), fetchBlaBlaLinkMappingCandidates()]);
      const plan = planAutomaticBlaBlaLinkMappings(rows.map((row) => ({
        id: row.id, name: row.name, resourceId: row.resource_id, nameCode: row.name_code,
        mappingSource: row.mapping_source, mappingVerified: row.mapping_verified,
      })), candidates);
      const claimed = new Set(rows.flatMap((row) => row.resource_id === null ? [] : [row.resource_id]));
      let updated = 0;
      for (const item of plan.updates) {
        const current = rows.find((row) => row.id === item.id);
        if (claimed.has(item.resourceId) && current?.resource_id !== item.resourceId) continue;
        const { error } = await auth.client.from("nikkes").update({
          resource_id: item.resourceId, name_code: item.nameCode,
          mapping_source: item.mappingSource, mapping_verified: item.mappingVerified,
        }).eq("id", item.id).or("mapping_source.is.null,mapping_source.neq.manual").eq("mapping_verified", false);
        if (error) throw error;
        claimed.add(item.resourceId);
        updated += 1;
      }
      return NextResponse.json({ ok: true, updated, ambiguous: plan.ambiguousIds.length, unmatched: plan.unmatchedIds.length });
    } else {
      return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && /unique|duplicate/i.test(error.message)
      ? "이미 다른 캐릭터에 연결된 resource_id 또는 name_code입니다."
      : "BlaBlaLink 매핑을 저장하지 못했습니다.";
    console.error("[blablalink mappings] mutation failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
