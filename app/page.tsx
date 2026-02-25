"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
const btnClass = (selected: boolean) =>
  `rounded-xl border px-3 py-1 text-sm transition
   ${selected
    ? "bg-white text-black border-white"
    : "bg-transparent text-neutral-200 border-neutral-700 hover:border-neutral-400"
  }`

function toggleSet<T>(set: Set<T>, value: T) {
  const next = new Set(set)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

// -------------------- Types --------------------
type Deck = {
  id: string;
  chars: string[]; // length 5
  score: number;
  createdAt: number;
};

type NikkeElement = "iron" | "fire" | "wind" | "water" | "electric" | null
type NikkeRole = "attacker" | "supporter" | "defender" | null

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  created_at: string;
  burst: number | null;
  element: NikkeElement;
  role: NikkeRole;
};

type BossRow = {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

  const elements = [
    { v: "iron", label: "철갑" },
    { v: "fire", label: "작열" },
    { v: "wind", label: "풍압" },
    { v: "water", label: "수냉" },
    { v: "electric", label: "전격" },
  ] as const;

  const roles = [
    { v: "attacker", label: "화력형" },
    { v: "supporter", label: "지원형" },
    { v: "defender", label: "방어형" },
  ] as const;

type TabKey = "home" | "saved" | "settings";

// -------------------- Constants --------------------
const DECKS_KEY = "soloraid_decks_v5";
const SELECTED_KEY = "soloraid_selected_nikkes_v2";

const MAX_SELECTED = 50;
const MAX_DECK_CHARS = 5;

// -------------------- Utils --------------------
function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normToken(s: string) {
  return s.replace(/\s+/g, "").trim().toLowerCase();
}

function splitCharsFlexible(input: string): string[] {
  const s = input.replace(/\r?\n/g, " ").trim();
  const normalized = s.replace(/[,\.\|\/\\\-·:;]+/g, "/");
  const spaceAsSep = normalized.replace(/\s+/g, "/");
  return spaceAsSep
    .split("/")
    .map((v) => v.trim())
    .filter(Boolean);
}

function deckCharSet(chars: string[]): Set<string> {
  const set = new Set<string>();
  for (const c of chars) set.add(normToken(c));
  return set;
}

function hasOverlap(a: Set<string>, b: Set<string>) {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

/** 중복 금지 + 5덱 + 합계 최대 (Branch & Bound) */
function pickBest5(decks: Deck[]): { picked: Deck[]; total: number } {
  const clean = decks
    .filter((d) => d.chars.length === 5 && Number.isFinite(d.score) && d.score > 0)
    .map((d) => ({ ...d, _set: deckCharSet(d.chars) }));

  clean.sort((a, b) => b.score - a.score);

  const n = clean.length;
  let bestTotal = -1;
  let bestPickIdx: number[] = [];
  const scores = clean.map((d) => d.score);

  function upperBound(startIdx: number, need: number) {
    let sum = 0;
    for (let i = 0; i < need; i++) {
      const idx = startIdx + i;
      if (idx >= n) return -Infinity;
      sum += scores[idx];
    }
    return sum;
  }

  function dfs(i: number, pickedIdx: number[], used: Set<string>, total: number) {
    const need = 5 - pickedIdx.length;

    if (need === 0) {
      if (total > bestTotal) {
        bestTotal = total;
        bestPickIdx = [...pickedIdx];
      }
      return;
    }
    if (i >= n) return;

    const ub = total + upperBound(i, need);
    if (ub <= bestTotal) return;

    const d = clean[i] as any as { score: number; _set: Set<string> };

    // 선택
    if (!hasOverlap(d._set, used)) {
      const nextUsed = new Set(used);
      for (const x of d._set) nextUsed.add(x);
      pickedIdx.push(i);
      dfs(i + 1, pickedIdx, nextUsed, total + d.score);
      pickedIdx.pop();
    }

    // 미선택
    dfs(i + 1, pickedIdx, used, total);
  }

  dfs(0, [], new Set<string>(), 0);

  const picked = bestPickIdx.map((idx) => {
    const { _set, ...rest } = clean[idx] as any;
    return rest as Deck;
  });

  return { picked, total: Math.max(0, bestTotal) };
}

function getPublicUrl(bucket: "nikke-images" | "boss-images", path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Storage 버킷 파일명 -> (name, image_path) 자동 upsert */
async function syncnikkesFromBucket(): Promise<number> {
  const { data, error } = await supabase.storage.from("nikke-images").list("", {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;

  const rows =
    (data ?? [])
      .filter((f) => f?.name && /\.(png|jpg|jpeg|webp)$/i.test(f.name))
      .map((f) => ({
        name: f.name.replace(/\.(png|jpg|jpeg|webp)$/i, ""),
        image_path: f.name,
      })) ?? [];

  if (rows.length === 0) return 0;

  const { error: upErr } = await supabase.from("nikkesolo").upsert(rows, { onConflict: "name" });
  if (upErr) throw upErr;

  return rows.length;
}

/** 텍스트 입력으로 덱 여러 개 파싱(선택 기능) */
function parseSingleDeckLine(line: string): { chars: string[]; score: number } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const arrow = trimmed.includes("→") ? "→" : trimmed.includes("->") ? "->" : null;
  if (arrow) {
    const [left, right] = trimmed.split(arrow).map((x) => x.trim());
    const chars = splitCharsFlexible(left);
    const score = Number(right.replaceAll(",", "").replaceAll(" ", ""));
    if (chars.length !== 5 || !Number.isFinite(score) || score <= 0) return null;
    return { chars, score };
  }

  const m = trimmed.match(/(\d[\d,]*)\s*$/);
  if (!m) return null;

  const score = Number(m[1].replaceAll(",", ""));
  if (!Number.isFinite(score) || score <= 0) return null;

  const left = trimmed.slice(0, m.index).trim();
  const chars = splitCharsFlexible(left);
  if (chars.length !== 5) return null;

  return { chars, score };
}

function parseBulk(text: string): Array<{ chars: string[]; score: number }> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: Array<{ chars: string[]; score: number }> = [];

  for (const l of lines) {
    const one = parseSingleDeckLine(l);
    if (one) out.push(one);
  }

  // "캐릭 줄 + 점수 줄"도 지원
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (a.includes("→") || a.includes("->")) continue;

    const chars = splitCharsFlexible(a);
    const score = Number(b.replaceAll(",", "").replaceAll(" ", ""));
    if (chars.length === 5 && Number.isFinite(score) && score > 0) {
      const key = `${score}|${chars.map(normToken).join("|")}`;
      const exists = out.some((x) => `${x.score}|${x.chars.map(normToken).join("|")}` === key);
      if (!exists) out.push({ chars, score });
    }
  }

  return out;
}

// -------------------- Icons --------------------
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
        stroke={active ? "white" : "#a3a3a3"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3h12l2 2v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke={active ? "white" : "#a3a3a3"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 3v6h8V3"
        stroke={active ? "white" : "#a3a3a3"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke={active ? "white" : "#a3a3a3"} strokeWidth="2" />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-6l-2.1.2a6.2 6.2 0 0 0-1.3-1.3l.2-2.1a7.9 7.9 0 0 0-6-.1l.2 2.1a6.2 6.2 0 0 0-1.3 1.3L7 9a7.9 7.9 0 0 0-.1 6l2.1-.2c.4.5.8 1 1.3 1.3l-.2 2.1a7.9 7.9 0 0 0 6 .1l-.2-2.1c.5-.4 1-.8 1.3-1.3l2.2.2Z"
        stroke={active ? "white" : "#a3a3a3"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
// -------------------- Page --------------------
export default function Page() {
  const [tab, setTab] = useState<TabKey>("home");

  // local decks
  const [decks, setDecks] = useState<Deck[]>([]);

  // supabase data
  const [nikkes, setnikkes] = useState<NikkeRow[]>([]);
  const [boss, setBoss] = useState<BossRow | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // selected nikkes (max 50) - localStorage
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  // draft deck builder
  const [draft, setDraft] = useState<string[]>([]);
  const [score, setScore] = useState("");
  const scoreRef = useRef<HTMLInputElement | null>(null);

  // saved edit mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // optional: text bulk add
  const [bulkText, setBulkText] = useState("");

  // sync state
  const [syncing, setSyncing] = useState(false);

  // toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [selectedBursts, setSelectedBursts] = useState<Set<number>>(new Set())
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1700);
  }

  // ✅ 선택 리스트 초기화(50개) + 로컬스토리지도 같이
  const resetSelected = () => {
    setSelectedNames([]);
    localStorage.removeItem(SELECTED_KEY);
    showToast("선택 리스트 초기화");
  };

  // ✅ 덱 빌더(draft/score/editing)만 초기화 + 점수 입력칸 포커스
  function clearDraft() {
    setDraft([]);
    setScore("");
    setEditingId(null);
    requestAnimationFrame(() => scoreRef.current?.focus());
  }

  // load local
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DECKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Deck[];
        if (Array.isArray(parsed)) setDecks(parsed);
      }
    } catch { }

    try {
      const rawSel = localStorage.getItem(SELECTED_KEY);
      if (rawSel) {
        const parsed = JSON.parse(rawSel) as string[];
        if (Array.isArray(parsed)) setSelectedNames(parsed.slice(0, MAX_SELECTED));
      }
    } catch { }
  }, []);

  // save local
  useEffect(() => {
    try {
      localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    } catch { }
  }, [decks]);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedNames));
    } catch { }
  }, [selectedNames]);

  async function refreshSupabase() {
    setLoadingData(true);

    try {
      const { data: nikkeData, error: nikkeErr } = await supabase
        .from("nikkes")
        .select("id,name,image_path,created_at,burst,element,role")
        .order("name", { ascending: true });

      if (nikkeErr) {
        console.error(nikkeErr);
        showToast("니케 목록 불러오기 실패(Supabase)");
      } else {
        setnikkes((nikkeData ?? []) as NikkeRow[]);
      }

      const { data: bossData, error: bossErr } = await supabase
        .from("bosses")
        .select("id,title,description,image_path,starts_at,ends_at,created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (bossErr) {
        console.error(bossErr);
        showToast("보스 정보 불러오기 실패(Supabase)");
      } else {
        setBoss((bossData && bossData[0]) || null);
      }
    } catch (e) {
      console.error(e);
      showToast("Supabase 연결 에러(환경변수/키/패키지 확인)");
    } finally {
      setLoadingData(false);
    }
  }

  // initial fetch
  useEffect(() => {
    refreshSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nikkeMap = useMemo(() => {
    const m = new Map<string, NikkeRow>();
    for (const n of nikkes) m.set(n.name, n);
    return m;
  }, [nikkes]);

  const selectednikkes = useMemo(() => {
    return selectedNames.map((name) => nikkeMap.get(name)).filter(Boolean) as NikkeRow[];
  }, [selectedNames, nikkeMap]);

  const best = useMemo(() => pickBest5(decks), [decks]);
  const canRecommend = best.picked.length === 5;
  const sortedDecks = useMemo(() => decks.slice().sort((a, b) => b.score - a.score), [decks]);

  function addToDraft(name: string) {
    setDraft((prev) => {
      if (prev.includes(name)) return prev;
      if (prev.length >= MAX_DECK_CHARS) return prev;
      const next = [...prev, name];
      if (next.length === MAX_DECK_CHARS) {
        requestAnimationFrame(() => scoreRef.current?.focus());
      }
      return next;
    });
  }

  function removeFromDraft(idx: number) {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
  }

  function saveDeckFromDraft() {
    if (draft.length !== 5) return showToast("니케 5명을 먼저 골라줘.");

    const sc = Number(score.replaceAll(",", "").replaceAll(" ", "").trim());
    if (!Number.isFinite(sc) || sc <= 0) return showToast("점수는 숫자로 입력해줘.");

    if (editingId) {
      setDecks((prev) => {
        const idx = prev.findIndex((d) => d.id === editingId);
        if (idx < 0) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], chars: [...draft], score: sc, createdAt: Date.now() };
        return copy;
      });
      showToast("덱 수정 저장 완료");
    } else {
      setDecks((prev) => [{ id: uid(), chars: [...draft], score: sc, createdAt: Date.now() }, ...prev]);
      showToast("덱 저장 완료");
    }

    clearDraft(); // ✅ 저장 성공 후 덱 빌더만 초기화
  }

  function startEditDeck(d: Deck) {
    setTab("home");
    setEditingId(d.id);
    setDraft([...d.chars]);
    setScore(String(d.score));
    requestAnimationFrame(() => scoreRef.current?.focus());
    showToast("수정 모드: 니케 변경 후 점수 저장");
  }

  function deleteDeck(id: string) {
    setDecks((prev) => prev.filter((d) => d.id !== id));
    showToast("삭제 완료");
  }

  function clearSeason() {
    setDecks([]);
    clearDraft();
    showToast("시즌 데이터 초기화 완료");
  }

  function toggleSelect(name: string) {
    setSelectedNames((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (prev.length >= MAX_SELECTED) {
        showToast("최대 50개 선택가능.");
        return prev;
      }
      return [...prev, name];
    });
  }

  async function onSyncBucket() {
    try {
      if (syncing) return;
      setSyncing(true);
      const count = await syncnikkesFromBucket();
      await refreshSupabase();
      showToast(count ? `버킷에서 ${count}개 자동 등록` : "등록할 이미지가 없어");
    } catch (e) {
      console.error(e);
      showToast("자동 등록 실패(권한/버킷/파일 확인)");
    } finally {
      setSyncing(false);
    }
  }

  function addDecksByText() {
    const parsed = parseBulk(bulkText);
    if (parsed.length === 0) return showToast("맞는 덱이 없음.");

    setDecks((prev) => {
      const exists = new Set(prev.map((d) => `${d.score}|${d.chars.map(normToken).join("|")}`));
      const add: Deck[] = [];
      let added = 0;

      for (const p of parsed) {
        const key = `${p.score}|${p.chars.map(normToken).join("|")}`;
        if (exists.has(key)) continue;
        add.push({ id: uid(), chars: p.chars, score: p.score, createdAt: Date.now() });
        exists.add(key);
        added++;
      }

      showToast(`텍스트로 ${added}개 추가`);
      return [...add, ...prev];
    });

    setBulkText("");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-xl px-4 pb-28 pt-6">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-4 bg-neutral-950/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">니케 솔레덱 조합기</h1>
            <button
              onClick={clearSeason}
              className="rounded-xl border border-neutral-700 px-3 py-2 text-sm active:scale-[0.99]"
            >
              시즌 종료(초기화)
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl bg-neutral-800 px-4 py-2 text-sm shadow">
            {toast}
          </div>
        )}

        {loadingData && (
          <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-300">
            Supabase에서 니케/보스 정보를 불러오는 중…
          </div>
        )}

        {/* HOME */}
        {tab === "home" && (
          <>
            {/* Boss */}
            <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              {boss && boss.image_path ? (
                <div className="mt-3 flex gap-4">
                  {/* 왼쪽: 제목 + 설명 */}
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold">{boss.title}</div>

                    <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-400">
                      {boss.description || "설명 없음"}
                    </div>
                  </div>

                  {/* 오른쪽: 큰 이미지 */}
                  <div className="w-[55%] max-w-[520px]">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getPublicUrl("boss-images", boss.image_path)}
                        alt={boss.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : boss ? (
                <div className="mt-2 text-sm text-neutral-300">보스는 있는데 이미지가 없어. bosses.image_path 확인해줘.</div>
              ) : (
                <div className="mt-2 text-sm text-neutral-300">보스 데이터가 없어. Supabase bosses에 1개 넣어줘.</div>
              )}
            </section>

            {/* 추천 조합 */}
            <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">추천 조합</h2>
                <div className="text-xs text-neutral-400">{decks.length}개 덱</div>
              </div>

              <div className="mt-3 rounded-2xl bg-neutral-950/40 p-3">
                {canRecommend ? (
                  <>
                    <div className="mb-2 flex items-end justify-between">
                      <div className="text-sm text-neutral-300">총합</div>
                      <div className="text-2xl font-bold tabular-nums">{fmt(best.total)}</div>
                    </div>

                    <div className="space-y-2">
                      {best.picked.map((d) => (
                        <div key={d.id} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-sm text-neutral-200">{d.chars.join(" / ")}</div>
                            <div className="flex-none text-sm tabular-nums text-neutral-200">{fmt(d.score)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-neutral-300">추천을 만들 만큼 덱이 부족해</div>
                )}
              </div>
            </section>

            {/* Selected Nikke carousel */}
            <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">니케 선택 (클릭해서 덱 구성)</h2>

                <div className="flex gap-2">
                  <button
                    onClick={resetSelected}
                    className="rounded-xl border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 active:scale-[0.99]"
                  >
                    리스트 초기화
                  </button>

                  <button
                    onClick={() => setTab("settings")}
                    className="rounded-xl border border-neutral-700 px-3 py-2 text-sm active:scale-[0.99]"
                  >
                    설정으로
                  </button>
                </div>
              </div>

              {selectednikkes.length === 0 ? (
                <div className="mt-3 text-sm text-neutral-300">
                  아직 선택된 니케가 없어. <span className="text-neutral-200">설정 탭</span>에서 최대 50개 선택 가능.
                </div>
              ) : (
                <>
                  <div className="mt-2 text-xs text-neutral-400">
                    선택됨: <span className="text-neutral-200">{selectednikkes.length}</span> / {MAX_SELECTED}
                  </div>

                  <div className="mt-3 max-h-[30vh] overflow-y-auto pr-1 no-scrollbar overscroll-contain">
                    <div className="grid grid-cols-5 gap-2">
                      {selectednikkes.map((n) => {
                        const url = n.image_path ? getPublicUrl("nikke-images", n.image_path) : "";
                        return (
                          <button
                            key={n.id}
                            onClick={() => addToDraft(n.name)}
                            className="flex flex-col items-center active:scale-[0.99]"
                            title={n.name}
                          >
                            <div className="aspect-square w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {url ? (
                                <img src={url} alt={n.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-neutral-200 leading-tight break-words line-clamp-2 text-center">
                              {n.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Draft builder */}
            <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h2 className="text-base font-semibold">{editingId ? "덱 수정" : "덱 만들기"}</h2>

              <div className="mt-3">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const name = draft[i];
                    const row = name ? nikkeMap.get(name) : undefined;
                    const url = row?.image_path ? getPublicUrl("nikke-images", row.image_path) : "";

                    return (
                      <button
                        key={i}
                        onClick={() => (name ? removeFromDraft(i) : undefined)}
                        className="aspect-square overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40 active:scale-[0.99]"
                        title={name ? "클릭하면 제거" : "비어있음"}
                      >
                        {name && url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-lg text-neutral-600">+</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 text-sm text-neutral-300">{draft.length ? draft.join(" / ") : "아직 선택 없음"}</div>

                <div className="mt-4">
                  <input
                    ref={scoreRef}
                    inputMode="numeric"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveDeckFromDraft(); // ✅ Enter = 저장 버튼
                      }
                    }}
                    placeholder="점수만 입력하면 1덱 완성 (예: 6510755443)"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-base outline-none"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={saveDeckFromDraft}
                    className="flex-1 rounded-2xl bg-white px-4 py-3 text-base font-semibold text-neutral-900 active:scale-[0.99]"
                  >
                    {editingId ? "수정 저장" : "덱 저장"}
                  </button>
                  <button
                    onClick={clearDraft}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-base active:scale-[0.99]"
                  >
                    비우기
                  </button>
                </div>
              </div>
            </section>

            {/* Optional text bulk add */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h2 className="text-base font-semibold">덱 일괄입력</h2>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`예) 세이렌 이브 라피 크라운 프리바티 6510755443
리타 / 앵커 / 리버렐리오 / 마스트 / 레이븐
3896714666
리타, 앵커, 리버렐리오, 마스트, 레이븐
383838883`}
                className="mt-3 h-32 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 p-3 text-sm outline-none"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={addDecksByText}
                  className="flex-1 rounded-2xl bg-neutral-100 px-4 py-3 text-base font-semibold text-neutral-900 active:scale-[0.99]"
                >
                  텍스트 추가
                </button>
                <button
                  onClick={() => setBulkText("")}
                  className="rounded-2xl border border-neutral-700 px-4 py-3 text-base active:scale-[0.99]"
                >
                  비우기
                </button>
              </div>
            </section>
          </>
        )}

        {/* SAVED */}
        {tab === "saved" && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">저장된 덱</h2>
              <div className="text-xs text-neutral-400">{decks.length}개</div>
            </div>

            <div className="mt-3 space-y-2">
              {sortedDecks.length === 0 ? (
                <div className="text-sm text-neutral-300">아직 저장된 덱이 없어. 홈에서 만들어줘.</div>
              ) : (
                sortedDecks.map((d, idx) => (
                  <div key={d.id} className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">#{idx + 1}</div>
                      <div className="text-sm tabular-nums text-neutral-200">{fmt(d.score)}</div>
                    </div>

                    <div className="mt-2 text-base font-medium text-neutral-100">{d.chars.join(" / ")}</div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => startEditDeck(d)}
                        className="flex-1 rounded-2xl border border-neutral-700 px-3 py-2 text-sm active:scale-[0.99]"
                      >
                        홈에서 수정
                      </button>
                      <button
                        onClick={() => deleteDeck(d.id)}
                        className="rounded-2xl border border-red-800/60 px-3 py-2 text-sm text-red-300 active:scale-[0.99]"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <SettingsTab
            nikkes={nikkes}
            selectedNames={selectedNames}
            toggleSelect={toggleSelect}
            setSelectedNames={setSelectedNames}
            onSync={onSyncBucket}
            syncing={syncing}
            selectedBursts={selectedBursts}
            setSelectedBursts={setSelectedBursts}
            selectedElements={selectedElements}
            setSelectedElements={setSelectedElements}
            selectedRoles={selectedRoles}
            setSelectedRoles={setSelectedRoles}
          />
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          <button onClick={() => setTab("home")} className="flex w-1/3 flex-col items-center gap-1 py-3 active:scale-[0.99]">
            <HomeIcon active={tab === "home"} />
            <div className={`text-xs ${tab === "home" ? "text-white" : "text-neutral-400"}`}>홈</div>
          </button>

          <button
            onClick={() => setTab("saved")}
            className="flex w-1/3 flex-col items-center gap-1 py-3 active:scale-[0.99]"
          >
            <SaveIcon active={tab === "saved"} />
            <div className={`text-xs ${tab === "saved" ? "text-white" : "text-neutral-400"}`}>저장된 덱</div>
          </button>

          <button
            onClick={() => setTab("settings")}
            className="flex w-1/3 flex-col items-center gap-1 py-3 active:scale-[0.99]"
          >
            <GearIcon active={tab === "settings"} />
            <div className={`text-xs ${tab === "settings" ? "text-white" : "text-neutral-400"}`}>설정</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------- SettingsTab --------------------
function SettingsTab(props: {
  nikkes: NikkeRow[];
  selectedNames: string[];
  toggleSelect: (name: string) => void;
  setSelectedNames: React.Dispatch<React.SetStateAction<string[]>>;
  onSync: () => void;
  syncing: boolean;

  selectedBursts: Set<number>;
  setSelectedBursts: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedElements: Set<string>;
  setSelectedElements: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedRoles: Set<string>;
  setSelectedRoles: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const {
    nikkes, selectedNames, toggleSelect, setSelectedNames, onSync, syncing,
    selectedBursts, setSelectedBursts,
    selectedElements, setSelectedElements,
    selectedRoles, setSelectedRoles,
  } = props;

  const [q, setQ] = useState("");

  // ✅ 검색 + 필터 합친 결과
  const filtered = useMemo(() => {
    const query = q.trim();

    return nikkes.filter((n) => {
      // 검색
      if (query && !n.name.includes(query)) return false;

      // burst: 선택 있으면 (선택 burst OR 0) 통과
      if (selectedBursts.size > 0) {
        const b = n.burst ?? -1;
        if (!(b === 0 || selectedBursts.has(b))) return false;
      }

      // element
      if (selectedElements.size > 0) {
        if (!n.element || !selectedElements.has(n.element)) return false;
      }

      // role
      if (selectedRoles.size > 0) {
        if (!n.role || !selectedRoles.has(n.role)) return false;
      }

      return true;
    });
  }, [nikkes, q, selectedBursts, selectedElements, selectedRoles]);

  // (NikkeName 컴포넌트는 기존 그대로 써도 됨)
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">설정: 사용할 니케 선택</h2>
        <div className="text-xs text-neutral-400">
          {selectedNames.length} / {MAX_SELECTED}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="니케 이름 검색"
          className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
        />
        <button
          onClick={() => setSelectedNames([])}
          className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99]"
        >
          전체 해제
        </button>
      </div>
      {/* ✅ 필터 버튼 */}
      <div className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-400">필터</div>
          <button
            onClick={() => {
              setSelectedBursts(new Set());
              setSelectedElements(new Set());
              setSelectedRoles(new Set());
            }}
            className="rounded-xl border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-400"
          >
            전체
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-14 text-xs text-neutral-500">버스트</div>
          {[1, 2, 3].map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBursts((prev) => toggleSet(prev, b))}
              className={btnClass(selectedBursts.has(b))}
            >
              {["Ⅰ", "Ⅱ", "Ⅲ"][b - 1]}
            </button>
          ))}
          <div className="text-[11px] text-neutral-500">(0은 자동 포함)</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-14 text-xs text-neutral-500">속성</div>
          {elements.map((e) => (
            <button
              key={e.v}
              onClick={() => setSelectedElements((prev) => toggleSet(prev, e.v))}
              className={btnClass(selectedElements.has(e.v))}
            >
              {e.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-14 text-xs text-neutral-500">역할</div>
          {roles.map((r) => (
            <button
              key={r.v}
              onClick={() => setSelectedRoles((prev) => toggleSet(prev, r.v))}
              className={btnClass(selectedRoles.has(r.v))}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-3 justify-items-start">
        {filtered.map((n) => {
          const selected = selectedNames.includes(n.name);
          const url = n.image_path ? getPublicUrl("nikke-images", n.image_path) : "";

          function NikkeName({ name }: { name: string }) {
            const parts = name.split(":");

            return (
              <div className="mt-1 h-[2.4em] text-[11px] font-medium leading-tight break-words overflow-hidden">
                {parts.length > 1 ? (
                  <>
                    {parts[0]}:
                    <br />
                    {parts.slice(1).join(":")}
                  </>
                ) : (
                  name
                )}
              </div>
            );
          }

          return (
            <button
              key={n.id}
              onClick={() => toggleSelect(n.name)}
              className={`rounded-2xl border p-1 text-left active:scale-[0.99] ${selected ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950/40"
                }`}
            >
              <div className="aspect-square w-22 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={n.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
                )}
              </div>
              <NikkeName name={n.name} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
