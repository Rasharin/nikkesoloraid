"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

import {
  ARCHIVE_CLOSURE_DATE,
  archiveToCsv,
  archiveToJson,
  buildArchive,
  fetchAllRows,
  type ArchiveDeck,
  type DeckArchive,
} from "@/lib/archive";
import { archiveSessionReducer, createArchiveSessionState } from "@/lib/archive-session";
import { supabase } from "@/lib/supabase";

const EMPTY_ARCHIVE: DeckArchive = { generatedAt: "", closureDate: ARCHIVE_CLOSURE_DATE, soloDecks: [], unionDecks: [] };
const ARCHIVE_CACHE_CLEANUP_KEY = "nideck_read_only_archive_cache_cleanup_v1";
const contactEmail = process.env.NEXT_PUBLIC_ARCHIVE_CONTACT_EMAIL?.trim() ?? "";

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function groupDecks(decks: readonly ArchiveDeck[]) {
  const groups = new Map<string, ArchiveDeck[]>();
  for (const deck of decks) {
    const group = groups.get(deck.raidLabel) ?? [];
    group.push(deck);
    groups.set(deck.raidLabel, group);
  }
  return Array.from(groups.entries());
}

function DeckCard({ deck }: { deck: ArchiveDeck }) {
  return (
    <article className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-neutral-400">
          {deck.kind === "union" ? `${deck.pageId}페이지 · ${deck.rowIndex + 1}행 · ${deck.deckId}번 덱` : "솔로 레이드 덱"}
          {deck.kind === "union" && deck.element ? ` · ${deck.element}` : ""}
        </div>
        <div className="text-sm font-semibold tabular-nums text-cyan-300">{new Intl.NumberFormat("ko-KR").format(deck.score)}점</div>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {deck.chars.map((name, index) => (
          <li key={`${deck.id}-${index}`} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-center text-sm">
            <span className="block text-[10px] text-neutral-500">{index + 1}</span>
            <span className="mt-1 block break-keep text-neutral-100">{name}</span>
          </li>
        ))}
      </ol>
      {deck.note ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-neutral-900/80 p-3 text-sm text-neutral-300">{deck.note}</p> : null}
      <time className="mt-3 block text-right text-[11px] text-neutral-500" dateTime={deck.createdAt}>
        저장일 {new Date(deck.createdAt).toLocaleDateString("ko-KR")}
      </time>
    </article>
  );
}

export default function ArchiveApp() {
  const [session, dispatch] = useReducer(archiveSessionReducer, undefined, createArchiveSessionState);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [section, setSection] = useState<"solo" | "union">("solo");

  useEffect(() => {
    if (window.localStorage.getItem(ARCHIVE_CACHE_CLEANUP_KEY) === "done") return;
    void (async () => {
      const registrations = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      const cacheNames = "caches" in window ? await window.caches.keys() : [];
      await Promise.all([
        ...registrations.map((registration) => registration.unregister()),
        ...cacheNames.map((name) => window.caches.delete(name)),
      ]);
      window.localStorage.setItem(ARCHIVE_CACHE_CLEANUP_KEY, "done");
      if (registrations.length > 0 || cacheNames.length > 0) window.location.reload();
    })();
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      dispatch({ type: "owner-changed", ownerId: data.user?.id ?? null });
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      dispatch({ type: "owner-changed", ownerId: session?.user.id ?? null });
      setAuthLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const ownerId = session.ownerId;
  const generation = session.generation;

  useEffect(() => {
    if (!ownerId) return;

    dispatch({ type: "load-started", ownerId, generation });
    void (async () => {
      const [soloRows, unionRows, scheduleRows] = await Promise.all([
        fetchAllRows(async (from, to) => {
          const { data, error, count } = await supabase
            .from("decks")
            .select("id,raid_key,deck_key,chars,score,note,created_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to);
          return { data, error, count };
        }),
        fetchAllRows(async (from, to) => {
          const { data, error, count } = await supabase
            .from("union_raid_decks")
            .select("id,raid_key,page_id,row_index,deck_id,chars,score,note,element,created_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to);
          return { data, error, count };
        }),
        fetchAllRows(async (from, to) => {
          const { data, error, count } = await supabase
            .from("union_raid_schedules")
            .select("raid_key,round", { count: "exact" })
            .order("raid_key", { ascending: true })
            .range(from, to);
          return { data, error, count };
        }),
      ]);
      dispatch({
        type: "load-succeeded",
        ownerId,
        generation,
        archive: buildArchive({ soloRows, unionRows, scheduleRows, generatedAt: new Date().toISOString() }),
      });
    })()
      .catch((cause) => {
        console.error(cause);
        dispatch({
          type: "load-failed",
          ownerId,
          generation,
          message: "저장된 덱을 불러오지 못했습니다. 잠시 후 다시 로그인해 주세요.",
        });
      });
  }, [generation, ownerId]);

  const archive = session.archiveOwnerId === ownerId ? session.archive : EMPTY_ARCHIVE;
  const archiveLoading = session.loading;
  const error = authError || session.error;
  const visibleDecks = section === "solo" ? archive.soloDecks : archive.unionDecks;
  const groups = useMemo(() => groupDecks(visibleDecks), [visibleDecks]);
  const total = archive.soloDecks.length + archive.unionDecks.length;

  async function signIn() {
    setAuthError("");
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signInError) setAuthError("Google 로그인을 시작하지 못했습니다.");
  }

  async function signOut() {
    dispatch({ type: "owner-changed", ownerId: null });
    await supabase.auth.signOut();
  }

  function exportArchive(format: "json" | "csv") {
    const date = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      downloadText(`nideck-archive-${date}.json`, archiveToJson(archive), "application/json;charset=utf-8");
    } else {
      downloadText(`nideck-archive-${date}.csv`, archiveToCsv(archive), "text/csv;charset=utf-8");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-sm font-semibold tracking-[0.18em] text-cyan-300">NiDeck ARCHIVE</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">읽기 전용 덱 보관소</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300 sm:text-base">
              Nikkesolo웹을 이용해주셔 감사합니다. 본 사이트의 기존 형식대로 내년까지 유지하려 하였으나 부득이하게 조회 전용 사이트로 변경함을 알립니다. 기존에 로그인하신 분들의 경우 로그인하여 덱 정보를 열람하실 수 있습니다.
            </p>
          </div>
          {ownerId ? (
            <button type="button" onClick={() => void signOut()} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500">로그아웃</button>
          ) : (
            <button type="button" onClick={() => void signIn()} disabled={authLoading} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-60">Google 로그인</button>
          )}
        </div>
        <div className="mt-6 rounded-2xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm leading-6 text-amber-100">
          운영 종료 예정일은 <strong>2027년 8월경</strong>입니다. 종료 전에 아래 내보내기 기능으로 자신의 기록을 보관해 주세요.
        </div>
        {contactEmail ? <p className="mt-3 text-xs text-neutral-400">조기 개인정보 삭제 요청: <a className="text-cyan-300 underline" href={`mailto:${contactEmail}`}>{contactEmail}</a></p> : null}
      </header>

      {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{error}</div> : null}

      {!ownerId ? (
        <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
          <h2 className="text-xl font-semibold">기존 계정으로 로그인해 주세요</h2>
          <p className="mt-2 text-sm text-neutral-400">Google 계정과 연결된 본인의 저장 덱만 조회할 수 있습니다.</p>
          {authLoading ? <p className="mt-4 text-xs text-neutral-500">로그인 상태 확인 중…</p> : null}
        </section>
      ) : (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div><div className="text-sm text-neutral-400">전체 보관 기록</div><div className="mt-1 text-2xl font-bold">{archiveLoading ? "…" : `${total}개`}</div></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => exportArchive("json")} disabled={archiveLoading || total === 0} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm disabled:opacity-40">JSON 내려받기</button>
              <button type="button" onClick={() => exportArchive("csv")} disabled={archiveLoading || total === 0} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm disabled:opacity-40">CSV 내려받기</button>
            </div>
          </div>
          <div className="mt-5 flex gap-2" role="tablist" aria-label="덱 종류">
            <button type="button" role="tab" aria-selected={section === "solo"} onClick={() => setSection("solo")} className={`rounded-xl px-4 py-2 text-sm ${section === "solo" ? "bg-white font-semibold text-black" : "border border-neutral-700"}`}>솔로 레이드 {archive.soloDecks.length}</button>
            <button type="button" role="tab" aria-selected={section === "union"} onClick={() => setSection("union")} className={`rounded-xl px-4 py-2 text-sm ${section === "union" ? "bg-white font-semibold text-black" : "border border-neutral-700"}`}>유니온 레이드 {archive.unionDecks.length}</button>
          </div>
          {archiveLoading ? (
            <div className="mt-5 rounded-2xl border border-neutral-800 p-8 text-center text-sm text-neutral-400">저장된 덱을 불러오는 중…</div>
          ) : groups.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-neutral-800 p-8 text-center text-sm text-neutral-400">이 계정에 저장된 덱이 없습니다.</div>
          ) : (
            <div className="mt-6 space-y-8">
              {groups.map(([label, decks]) => (
                <section key={label}>
                  <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{label}</h2><span className="text-xs text-neutral-500">{decks.length}개</span></div>
                  <div className="grid gap-4 lg:grid-cols-2">{decks.map((deck) => <DeckCard key={`${deck.kind}-${deck.id}`} deck={deck} />)}</div>
                </section>
              ))}
            </div>
          )}
        </section>
      )}
      <footer className="mt-12 border-t border-neutral-800 py-6 text-center text-xs text-neutral-500">
        NiDeck 읽기 전용 보관소 · <a className="hover:text-neutral-300" href="/privacy">개인정보처리방침</a> · <a className="hover:text-neutral-300" href="/terms">이용약관</a>
      </footer>
    </main>
  );
}
