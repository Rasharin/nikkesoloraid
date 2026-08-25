"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BlaBlaLinkMappingStatus } from "@/lib/blablalink-mapping";

type Mapping = {
  id: string;
  name: string;
  image_path: string | null;
  resource_id: number | null;
  name_code: number | null;
  mapping_source: "auto" | "manual" | null;
  mapping_verified: boolean;
  status: BlaBlaLinkMappingStatus;
};

type Candidate = { name: string; resourceId: number; nameCode: number | null };
type Payload = { mappings: Mapping[]; candidates: Candidate[]; unassignedCandidates: Candidate[] };
type Filter = "all" | "unverified" | "unmatched" | "manual" | "error";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "unverified", label: "미검증" },
  { key: "unmatched", label: "미매칭" },
  { key: "manual", label: "수동 매칭" },
  { key: "error", label: "중복/오류" },
];

const STATUS_LABEL: Record<BlaBlaLinkMappingStatus, string> = {
  matched: "정상 매칭", unmatched: "미매칭", duplicate: "중복 매칭", review: "검토 필요", manual: "수동 매칭",
};

export default function BlaBlaLinkMappingManager({
  getPublicUrl,
}: {
  getPublicUrl: (bucket: "nikke-images", path: string) => string;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/blablalink-mappings", { cache: "no-store" });
    const payload = await response.json().catch(() => null) as (Payload & { error?: string }) | null;
    if (!response.ok || !payload) throw new Error(payload?.error ?? "매핑 정보를 불러오지 못했습니다.");
    setData(payload);
  }, []);

  useEffect(() => {
    void load().catch((error) => setMessage(error instanceof Error ? error.message : "매핑 정보를 불러오지 못했습니다."));
  }, [load]);

  const mutate = useCallback(async (body: object, key: string) => {
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/blablalink-mappings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as { error?: string; updated?: number; verified?: number; ambiguous?: number; unmatched?: number } | null;
      if (!response.ok) throw new Error(payload?.error ?? "매핑을 저장하지 못했습니다.");
      setMessage(payload?.verified !== undefined
        ? `미검증 매칭 ${payload.verified}건을 일괄 확인했습니다.`
        : "updated" in (payload ?? {})
          ? `자동 매칭 ${payload?.updated ?? 0}건 완료 · 모호 ${payload?.ambiguous ?? 0}건 · 미매칭 ${payload?.unmatched ?? 0}건`
          : "매핑을 저장했습니다.");
      setEditingId(null);
      setCandidateSearch("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "매핑을 저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }, [load]);

  const filtered = useMemo(() => (data?.mappings ?? []).filter((row) => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    const matchesSearch = !query || row.name.toLocaleLowerCase("ko-KR").includes(query)
      || String(row.resource_id ?? "").includes(query);
    const matchesFilter = filter === "all"
      || (filter === "unverified" && !row.mapping_verified)
      || (filter === "unmatched" && row.status === "unmatched")
      || (filter === "manual" && row.mapping_source === "manual")
      || (filter === "error" && (row.status === "duplicate" || row.status === "review"));
    return matchesSearch && matchesFilter;
  }), [data, filter, search]);

  const visibleCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLocaleLowerCase("ko-KR");
    if (!query) return (data?.candidates ?? []).slice(0, 30);
    return (data?.candidates ?? []).filter((candidate) => candidate.name.toLocaleLowerCase("ko-KR").includes(query)
      || String(candidate.resourceId).includes(query)).slice(0, 50);
  }, [candidateSearch, data]);

  return (
    <section className="rounded-2xl border border-sky-900/60 bg-sky-950/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-100">BlaBlaLink 캐릭터 매칭</div>
          <div className="mt-1 text-xs text-neutral-400">이미지는 기존 사이트 이미지를 사용하며, 동기화는 resource_id로 연결됩니다.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy !== null} onClick={() => void mutate({ action: "verify-all" }, "verify-all")}
            className="rounded-xl border border-emerald-600/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 disabled:opacity-50">
            {busy === "verify-all" ? "일괄 확인 중..." : "일괄 매칭 확인"}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void mutate({ action: "auto" }, "auto")}
            className="rounded-xl border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-xs text-sky-100 disabled:opacity-50">
            {busy === "auto" ? "자동 매칭 중..." : "자동 매칭 실행"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)}
          className={filter === item.key ? "rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-black" : "rounded-xl border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300"}>{item.label}</button>)}
      </div>
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="사이트 캐릭터명 또는 resource_id 검색"
        className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm outline-none" />
      {message ? <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-300">{message}</div> : null}
      {data?.unassignedCandidates.length ? (
        <details className="mt-2 rounded-xl border border-amber-700/40 bg-amber-950/10 px-3 py-2 text-xs text-amber-100">
          <summary className="cursor-pointer">사이트에 연결되지 않은 CDN 캐릭터 {data.unassignedCandidates.length}개</summary>
          <div className="mt-2 max-h-32 overflow-y-auto text-neutral-300">
            {data.unassignedCandidates.map((candidate) => <div key={candidate.resourceId}>{candidate.name} · resource_id {candidate.resourceId}</div>)}
          </div>
        </details>
      ) : null}

      <div className="mt-3 grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
        {!data ? <div className="p-4 text-center text-sm text-neutral-400 lg:col-span-2">매핑 정보를 불러오는 중...</div> : filtered.length === 0 ? <div className="p-4 text-center text-sm text-neutral-400 lg:col-span-2">해당 조건의 캐릭터가 없습니다.</div> : filtered.map((row) => {
          const candidate = data.candidates.find((item) => item.resourceId === row.resource_id);
          const imageUrl = row.image_path ? getPublicUrl("nikke-images", row.image_path) : "";
          return <article key={row.id} className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                {imageUrl ? <Image src={imageUrl} alt={row.name} fill sizes="56px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-neutral-100">{row.name}</span><span className="rounded-lg border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300">{STATUS_LABEL[row.status]}</span>{!row.mapping_verified ? <span className="text-[11px] text-amber-300">미검증</span> : null}</div>
                <div className="mt-1 text-xs text-neutral-400">CDN: {candidate?.name ?? "-"} · resource_id {row.resource_id ?? "-"} · name_code {row.name_code ?? "-"}</div>
                <div className="mt-0.5 text-[11px] text-neutral-500">방식: {row.mapping_source === "manual" ? "수동" : row.mapping_source === "auto" ? "자동" : "미지정"}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => { setEditingId(editingId === row.id ? null : row.id); setCandidateSearch(""); }} className="rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs">매칭 변경</button>
              {row.resource_id !== null && !row.mapping_verified ? <button type="button" disabled={busy !== null} onClick={() => void mutate({ action: "verify", nikkeId: row.id }, `verify-${row.id}`)} className="rounded-lg border border-emerald-700/60 px-2.5 py-1.5 text-xs text-emerald-200 disabled:opacity-50">매칭 확인</button> : null}
              {row.mapping_source === "manual" ? <button type="button" disabled={busy !== null} onClick={() => void mutate({ action: "reset", nikkeId: row.id }, `reset-${row.id}`)} className="rounded-lg border border-amber-700/60 px-2.5 py-1.5 text-xs text-amber-200 disabled:opacity-50">자동 매칭으로 초기화</button> : null}
            </div>
            {editingId === row.id ? <div className="mt-2 rounded-xl border border-neutral-700 bg-neutral-900/70 p-2">
              <input autoFocus value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} placeholder="CDN 캐릭터명 또는 resource_id 검색" className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs outline-none" />
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {visibleCandidates.map((item) => <button key={item.resourceId} type="button" disabled={busy !== null} onClick={() => void mutate({ action: "manual", nikkeId: row.id, resourceId: item.resourceId }, `manual-${row.id}`)} className="flex w-full items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-left text-xs hover:border-sky-600 disabled:opacity-50"><span>{item.name}</span><span className="text-neutral-400">ID {item.resourceId} · code {item.nameCode ?? "-"}</span></button>)}
              </div>
            </div> : null}
          </article>;
        })}
      </div>
    </section>
  );
}
