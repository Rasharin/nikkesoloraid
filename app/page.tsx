"use client";
import LoginButton from "./components/LoginButton";
import React, { useEffect, useMemo, useRef, useState } from "react";
import HomeTab from "./components/tabs/HomeTab";
import MyPageTab from "./components/tabs/MyPageTab";
import SavedTab from "./components/tabs/SavedTab";
import SettingsTab from "./components/tabs/SettingsTab";
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
  raidKey: string;
  chars: string[]; // length 5
  score: number;
  createdAt: number;
};
type RecommendationDeck = {
  chars: string[];
  score: number;
};
type RecommendationRecord = {
  raidKey: string;
  raidLabel: string;
  total: number;
  decks: RecommendationDeck[];
  updatedAt: number;
};
type RecommendationRow = {
  user_id: string;
  raid_key: string;
  raid_label: string;
  total: number | string | null;
  decks: unknown;
  updated_at: string | null;
};
type AppConfigRow = {
  master_user_id: string | null;
  active_raid_key: string | null;
  solo_raid_active: boolean | null;
  solo_raid_tabs: unknown;
};
type DeckTabItem = {
  key: string;
  label: string;
};
type DeckRow = {
  id: string;
  user_id: string;
  raid_key: string | null;
  chars: string[] | null;
  score: number | string | null;
  created_at: string;
};
type AddSoloRaidPayload = {
  title: string;
  description: string;
  imageFile: File | null;
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

type TabKey = "home" | "saved" | "settings" | "mypage";
const DEFAULT_DECK_TABS: DeckTabItem[] = [
  { key: "altruia", label: "앨트루이아" },
];
const DEFAULT_ACTIVE_RAID_KEY = DEFAULT_DECK_TABS[0]?.key ?? null;

// -------------------- Constants --------------------
const SELECTED_KEY = "soloraid_selected_nikkes_v2";
const RECOMMENDATION_TABLE = "solo_raid_recommendations";

const MAX_SELECTED = 50;
const MAX_DECK_CHARS = 5;

// -------------------- Utils --------------------
function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function slugifyRaidLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function mapDeckRow(row: DeckRow): Deck | null {
  if (!row.raid_key || typeof row.raid_key !== "string") return null;
  const chars = Array.isArray(row.chars) ? row.chars.filter((v): v is string => typeof v === "string") : [];
  const score = Number(row.score);
  if (!Number.isFinite(score)) return null;
  const createdAt = Date.parse(row.created_at);
  return {
    id: row.id,
    raidKey: row.raid_key,
    chars,
    score,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}

function mapRecommendationRow(row: RecommendationRow): RecommendationRecord | null {
  const total = Number(row.total);
  if (!Number.isFinite(total)) return null;

  const rawDecks = Array.isArray(row.decks) ? row.decks : [];
  const decks: RecommendationDeck[] = [];

  for (const item of rawDecks) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as { chars?: unknown; score?: unknown };
    const chars = Array.isArray(candidate.chars)
      ? candidate.chars.filter((value): value is string => typeof value === "string")
      : [];
    const score = Number(candidate.score);

    if (chars.length === 0 || !Number.isFinite(score)) continue;
    decks.push({ chars, score });
  }

  const updatedAt = row.updated_at ? Date.parse(row.updated_at) : NaN;

  return {
    raidKey: row.raid_key,
    raidLabel: row.raid_label,
    total,
    decks,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

function mapDeckTabs(value: unknown): DeckTabItem[] {
  if (!Array.isArray(value)) return [];

  const tabs: DeckTabItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as { key?: unknown; label?: unknown };
    if (typeof candidate.key !== "string" || typeof candidate.label !== "string") continue;
    const key = candidate.key.trim();
    const label = candidate.label.trim();
    if (!key || !label) continue;
    tabs.push({ key, label });
  }

  return tabs;
}

function sameRecommendationRecord(a: RecommendationRecord | undefined, b: RecommendationRecord) {
  if (!a) return false;
  if (a.raidKey !== b.raidKey || a.raidLabel !== b.raidLabel || a.total !== b.total) return false;
  if (a.decks.length !== b.decks.length) return false;

  for (let i = 0; i < a.decks.length; i++) {
    const left = a.decks[i];
    const right = b.decks[i];
    if (left.score !== right.score) return false;
    if (left.chars.length !== right.chars.length) return false;
    for (let j = 0; j < left.chars.length; j++) {
      if (left.chars[j] !== right.chars[j]) return false;
    }
  }

  return true;
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
  const [deckTabs, setDeckTabs] = useState<DeckTabItem[]>(DEFAULT_DECK_TABS);
  const [savedDeckTab, setSavedDeckTab] = useState<string>(DEFAULT_DECK_TABS[0]?.key ?? "");

  // decks (Supabase)
  const [decks, setDecks] = useState<Deck[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(false);

  // supabase data
  const [nikkes, setnikkes] = useState<NikkeRow[]>([]);
  const [boss, setBoss] = useState<BossRow | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // selected nikkes (max 50) - localStorage
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const [homeEditRequest, setHomeEditRequest] = useState<Deck | null>(null);

  // sync state
  const [syncing, setSyncing] = useState(false);

  // toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [selectedBursts, setSelectedBursts] = useState<Set<number>>(new Set())
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [isMasterUser, setIsMasterUser] = useState(false);
  const [activeRaidKey, setActiveRaidKey] = useState<string | null>(DEFAULT_ACTIVE_RAID_KEY);
  const [soloRaidActive, setSoloRaidActive] = useState(true);
  const [recommendationHistory, setRecommendationHistory] = useState<Record<string, RecommendationRecord>>({});
  const [recommendationLoaded, setRecommendationLoaded] = useState(false);

  async function refreshDecks(currentUserId: string) {
    setLoadingDecks(true);
    try {
      const { data, error } = await supabase
        .from("decks")
        .select("id,user_id,raid_key,chars,score,created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDecks(((data ?? []) as DeckRow[]).map(mapDeckRow).filter((d): d is Deck => d !== null));
    } catch (e) {
      console.error(e);
      setDecks([]);
      showToast("덱 불러오기 실패");
    } finally {
      setLoadingDecks(false);
    }
  }

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

  // 로그인 유저 추적
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshAppConfig() {
    const { data, error } = await supabase
      .from("app_config")
      .select("master_user_id,active_raid_key,solo_raid_active,solo_raid_tabs")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const config = data as AppConfigRow | null;
    const nextTabs = mapDeckTabs(config?.solo_raid_tabs);
    const resolvedTabs = nextTabs.length > 0 ? nextTabs : DEFAULT_DECK_TABS;
    const nextActiveKey = config?.active_raid_key ?? DEFAULT_ACTIVE_RAID_KEY;

    setDeckTabs(resolvedTabs);
    setActiveRaidKey(nextActiveKey);
    setSoloRaidActive(config?.solo_raid_active ?? true);
    setSavedDeckTab((prev) => {
      if (resolvedTabs.some((tab) => tab.key === prev)) return prev;
      if (nextActiveKey && resolvedTabs.some((tab) => tab.key === nextActiveKey)) return nextActiveKey;
      return resolvedTabs[0]?.key ?? "";
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAppConfig() {
      try {
        await refreshAppConfig();
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setDeckTabs(DEFAULT_DECK_TABS);
          setActiveRaidKey(DEFAULT_ACTIVE_RAID_KEY);
          setSoloRaidActive(true);
        }
      }
    }

    void loadAppConfig();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setIsMasterUser(false);
      return;
    }

    const currentUserId = userId;

    let cancelled = false;

    async function checkMasterUser() {
      try {
        const normalizedUserId = currentUserId.trim();
        const { data, error } = await supabase
          .from("app_config")
          .select("id")
          .eq("master_user_id", normalizedUserId)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        setIsMasterUser(Boolean(data));
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setIsMasterUser(false);
        }
      }
    }

    void checkMasterUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // selected 목록만 localStorage 사용
  useEffect(() => {
    try {
      const rawSel = localStorage.getItem(SELECTED_KEY);
      if (rawSel) {
        const parsed = JSON.parse(rawSel) as string[];
        if (Array.isArray(parsed)) setSelectedNames(parsed.slice(0, MAX_SELECTED));
      }
    } catch { }
  }, []);

  useEffect(() => {
    setRecommendationLoaded(false);

    if (!userId) {
      setRecommendationHistory({});
      setRecommendationLoaded(true);
      return;
    }

    let cancelled = false;

    async function loadRecommendationHistory() {
      try {
        const { data, error } = await supabase
          .from(RECOMMENDATION_TABLE)
          .select("user_id,raid_key,raid_label,total,decks,updated_at")
          .eq("user_id", userId);

        if (error) throw error;
        if (cancelled) return;

        const nextHistory: Record<string, RecommendationRecord> = {};
        for (const row of (data ?? []) as RecommendationRow[]) {
          const mapped = mapRecommendationRow(row);
          if (!mapped) continue;
          nextHistory[mapped.raidKey] = mapped;
        }

        setRecommendationHistory(nextHistory);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setRecommendationHistory({});
        }
      } finally {
        if (!cancelled) {
          setRecommendationLoaded(true);
        }
      }
    }

    void loadRecommendationHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 로그인 상태 변화 시 덱 로드
  useEffect(() => {
    if (!userId) {
      setDecks([]);
      setHomeEditRequest(null);
      return;
    }
    refreshDecks(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedNames));
    } catch { }
  }, [selectedNames]);

  useEffect(() => {
    if (deckTabs.some((deckTab) => deckTab.key === savedDeckTab)) return;
    setSavedDeckTab(activeRaidKey && deckTabs.some((deckTab) => deckTab.key === activeRaidKey)
      ? activeRaidKey
      : deckTabs[0]?.key ?? "");
  }, [activeRaidKey, deckTabs, savedDeckTab]);

  async function refreshSupabase(forceSoloRaidActive?: boolean) {
    setLoadingData(true);

    try {
      const { data: nikkeData, error: nikkeErr } = await supabase
        .from("nikkes")
        .select("id,name,image_path,created_at,burst,element,role")
        .order("name", { ascending: true });

      if (nikkeErr) {
        console.error(nikkeErr);
        showToast("니케 목록 불러오기 실패");
      } else {
        setnikkes((nikkeData ?? []) as NikkeRow[]);
      }

      const bossSource = (forceSoloRaidActive ?? soloRaidActive) ? "bosses" : "boss_default";
      const { data: bossData, error: bossErr } = await supabase
        .from(bossSource)
        .select("id,title,description,image_path,starts_at,ends_at,created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (bossErr) {
        console.error(bossErr);
        showToast("보스 정보 불러오기 실패");
      } else {
        setBoss((bossData && bossData[0]) || null);
      }
    } catch (e) {
      console.error(e);
      showToast("연결 에러");
    } finally {
      setLoadingData(false);
    }
  }

  // initial fetch
  useEffect(() => {
    refreshSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloRaidActive]);

  const nikkeMap = useMemo(() => {
    const m = new Map<string, NikkeRow>();
    for (const n of nikkes) m.set(n.name, n);
    return m;
  }, [nikkes]);

  const selectednikkes = useMemo(() => {
    return selectedNames.map((name) => nikkeMap.get(name)).filter(Boolean) as NikkeRow[];
  }, [selectedNames, nikkeMap]);

  const activeRaidDecks = useMemo(
    () => (activeRaidKey ? decks.filter((deck) => deck.raidKey === activeRaidKey) : []),
    [activeRaidKey, decks]
  );
  const best = useMemo(() => pickBest5(activeRaidDecks), [activeRaidDecks]);
  const canRecommend = best.picked.length === 5;
  const activeRaidLabel = useMemo(
    () => deckTabs.find((deckTab) => deckTab.key === activeRaidKey)?.label ?? activeRaidKey ?? "",
    [activeRaidKey, deckTabs]
  );
  const sortedDecks = useMemo(
    () =>
      decks
        .filter((deck) => deck.raidKey === savedDeckTab)
        .slice()
        .sort((a, b) => b.score - a.score),
    [decks, savedDeckTab]
  );
  const visibleSavedDecks = sortedDecks;
  const isMaster = isMasterUser;
  const canManageBosses = isMaster || process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (!recommendationLoaded) return;
    if (!userId) return;
    if (!soloRaidActive) return;
    if (!activeRaidKey) return;
    if (!canRecommend) return;

    const currentRaidKey = activeRaidKey;

    const nextRecord: RecommendationRecord = {
      raidKey: currentRaidKey,
      raidLabel: activeRaidLabel,
      total: best.total,
      decks: best.picked.map((deck) => ({
        chars: [...deck.chars],
        score: deck.score,
      })),
      updatedAt: Date.now(),
    };

    if (sameRecommendationRecord(recommendationHistory[currentRaidKey], nextRecord)) return;

    let cancelled = false;

    async function saveRecommendation() {
      try {
        const { error } = await supabase
          .from(RECOMMENDATION_TABLE)
          .upsert(
            {
              user_id: userId,
              raid_key: nextRecord.raidKey,
              raid_label: nextRecord.raidLabel,
              total: nextRecord.total,
              decks: nextRecord.decks,
              updated_at: new Date(nextRecord.updatedAt).toISOString(),
            },
            { onConflict: "user_id,raid_key" }
          );

        if (error) throw error;
        if (cancelled) return;

        setRecommendationHistory((prev) => {
          if (sameRecommendationRecord(prev[currentRaidKey], nextRecord)) return prev;
          return {
            ...prev,
            [currentRaidKey]: nextRecord,
          };
        });
      } catch (error) {
        console.error(error);
      }
    }

    void saveRecommendation();

    return () => {
      cancelled = true;
    };
  }, [activeRaidKey, activeRaidLabel, best, canRecommend, recommendationHistory, recommendationLoaded, soloRaidActive, userId]);

  function startEditDeck(d: Deck) {
    setTab("home");
    setHomeEditRequest(d);
  }

  async function deleteDeck(id: string) {
    if (!userId) return showToast("로그인 후 삭제 가능");

    try {
      const { error } = await supabase
        .from("decks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      setDecks((prev) => prev.filter((d) => d.id !== id));
      showToast("삭제 완료");
    } catch (e) {
      console.error(e);
      showToast("덱 삭제 실패");
    }
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

  async function submitDeckFromHome(payload: { draft: string[]; scoreText: string; editingId: string | null }) {
    const { draft, scoreText, editingId } = payload;

    if (draft.length !== MAX_DECK_CHARS) {
      showToast("니케 5명을 먼저 골라줘.");
      return false;
    }
    if (!userId) {
      showToast("로그인 후 덱 저장 가능");
      return false;
    }
    if (!activeRaidKey) {
      showToast("현재 진행 중인 솔로레이드가 없어");
      return false;
    }

    const sc = Number(scoreText.replaceAll(",", "").replaceAll(" ", "").trim());
    if (!Number.isFinite(sc) || sc <= 0) {
      showToast("점수는 숫자로 입력해줘.");
      return false;
    }

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("decks")
          .update({ chars: [...draft], score: sc })
          .eq("id", editingId)
          .eq("user_id", userId)
          .select("id,user_id,raid_key,chars,score,created_at")
          .single();
        if (error) throw error;
        const updated = mapDeckRow(data as DeckRow);
        if (!updated) throw new Error("Invalid deck row");
        setDecks((prev) => prev.map((deck) => (deck.id === editingId ? updated : deck)));
        showToast("덱 수정 저장 완료");
      } else {
        const { data, error } = await supabase
          .from("decks")
          .insert({ user_id: userId, raid_key: activeRaidKey, chars: [...draft], score: sc })
          .select("id,user_id,raid_key,chars,score,created_at")
          .single();
        if (error) throw error;
        const inserted = mapDeckRow(data as DeckRow);
        if (!inserted) throw new Error("Invalid deck row");
        setDecks((prev) => [inserted, ...prev]);
        showToast("덱 저장 완료");
      }
    } catch (e) {
      console.error(e);
      showToast("덱 저장 실패");
      return false;
    }

    return true;
  }

  async function submitBulkFromHome(text: string) {
    const parsed = parseBulk(text);
    if (parsed.length === 0) {
      showToast("맞는 덱이 없음.");
      return false;
    }
    if (!userId) {
      showToast("로그인 후 덱 저장 가능");
      return false;
    }
    if (!activeRaidKey) {
      showToast("현재 진행 중인 솔로레이드가 없어");
      return false;
    }

    const exists = new Set(
      decks
        .filter((deck) => deck.raidKey === activeRaidKey)
        .map((d) => `${d.score}|${d.chars.map(normToken).join("|")}`)
    );
    const insertRows: Array<{ user_id: string; raid_key: string; chars: string[]; score: number }> = [];

    for (const p of parsed) {
      const key = `${p.score}|${p.chars.map(normToken).join("|")}`;
      if (exists.has(key)) continue;
      insertRows.push({ user_id: userId, raid_key: activeRaidKey, chars: p.chars, score: p.score });
      exists.add(key);
    }

    if (insertRows.length === 0) {
      showToast("추가할 새 덱이 없어.");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("decks")
        .insert(insertRows)
        .select("id,user_id,raid_key,chars,score,created_at");
      if (error) throw error;
      const added = ((data ?? []) as DeckRow[]).map(mapDeckRow).filter((d): d is Deck => d !== null);
      setDecks((prev) => [...added, ...prev]);
      showToast(`텍스트로 ${added.length}개 추가`);
    } catch (e) {
      console.error(e);
      showToast("텍스트 덱 저장 실패");
      return false;
    }

    return true;
  }

  async function getCurrentUserId() {
    if (userId) return userId.trim();

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
      return null;
    }

    return data.user?.id?.trim() ?? null;
  }

  async function addSoloRaid(payload: AddSoloRaidPayload) {
    const trimmed = payload.title.trim();
    const trimmedDescription = payload.description.trim();
    const imageFile = payload.imageFile;

    if (!canManageBosses) {
      showToast("마스터 계정만 가능");
      return false;
    }
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 가능");
      return false;
    }
    if (!trimmed) {
      showToast("보스명을 입력해줘");
      return false;
    }
    if (!trimmedDescription) {
      showToast("보스 설명을 입력해줘");
      return false;
    }
    if (!imageFile) {
      showToast("보스 이미지를 선택해줘");
      return false;
    }

    const baseKey = slugifyRaidLabel(trimmed);
    if (!baseKey) {
      showToast("보스명 형식이 맞지 않아");
      return false;
    }

    let nextKey = baseKey;
    let suffix = 2;
    while (deckTabs.some((deckTab) => deckTab.key === nextKey)) {
      nextKey = `${baseKey}-${suffix}`;
      suffix += 1;
    }

    const nextTabs = [...deckTabs, { key: nextKey, label: trimmed }];
    const extension = imageFile.name.includes(".")
      ? imageFile.name.split(".").pop()?.toLowerCase() ?? "png"
      : "png";
    const imagePath = `${nextKey}-${Date.now()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("boss-images")
        .upload(imagePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: bossInsertError } = await supabase
        .from("bosses")
        .insert({
          title: trimmed,
          description: trimmedDescription,
          image_path: imagePath,
        });

      if (bossInsertError) throw bossInsertError;

      const { error } = await supabase
        .from("app_config")
        .update({
          solo_raid_tabs: nextTabs,
          active_raid_key: nextKey,
          solo_raid_active: true,
        })
        .eq("master_user_id", currentUserId);

      if (error) throw error;

      await refreshAppConfig();
      await refreshSupabase(true);
      showToast("새 솔로레이드 추가 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("솔로레이드 추가 실패");
      return false;
    }
  }

  async function endSoloRaid() {
    if (!canManageBosses) {
      showToast("마스터 계정만 가능");
      return false;
    }
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 가능");
      return false;
    }

    try {
      const { error } = await supabase
        .from("app_config")
        .update({
          solo_raid_active: false,
        })
        .eq("master_user_id", currentUserId);

      if (error) throw error;

      await refreshAppConfig();
      await refreshSupabase(false);
      showToast("솔로레이드 종료 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("솔로레이드 종료 실패");
      return false;
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-xl px-4 pb-28 pt-6">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-4 bg-neutral-950/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">니케 솔로레이드 덱 도우미</h1>

            <div className="flex flex-col items-end gap-2">
              <LoginButton onProfileClick={() => setTab("mypage")} />
              {process.env.NODE_ENV !== "production" ? (
                <button
                  type="button"
                  onClick={() => setTab("mypage")}
                  className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-400 active:scale-[0.99]"
                >
                  마이페이지 테스트
                </button>
              ) : null}
            </div>
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
            니케/보스 정보를 불러오는 중…
          </div>
        )}
        {loadingDecks && (
          <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-300">
            저장된 덱을 불러오는 중…
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl bg-neutral-800 px-4 py-2 text-sm shadow">
            {toast}
          </div>
        )}

        {loadingData && (
          <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-300">
            니케/보스 정보를 불러오는 중…
          </div>
        )}

        {tab === "home" && (
          <HomeTab
            boss={boss}
            decksCount={activeRaidDecks.length}
            canRecommend={canRecommend}
            best={best}
            fmt={fmt}
            getPublicUrl={getPublicUrl}
            selectedNikkes={selectednikkes}
            maxSelected={MAX_SELECTED}
            nikkeMap={nikkeMap}
            editRequest={homeEditRequest}
            onEditRequestConsumed={() => setHomeEditRequest(null)}
            onResetSelected={resetSelected}
            onGoToSettings={() => setTab("settings")}
            onShowToast={showToast}
            onSubmitDeck={submitDeckFromHome}
            onSubmitBulk={submitBulkFromHome}
          />
        )}

        {tab === "saved" && (
          <SavedTab
            userId={userId}
            visibleSavedDecks={visibleSavedDecks}
            deckTabs={deckTabs}
            savedDeckTab={savedDeckTab}
            onSavedDeckTabChange={setSavedDeckTab}
            onStartEditDeck={startEditDeck}
            onDeleteDeck={deleteDeck}
            fmt={fmt}
          />
        )}

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
            toggleSet={toggleSet}
            btnClass={btnClass}
            elements={elements}
            roles={roles}
            getPublicUrl={getPublicUrl}
            maxSelected={MAX_SELECTED}
          />
        )}

        {tab === "mypage" && (
          <MyPageTab
            deckTabs={deckTabs}
            isMaster={isMaster}
            showBossManagement={canManageBosses}
            recommendationHistory={recommendationHistory}
            soloRaidActive={soloRaidActive}
            onAddSoloRaid={addSoloRaid}
            onEndSoloRaid={endSoloRaid}
            fmt={fmt}
          />
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          <button
            onClick={() => setTab("home")}
            className="flex w-1/3 flex-col items-center gap-1 py-3 active:scale-[0.99]"
          >
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
