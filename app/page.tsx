"use client";
import Link from "next/link";
import Header from "./components/Header";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import HomeTab from "./components/tabs/HomeTab";
import MyPageTab from "./components/tabs/MyPageTab";
import RecommendTab from "./components/tabs/RecommendTab";
import SavedTab from "./components/tabs/SavedTab";
import SettingsTab from "./components/tabs/SettingsTab";
import ContactTab from "./components/tabs/ContactTab";
import UsageTab from "./components/tabs/UsageTab";
import CalculatorTab from "./components/tabs/CalculatorTab";
import ImaginarySoloRaidTab from "./components/tabs/ImaginarySoloRaidTab";
import LicenseContent from "./components/LicenseContent";
import NoticeContent, { type NoticePost } from "./components/NoticeContent";
import PrivacyContent from "./components/PrivacyContent";
import TermsContent from "./components/TermsContent";
import type { ImageBlock, TextBlock, UsageBlock, UsageEditorBlock, UsagePost } from "./components/tabs/usage/types";
import { supabase, migrateAuthCookies } from "../lib/supabase";
import { MIN_RECOMMENDED_DECK_SCORE, pickBest5 } from "../lib/recommend";
import { formatScore, parseScoreInput, type ScoreDisplayMode } from "../lib/score-format";
const btnClass = (selected: boolean) =>
  `rounded-xl border px-3 py-1 text-sm transition
   ${selected
    ? "settings-filter-btn-active bg-white text-black border-white"
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
  deckKey: string;
  chars: string[]; // length 5
  score: number;
  createdAt: number;
};
type RecommendedDeck = {
  deckKey: string;
  chars: string[];
  usedCount: number;
  avgScore: number;
};
type RecommendedDeckSnapshot = {
  raidKey: string;
  raidLabel: string;
  decks: RecommendedDeck[];
  updatedAt: number;
};

function compareRecommendedDecksByScore(a: RecommendedDeck, b: RecommendedDeck) {
  if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
  return b.usedCount - a.usedCount;
}

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
type ThemeMode = "dark" | "light";

type RecommendationRow = {
  user_id: string;
  raid_key: string;
  raid_label: string;
  total: number | string | null;
  decks: unknown;
  updated_at: string | null;
};
type FavoriteRow = {
  user_id: string;
  nikke_name: string;
  created_at: string | null;
};
type SiteSettingRow = {
  key: string;
  value: string | null;
  updated_at: string | null;
  updated_by: string | null;
};
type SoloRaidTipRow = {
  id: string;
  raid_key: string;
  content: string;
  user_id: string | null;
  created_at: string;
};
type SoloRaidTip = {
  id: string;
  raidKey: string;
  content: string;
  userId: string | null;
  createdAt: number;
  source: "remote" | "local";
};
type ContactInquiryRow = {
  id: string;
  content: string;
  user_id: string | null;
  created_at: string;
};
type ContactInquiry = {
  id: string;
  content: string;
  userId: string | null;
  createdAt: number;
  source: "remote" | "local";
};
type UsagePostRow = {
  id: string;
  category_key: string;
  title: string | null;
  blocks: unknown;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};
type NoticePostRow = {
  id: string;
  title: string | null;
  content: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};
type AppConfigRow = {
  master_user_id: string | null;
  active_raid_key: string | null;
  solo_raid_active: boolean | null;
  solo_raid_tabs: unknown;
};
type BossUserStat = {
  raidKey: string;
  raidLabel: string;
  userCount: number;
  active: boolean;
  endedAt: number | null;
};
type DeckTabItem = {
  key: string;
  label: string;
};
type DeckRow = {
  id: string;
  user_id: string;
  raid_key: string | null;
  deck_key: string | null;
  chars: string[] | null;
  score: number | string | null;
  created_at: string;
};
type AddSoloRaidPayload = {
  title: string;
  description: string;
  imageFile: File | null;
};
type AddNikkePayload = {
  name: string;
  burst: number | null;
  element: NikkeElement;
  role: NikkeRole;
  aliases: string[];
  imagePath: string;
};
type AddUsagePostPayload = {
  categoryKey: string;
  blocks: UsageEditorBlock[];
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
  aliases: string[];
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

type SupabaseDataCache = {
  nikkes: NikkeRow[];
  bosses: BossRow[];
  bossSource: "bosses" | "boss_default";
  cachedAt: number;
};

type UserDecksCache = {
  userId: string;
  decks: Deck[];
  cachedAt: number;
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

type TabKey = "home" | "saved" | "recommend" | "imaginary" | "calculator" | "usage" | "settings" | "contact" | "mypage";
type UsageBoardCategoryKey = "home" | "saved" | "recommend" | "deck-building" | "settings";
const TAB_ROUTE_MAP: Record<Exclude<TabKey, "mypage">, string> = {
  home: "/",
  saved: "/saved-deck",
  recommend: "/deck-recommend",
  imaginary: "/deck-building",
  calculator: "/calculator",
  usage: "/usage",
  settings: "/deck-setting",
  contact: "/faq",
};
const PATH_TAB_MAP: Record<string, Exclude<TabKey, "mypage">> = {
  "/": "home",
  "/saved-deck": "saved",
  "/deck-recommend": "recommend",
  "/deck-building": "imaginary",
  "/calculator": "calculator",
  "/usage": "usage",
  "/deck-setting": "settings",
  "/faq": "contact",
};
const DEFAULT_DECK_TABS: DeckTabItem[] = [];
const DEFAULT_ACTIVE_RAID_KEY = null;
const USAGE_BOARD_TABS: ReadonlyArray<{ key: UsageBoardCategoryKey; label: string }> = [
  { key: "home", label: "홈" },
  { key: "saved", label: "저장된 덱" },
  { key: "recommend", label: "추천" },
  { key: "deck-building", label: "덱 빌딩" },
  { key: "settings", label: "니케 관리" },
];

// -------------------- Constants --------------------
const SELECTED_KEY = "soloraid_selected_nikkes_v2";
const LOCAL_DECKS_KEY = "soloraid_saved_decks_v1";
const LOCAL_OFFSEASON_DECKS_KEY = "soloraid_offseason_decks_v1";
const LOCAL_OFFSEASON_RAID_KEY = "soloraid_offseason_raid_key_v1";
const SEASON_OFF_RAID_KEY = "__season_off__";
const SEASON_OFF_TAB_LABEL = "시즌Off";
const RECOMMENDATION_TABLE = "solo_raid_recommendations";
const LOCAL_FAVORITES_KEY = "soloraid_favorite_nikkes_v1";
const FAVORITES_TABLE = "favorite_nikkes";
const SITE_SETTINGS_TABLE = "site_settings";
const RECOMMENDED_VIDEO_KEY = "recommended_video_url";
const RECOMMENDED_NIKKES_KEY = "recommended_nikkes";
const TERMS_TEXT_KEY = "terms_text";
const PRIVACY_TEXT_KEY = "privacy_text";
const RECOMMENDED_DECK_SNAPSHOT_KEY_PREFIX = "recommended_deck_snapshot_";
const SOLO_RAID_TIPS_TABLE = "solo_raid_tips";
const LOCAL_TIPS_KEY = "soloraid_local_tips_v1";
const DEV_LOCAL_TIP_USER_ID = "__dev_local_tip_user__";
const CONTACT_INQUIRIES_TABLE = "contact_inquiries";
const LOCAL_CONTACT_INQUIRIES_KEY = "soloraid_local_contact_inquiries_v1";
const SCORE_DISPLAY_MODE_KEY = "soloraid_score_display_mode_v1";
const USAGE_POSTS_TABLE = "usage_posts";
const PEAK_USER_COUNT_KEY = "peak_user_count";
const NOTICE_POSTS_TABLE = "notice_posts";
const USER_STATS_TABLE = "site_user_stats";
const RAID_USER_STATS_TABLE = "raid_user_stats";
const RAID_USER_ARCHIVES_TABLE = "raid_user_archives";
const USER_STATS_CLIENT_ID_KEY = "soloraid_stats_client_id_v1";
const SUPABASE_DATA_CACHE_KEY = "soloraid_supabase_data_cache_v1";
const SUPABASE_DATA_CACHE_TTL = 1000 * 60 * 10;
const USER_DECKS_CACHE_KEY = "soloraid_user_decks_cache_v1";
const USER_DECKS_CACHE_TTL = 1000 * 60 * 5;
const STORAGE_IMAGE_CACHE_CONTROL_SECONDS = "31536000";
const THEME_MODE_KEY = "soloraid_theme_mode_v1";
const PERSIST_SESSION_KEY = "soloraid_persist_session_v1";

function readStoredScoreDisplayMode(): ScoreDisplayMode {
  if (typeof window === "undefined") return "number";

  try {
    const rawMode = window.localStorage.getItem(SCORE_DISPLAY_MODE_KEY);
    return rawMode === "number" || rawMode === "eok" ? rawMode : "number";
  } catch {
    return "number";
  }
}

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  try {
    const rawMode = window.localStorage.getItem(THEME_MODE_KEY) ?? window.localStorage.getItem("theme");
    return rawMode === "light" || rawMode === "dark" ? rawMode : "dark";
  } catch {
    return "dark";
  }
}

function readStoredPersistSession(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const rawValue = window.localStorage.getItem(PERSIST_SESSION_KEY);
    return rawValue === "false" ? false : true;
  } catch {
    return true;
  }
}
const DECK_BUILDING_DRAFT_STORAGE_KEY = "soloraid_deck_building_draft_v1";
const DECK_BUILDING_DRAFT_COUNT = 5;
const DECK_BUILDING_SPARE_SLOT_COUNT = 10;

const MAX_SELECTED = 100;
const MAX_DECK_CHARS = 5;

// -------------------- Utils --------------------

function createLocalTipId() {
  return `local-tip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStatsClientId() {
  if (typeof window === "undefined") return "";

  try {
    const saved = localStorage.getItem(USER_STATS_CLIENT_ID_KEY);
    if (saved) return saved;

    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(USER_STATS_CLIENT_ID_KEY, next);
    return next;
  } catch {
    return "";
  }
}

function slugifyRaidLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyStorageKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normToken(s: string) {
  return s.replace(/\s+/g, "").trim().toLowerCase();
}

function buildDeckKey(chars: readonly string[]) {
  return [...chars].map((char) => char.trim()).sort((a, b) => a.localeCompare(b)).join("|");
}

function getDraftDeckKey(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const chars = value.filter((slot): slot is string => typeof slot === "string" && slot.trim().length > 0);
  return chars.length === MAX_DECK_CHARS ? buildDeckKey(chars) : null;
}

function getRecommendedDeckSnapshotKey(raidKey: string) {
  return `${RECOMMENDED_DECK_SNAPSHOT_KEY_PREFIX}${raidKey.trim()}`;
}

function extractYouTubeVideoId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return id || null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") {
        return parts[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function toYouTubeEmbedUrl(input: string | null) {
  if (!input) return null;
  const videoId = extractYouTubeVideoId(input);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
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

function normalizeAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeNikkeRows(value: unknown): NikkeRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Omit<NikkeRow, "aliases"> & { aliases?: unknown } => Boolean(item) && typeof item === "object")
    .map((nikke) => ({
      ...nikke,
      aliases: normalizeAliases(nikke.aliases),
    }));
}

function readCachedSupabaseData(): SupabaseDataCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SUPABASE_DATA_CACHE_KEY) ?? sessionStorage.getItem(SUPABASE_DATA_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SupabaseDataCache>;
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > SUPABASE_DATA_CACHE_TTL) return null;
    if (parsed.bossSource !== "bosses" && parsed.bossSource !== "boss_default") return null;

    return {
      nikkes: normalizeNikkeRows(parsed.nikkes),
      bosses: Array.isArray(parsed.bosses) ? (parsed.bosses as BossRow[]) : [],
      bossSource: parsed.bossSource,
      cachedAt: parsed.cachedAt,
    };
  } catch {
    return null;
  }
}

function writeCachedSupabaseData(cache: SupabaseDataCache) {
  if (typeof window === "undefined") return;

  try {
    const serializedCache = JSON.stringify(cache);
    localStorage.setItem(SUPABASE_DATA_CACHE_KEY, serializedCache);
    sessionStorage.setItem(SUPABASE_DATA_CACHE_KEY, serializedCache);
  } catch {}
}

function resolveDeckChars(chars: string[], nikkeNameLookup: Map<string, string>): string[] | null {
  const resolved = chars.map((char) => nikkeNameLookup.get(normToken(char)) ?? char.trim());
  if (resolved.some((char) => !char)) return null;
  if (new Set(resolved).size !== MAX_DECK_CHARS) return null;
  return resolved;
}

function compareNikkeNamePriority(a: NikkeRow, b: NikkeRow): number {
  const aHasParentheses = /[()]/.test(a.name);
  const bHasParentheses = /[()]/.test(b.name);

  if (aHasParentheses !== bHasParentheses) {
    return aHasParentheses ? 1 : -1;
  }

  return a.name.localeCompare(b.name);
}

function getPublicUrl(bucket: "nikke-images" | "boss-images" | "usage-board-images", path: string) {
  if (bucket === "nikke-images") {
    return `/nikke-images/${path}`;
  }

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

  const { error: upErr } = await supabase.from("nikkes").upsert(rows, { onConflict: "name" });
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
    const score = parseScoreInput(right);
    if (chars.length !== 5 || score === null || !Number.isFinite(score) || score <= 0) return null;
    return { chars, score };
  }

  const m = trimmed.match(/((?:\d[\d,]*(?:\.\d+)?)\s*억|(?:\d[\d,]*(?:\.\d+)?))\s*$/);
  if (!m) return null;

  const score = parseScoreInput(m[1]);
  if (score === null || !Number.isFinite(score) || score <= 0) return null;

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
    const score = parseScoreInput(b);
    if (chars.length === 5 && score !== null && Number.isFinite(score) && score > 0) {
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
    deckKey: row.deck_key?.trim() || buildDeckKey(chars),
    chars,
    score,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}

function mapLocalDeck(value: unknown): Deck | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    id?: unknown;
    raidKey?: unknown;
    deckKey?: unknown;
    chars?: unknown;
    score?: unknown;
    createdAt?: unknown;
  };
  const chars = Array.isArray(candidate.chars)
    ? candidate.chars.filter((item): item is string => typeof item === "string")
    : [];
  const score = Number(candidate.score);
  const createdAt = Number(candidate.createdAt);

  if (typeof candidate.id !== "string" || typeof candidate.raidKey !== "string") return null;
  if (chars.length !== MAX_DECK_CHARS) return null;
  if (!Number.isFinite(score) || score <= 0) return null;

  return {
    id: candidate.id,
    raidKey: candidate.raidKey,
    deckKey: typeof candidate.deckKey === "string" && candidate.deckKey.trim() ? candidate.deckKey : buildDeckKey(chars),
    chars,
    score,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}

function mapSoloRaidTipRow(row: SoloRaidTipRow): SoloRaidTip | null {
  if (!row?.id || !row.raid_key || !row.content || !row.created_at) return null;

  const createdAt = Date.parse(row.created_at);
  return {
    id: row.id,
    raidKey: row.raid_key,
    content: row.content.trim(),
    userId: row.user_id ?? null,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    source: "remote",
  };
}

function mapContactInquiryRow(row: ContactInquiryRow): ContactInquiry | null {
  if (!row?.id || !row.content || !row.created_at) return null;

  const createdAt = Date.parse(row.created_at);
  return {
    id: row.id,
    content: row.content.trim(),
    userId: row.user_id ?? null,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    source: "remote",
  };
}

function createUsageBlockId(prefix: "text" | "image" = "text") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapUsageBlocks(value: unknown): UsageBlock[] {
  if (!Array.isArray(value)) return [];

  const blocks: UsageBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : createUsageBlockId();
    if (candidate.type === "text" && typeof candidate.content === "string") {
      blocks.push({
        id,
        type: "text",
        content: candidate.content,
        fontSize: candidate.fontSize === "sm" || candidate.fontSize === "lg" ? candidate.fontSize : "md",
      } satisfies TextBlock);
      continue;
    }

    if (candidate.type === "image" && typeof candidate.imagePath === "string") {
      blocks.push({
        id,
        type: "image",
        imagePath: candidate.imagePath,
        caption: typeof candidate.caption === "string" ? candidate.caption : "",
      } satisfies ImageBlock);
    }
  }

  return blocks;
}

function mapUsagePostRow(row: UsagePostRow): UsagePost | null {
  if (!row?.id || !row.category_key || !row.created_at) return null;
  const createdAt = Date.parse(row.created_at);
  const updatedAt = Date.parse(row.updated_at);
  const blocks = mapUsageBlocks(row.blocks);
  if (blocks.length === 0) return null;

  return {
    id: row.id,
    categoryKey: row.category_key,
    blocks,
    userId: row.user_id ?? null,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : Date.now()),
    source: "remote",
  };
}

function mapNoticePostRow(row: NoticePostRow): NoticePost | null {
  if (!row?.id || !row.title?.trim() || !row.content?.trim() || !row.created_at) return null;
  const createdAt = Date.parse(row.created_at);
  const updatedAt = Date.parse(row.updated_at);

  return {
    id: row.id,
    title: row.title.trim(),
    content: row.content,
    userId: row.user_id ?? null,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : Date.now()),
  };
}

function getUsageImagePaths(blocks: readonly UsageBlock[]) {
  return blocks.filter((block): block is ImageBlock => block.type === "image").map((block) => block.imagePath);
}

function getUsageDraftImagePaths(blocks: readonly UsageEditorBlock[]) {
  return blocks
    .filter((block): block is Extract<UsageEditorBlock, { type: "image" }> => block.type === "image")
    .map((block) => block.imagePath)
    .filter((path) => path.trim().length > 0);
}

function loadLocalTips(): SoloRaidTip[] {
  try {
    const raw = localStorage.getItem(LOCAL_TIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): SoloRaidTip | null => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as Record<string, unknown>;
        if (
          typeof candidate.id !== "string" ||
          typeof candidate.raidKey !== "string" ||
          typeof candidate.content !== "string" ||
          typeof candidate.createdAt !== "number"
        ) {
          return null;
        }

        return {
          id: candidate.id,
          raidKey: candidate.raidKey,
          content: candidate.content,
          userId: typeof candidate.userId === "string" ? candidate.userId : null,
          createdAt: candidate.createdAt,
          source: "local" as const,
        };
      })
      .filter((tip): tip is SoloRaidTip => tip !== null);
  } catch {
    return [];
  }
}

function saveLocalTips(tips: SoloRaidTip[]) {
  try {
    localStorage.setItem(LOCAL_TIPS_KEY, JSON.stringify(tips));
  } catch { }
}

function loadLocalContactInquiries(): ContactInquiry[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONTACT_INQUIRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): ContactInquiry | null => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as Record<string, unknown>;
        if (
          typeof candidate.id !== "string" ||
          typeof candidate.content !== "string" ||
          typeof candidate.createdAt !== "number"
        ) {
          return null;
        }

        return {
          id: candidate.id,
          content: candidate.content,
          userId: typeof candidate.userId === "string" ? candidate.userId : null,
          createdAt: candidate.createdAt,
          source: "local" as const,
        };
      })
      .filter((inquiry): inquiry is ContactInquiry => inquiry !== null);
  } catch {
    return [];
  }
}

function saveLocalContactInquiries(inquiries: ContactInquiry[]) {
  try {
    localStorage.setItem(LOCAL_CONTACT_INQUIRIES_KEY, JSON.stringify(inquiries));
  } catch { }
}

function loadLocalDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(LOCAL_DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(mapLocalDeck).filter((deck): deck is Deck => deck !== null);
  } catch {
    return [];
  }
}

function saveLocalDecks(nextDecks: Deck[]) {
  try {
    localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(nextDecks));
  } catch { }
}

function readCachedUserDecks(userId: string): Deck[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(USER_DECKS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<UserDecksCache>;
    if (parsed.userId !== userId) return null;
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > USER_DECKS_CACHE_TTL) return null;
    if (!Array.isArray(parsed.decks)) return null;

    return parsed.decks.map(mapLocalDeck).filter((deck): deck is Deck => deck !== null);
  } catch {
    return null;
  }
}

function writeCachedUserDecks(userId: string, decks: Deck[]) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      USER_DECKS_CACHE_KEY,
      JSON.stringify({
        userId,
        decks,
        cachedAt: Date.now(),
      })
    );
  } catch {}
}

function loadLocalOffSeasonDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(LOCAL_OFFSEASON_DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(mapLocalDeck).filter((deck): deck is Deck => deck !== null);
  } catch {
    return [];
  }
}

function saveLocalOffSeasonDecks(nextDecks: Deck[]) {
  try {
    localStorage.setItem(LOCAL_OFFSEASON_DECKS_KEY, JSON.stringify(nextDecks));
  } catch { }
}

function loadLocalOffSeasonRaidKey() {
  try {
    const raw = localStorage.getItem(LOCAL_OFFSEASON_RAID_KEY);
    return raw && raw.trim().length > 0 ? raw.trim() : null;
  } catch {
    return null;
  }
}

function saveLocalOffSeasonRaidKey(raidKey: string | null) {
  try {
    if (raidKey && raidKey.trim().length > 0) {
      localStorage.setItem(LOCAL_OFFSEASON_RAID_KEY, raidKey.trim());
      return;
    }
    localStorage.removeItem(LOCAL_OFFSEASON_RAID_KEY);
  } catch { }
}

function createLocalDeckId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadLocalFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } catch {
    return [];
  }
}

function saveLocalFavorites(nextFavorites: Iterable<string>) {
  try {
    localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(Array.from(nextFavorites)));
  } catch { }
}

function getDeckSignature(deck: Pick<Deck, "raidKey" | "chars" | "score">) {
  return `${deck.raidKey}|${deck.score}|${deck.chars.map(normToken).join("|")}`;
}

function cloneDecksForLocalStorage(sourceDecks: readonly Deck[]) {
  return sourceDecks.map((deck, index) => ({
    ...deck,
    id: `local-${deck.id}-${Date.now()}-${index}`,
    chars: [...deck.chars],
    createdAt: deck.createdAt + index,
  }));
}

function getLatestSavedDeckTabKey(_decks: readonly Deck[], deckTabs: readonly DeckTabItem[], fallbackKey = "") {
  const orderedTabs = deckTabs
    .filter((tab) => tab.key.toLowerCase() !== "test" && tab.label.toLowerCase() !== "test")
    .slice()
    .reverse();
  const availableKeys = new Set(orderedTabs.map((tab) => tab.key));

  if (fallbackKey && availableKeys.has(fallbackKey)) return fallbackKey;
  return orderedTabs[0]?.key ?? "";
}

function getNewestDeckTabKey(deckTabs: readonly DeckTabItem[]) {
  return (
    deckTabs
      .filter((tab) => tab.key.toLowerCase() !== "test" && tab.label.toLowerCase() !== "test")
      .slice()
      .reverse()[0]?.key ?? null
  );
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
    if (key.toLowerCase() === "test" || label.toLowerCase() === "test") continue;
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

function mapRecommendedDeckSnapshot(row: SiteSettingRow): RecommendedDeckSnapshot | null {
  if (typeof row.key !== "string" || !row.key.startsWith(RECOMMENDED_DECK_SNAPSHOT_KEY_PREFIX) || typeof row.value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    const raidKey = typeof parsed.raidKey === "string" ? parsed.raidKey.trim() : "";
    const raidLabel = typeof parsed.raidLabel === "string" ? parsed.raidLabel.trim() : "";
    const rawDecks = Array.isArray(parsed.decks) ? parsed.decks : [];
    const decks: RecommendedDeck[] = [];

    for (const item of rawDecks) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Record<string, unknown>;
      const chars = Array.isArray(candidate.chars)
        ? candidate.chars.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [];
      const usedCount = Number(candidate.usedCount);
      const avgScore = Number(candidate.avgScore);

      if (
        chars.length === 0 ||
        !Number.isFinite(usedCount) ||
        !Number.isFinite(avgScore) ||
        avgScore <= MIN_RECOMMENDED_DECK_SCORE
      ) continue;

      decks.push({
        deckKey: buildDeckKey(chars),
        chars,
        usedCount,
        avgScore,
      });
    }

    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.parse(row.updated_at ?? "");
    if (!raidKey || !raidLabel) return null;

    return {
      raidKey,
      raidLabel,
      decks,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function normalizeRecommendedNikkeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.map((name) => (typeof name === "string" ? name.trim() : "")).filter((name) => name.length > 0))
  );
}

// -------------------- Page --------------------
export default function Page() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [tab, setTab] = useState<TabKey>(() => PATH_TAB_MAP[pathname] ?? "home");
  const [usageBoardTab, setUsageBoardTab] = useState<UsageBoardCategoryKey>("home");
  const [deckTabs, setDeckTabs] = useState<DeckTabItem[]>(DEFAULT_DECK_TABS);

  // decks (Supabase)
  const [decks, setDecks] = useState<Deck[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(false);

  // supabase data
  const [nikkes, setnikkes] = useState<NikkeRow[]>([]);
  const [boss, setBoss] = useState<BossRow | null>(null);
  const [bosses, setBosses] = useState<BossRow[]>([]);
  const [selectedBossId, setSelectedBossId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // selected nikkes (max 100) - localStorage
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedNamesReady, setSelectedNamesReady] = useState(false);
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());

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
  const [authResolved, setAuthResolved] = useState(process.env.NODE_ENV !== "production");
  const [masterUserChecked, setMasterUserChecked] = useState(process.env.NODE_ENV !== "production");
  const [activeRaidKey, setActiveRaidKey] = useState<string | null>(DEFAULT_ACTIVE_RAID_KEY);
  const [configuredActiveRaidKey, setConfiguredActiveRaidKey] = useState<string | null>(DEFAULT_ACTIVE_RAID_KEY);
  const [soloRaidActive, setSoloRaidActive] = useState(true);
  const [appConfigLoaded, setAppConfigLoaded] = useState(false);
  const [recommendationHistory, setRecommendationHistory] = useState<Record<string, RecommendationRecord>>({});
  const [recommendationLoaded, setRecommendationLoaded] = useState(false);
  const [recommendedVideoUrl, setRecommendedVideoUrl] = useState<string>("");
  const [recommendedNikkeNames, setRecommendedNikkeNames] = useState<string[]>([]);
  const [communityRaidDecks, setCommunityRaidDecks] = useState<Deck[]>([]);
  const [loadingCommunityRaidDecks, setLoadingCommunityRaidDecks] = useState(false);
  const [recommendedDeckSnapshots, setRecommendedDeckSnapshots] = useState<Record<string, RecommendedDeckSnapshot>>({});
  const [loadingRecommendedDeckSnapshots, setLoadingRecommendedDeckSnapshots] = useState(false);
  const [offSeasonDecks, setOffSeasonDecks] = useState<Deck[]>([]);
  const [offSeasonRaidKey, setOffSeasonRaidKey] = useState<string | null>(null);
  const [recommendRaidKey, setRecommendRaidKey] = useState<string | null>(null);
  const [tipRaidKey, setTipRaidKey] = useState<string | null>(null);
  const [soloRaidTips, setSoloRaidTips] = useState<SoloRaidTip[]>([]);
  const [loadingSoloRaidTips, setLoadingSoloRaidTips] = useState(false);
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [loadingContactInquiries, setLoadingContactInquiries] = useState(false);
  const [usagePosts, setUsagePosts] = useState<UsagePost[]>([]);
  const [loadingUsagePosts, setLoadingUsagePosts] = useState(false);
  const [savingUsagePost, setSavingUsagePost] = useState(false);
  const [deletingUsagePostId, setDeletingUsagePostId] = useState<string | null>(null);
  const [noticePosts, setNoticePosts] = useState<NoticePost[]>([]);
  const [loadingNoticePosts, setLoadingNoticePosts] = useState(false);
  const [savingNoticePost, setSavingNoticePost] = useState(false);
  const [deletingNoticePostId, setDeletingNoticePostId] = useState<string | null>(null);
  const [onlineUserCount, setOnlineUserCount] = useState(1);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [bossUserStats, setBossUserStats] = useState<BossUserStat[]>([]);
  const [loadingUserStats, setLoadingUserStats] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [privacyText, setPrivacyText] = useState("");
  const [savingLegalTextKey, setSavingLegalTextKey] = useState<string | null>(null);
  const [scoreDisplayMode, setScoreDisplayModeState] = useState<ScoreDisplayMode>(() => readStoredScoreDisplayMode());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const [persistSessionState, setPersistSessionState] = useState<boolean>(() => readStoredPersistSession());
  const isLicensePage = pathname === "/license";
  const isNoticePage = pathname === "/notice";
  const isPrivacyPage = pathname === "/privacy";
  const isTermsPage = pathname === "/terms";
  const isLegalPage = isLicensePage || isNoticePage || isPrivacyPage || isTermsPage;
  const showInitialDataLoading = !isLegalPage && loadingData && nikkes.length === 0 && bosses.length === 0;
  const canAccessCalculator = process.env.NODE_ENV !== "production";
  const calculatorAccessResolved = true;

  useEffect(() => {
    if (!calculatorAccessResolved) return;
    const pathTab = PATH_TAB_MAP[pathname] ?? "home";
    const nextTab = pathTab === "calculator" && !canAccessCalculator ? "home" : pathTab;
    setTab((current) => (current === nextTab ? current : nextTab));
  }, [calculatorAccessResolved, canAccessCalculator, pathname]);

  useEffect(() => {
    const cached = readCachedSupabaseData();
    if (!cached) return;

    setnikkes(cached.nikkes);
    setBosses(cached.bosses);
    setBoss(cached.bosses[0] ?? null);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (!calculatorAccessResolved) return;
    if (pathname !== "/calculator") return;
    if (canAccessCalculator) return;
    router.replace("/");
  }, [calculatorAccessResolved, canAccessCalculator, pathname, router]);

  async function fetchUserDecks(currentUserId: string) {
    const { data, error } = await supabase
      .from("decks")
      .select("id,user_id,raid_key,deck_key,chars,score,created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as DeckRow[]).map(mapDeckRow).filter((d): d is Deck => d !== null);
  }

  async function fetchCommunityRaidDecks(raidKey: string) {
    const { data, error } = await supabase
      .from("decks")
      .select("id,user_id,raid_key,deck_key,chars,score,created_at")
      .eq("raid_key", raidKey)
      .not("user_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as DeckRow[]).map(mapDeckRow).filter((d): d is Deck => d !== null);
  }

  async function trackSiteUser(clientId: string) {
    if (!clientId) return;

    // 새 사용자인지 먼저 확인 (누적 카운터 정확도를 위해)
    const { data: existing } = await supabase
      .from(USER_STATS_TABLE)
      .select("client_id")
      .eq("client_id", clientId)
      .maybeSingle();

    const { error } = await supabase.from(USER_STATS_TABLE).upsert(
      {
        client_id: clientId,
        user_id: userId,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    );

    if (error) {
      console.warn("[stats] site user tracking skipped", error.message);
      return;
    }

    // 새 사용자라면 누적 카운터 즉시 증가 (refreshUserStats 호출 없이도 보존)
    if (!existing) {
      const { data: peakRow } = await supabase
        .from(SITE_SETTINGS_TABLE)
        .select("value")
        .eq("key", PEAK_USER_COUNT_KEY)
        .maybeSingle();
      const prev = parseInt((peakRow as SiteSettingRow | null)?.value ?? "0") || 0;
      void supabase
        .from(SITE_SETTINGS_TABLE)
        .upsert(
          { key: PEAK_USER_COUNT_KEY, value: String(prev + 1), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        )
        .then(({ error: upsertErr }) => {
          if (upsertErr) console.warn("[stats] cumulative count update failed", upsertErr.message);
        });
    }
  }

  async function trackRaidUser(clientId: string, raidKey: string, raidLabel: string) {
    if (!clientId || !raidKey) return;

    const { error } = await supabase.from(RAID_USER_STATS_TABLE).upsert(
      {
        raid_key: raidKey,
        raid_label: raidLabel,
        client_id: clientId,
        user_id: userId,
        last_seen: new Date().toISOString(),
        ended_at: null,
      },
      { onConflict: "raid_key,client_id" }
    );

    if (error) {
      console.warn("[stats] raid user tracking skipped", error.message);
    }
  }

  async function refreshUserStats() {
    setLoadingUserStats(true);
    try {
      const [totalResult, activeResult, archiveResult, peakResult] = await Promise.all([
        supabase.from(USER_STATS_TABLE).select("client_id", { count: "exact", head: true }),
        supabase.from(RAID_USER_STATS_TABLE).select("raid_key,raid_label,ended_at"),
        supabase.from(RAID_USER_ARCHIVES_TABLE).select("raid_key,raid_label,user_count,ended_at"),
        supabase.from(SITE_SETTINGS_TABLE).select("key,value").eq("key", PEAK_USER_COUNT_KEY).limit(1).maybeSingle(),
      ]);

      if (totalResult.error) throw totalResult.error;
      if (activeResult.error) throw activeResult.error;
      if (archiveResult.error) throw archiveResult.error;
      if (peakResult.error) console.warn("[stats] peak count fetch failed", peakResult.error.message);

      const byRaid = new Map<string, BossUserStat>();

      // Step 1: raid_user_stats에서 기간 동안 고유 접속자 수 카운트
      // (각 row = 고유 client_id, ended_at 여부 관계없이 기간 내 접속 이력)
      for (const row of (activeResult.data ?? []) as Array<{ raid_key: string | null; raid_label: string | null; ended_at: string | null }>) {
        if (!row.raid_key) continue;
        const existing = byRaid.get(row.raid_key);
        byRaid.set(row.raid_key, {
          raidKey: row.raid_key,
          raidLabel: row.raid_label?.trim() || row.raid_key,
          userCount: (existing?.userCount ?? 0) + 1,
          active: Boolean(existing?.active) || !row.ended_at,
          endedAt: Math.max(existing?.endedAt ?? 0, row.ended_at ? Date.parse(row.ended_at) : 0) || null,
        });
      }

      // Step 2: 아카이브(종료 시점 스냅샷)와 실시간 count 중 큰 값 사용
      // - 종료된 레이드: 두 값이 같거나 아카이브가 더 클 수 있음 (데이터 불일치 보정)
      // - 아카이브만 있고 raid_user_stats가 없는 레이드도 표시
      for (const row of (archiveResult.data ?? []) as Array<{
        raid_key: string | null;
        raid_label: string | null;
        user_count: number | string | null;
        ended_at: string | null;
      }>) {
        if (!row.raid_key) continue;
        const archivedCount = Number(row.user_count);
        if (!Number.isFinite(archivedCount) || archivedCount < 0) continue;
        const existing = byRaid.get(row.raid_key);
        byRaid.set(row.raid_key, {
          raidKey: row.raid_key,
          raidLabel: row.raid_label?.trim() || existing?.raidLabel || row.raid_key,
          userCount: Math.max(existing?.userCount ?? 0, archivedCount),
          active: existing?.active ?? false,
          endedAt: row.ended_at ? Date.parse(row.ended_at) : (existing?.endedAt ?? null),
        });
      }

      const currentCount = totalResult.count ?? 0;
      const storedPeak = parseInt((peakResult.data as SiteSettingRow | null)?.value ?? "0") || 0;
      // site_user_stats count가 RLS 등으로 줄어들어도 저장된 peak 이하로 내려가지 않음
      const displayCount = Math.max(currentCount, storedPeak);
      setTotalUserCount(displayCount);
      if (currentCount > storedPeak) {
        void supabase.from(SITE_SETTINGS_TABLE).upsert(
          { key: PEAK_USER_COUNT_KEY, value: String(currentCount), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        ).then(({ error }) => {
          if (error) console.warn("[stats] peak user count update failed", error.message);
        });
      }
      setBossUserStats(
        Array.from(byRaid.values()).sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return (b.endedAt ?? 0) - (a.endedAt ?? 0);
        })
      );
    } catch (error) {
      console.warn("[stats] user stats loading skipped", error);
    } finally {
      setLoadingUserStats(false);
    }
  }

  async function fetchFavoriteNames(currentUserId: string) {
    const { data, error } = await supabase
      .from(FAVORITES_TABLE)
      .select("user_id,nikke_name,created_at")
      .eq("user_id", currentUserId);

    if (error) throw error;
    return new Set(
      ((data ?? []) as FavoriteRow[])
        .map((row) => row.nikke_name)
        .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    );
  }

  async function fetchRecommendedVideoUrl() {
    const { data, error } = await supabase
      .from(SITE_SETTINGS_TABLE)
      .select("key,value,updated_at,updated_by")
      .eq("key", RECOMMENDED_VIDEO_KEY)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return ((data as SiteSettingRow | null)?.value ?? "").trim();
  }

  async function fetchRecommendedNikkeNames() {
    const { data, error } = await supabase
      .from(SITE_SETTINGS_TABLE)
      .select("key,value,updated_at,updated_by")
      .eq("key", RECOMMENDED_NIKKES_KEY)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const rawValue = (data as SiteSettingRow | null)?.value;
    if (!rawValue) return [];

    try {
      return normalizeRecommendedNikkeNames(JSON.parse(rawValue));
    } catch {
      return [];
    }
  }

  async function fetchLegalTexts() {
    const { data, error } = await supabase
      .from(SITE_SETTINGS_TABLE)
      .select("key,value,updated_at,updated_by")
      .in("key", [TERMS_TEXT_KEY, PRIVACY_TEXT_KEY]);

    if (error) throw error;

    const rows = (data ?? []) as SiteSettingRow[];
    return {
      terms: rows.find((row) => row.key === TERMS_TEXT_KEY)?.value ?? "",
      privacy: rows.find((row) => row.key === PRIVACY_TEXT_KEY)?.value ?? "",
    };
  }

  async function fetchRecommendedDeckSnapshots(raidKeys: readonly string[]) {
    const normalizedKeys = Array.from(new Set(raidKeys.map((raidKey) => raidKey.trim()).filter((raidKey) => raidKey.length > 0)));

    if (normalizedKeys.length === 0) return {};

    const { data, error } = await supabase
      .from(SITE_SETTINGS_TABLE)
      .select("key,value,updated_at,updated_by")
      .in("key", normalizedKeys.map(getRecommendedDeckSnapshotKey));

    if (error) throw error;

    const snapshots: Record<string, RecommendedDeckSnapshot> = {};
    for (const row of (data ?? []) as SiteSettingRow[]) {
      const mapped = mapRecommendedDeckSnapshot(row);
      if (!mapped) continue;
      snapshots[mapped.raidKey] = mapped;
    }

    return snapshots;
  }

  async function fetchSoloRaidTips(raidKey: string) {
    const { data, error } = await supabase
      .from(SOLO_RAID_TIPS_TABLE)
      .select("id,raid_key,content,user_id,created_at")
      .eq("raid_key", raidKey)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as SoloRaidTipRow[]).map(mapSoloRaidTipRow).filter((tip): tip is SoloRaidTip => tip !== null);
  }

  async function fetchContactInquiries() {
    const { data, error } = await supabase
      .from(CONTACT_INQUIRIES_TABLE)
      .select("id,content,user_id,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as ContactInquiryRow[])
      .map(mapContactInquiryRow)
      .filter((inquiry): inquiry is ContactInquiry => inquiry !== null);
  }

  async function fetchUsagePosts(categoryKey: UsageBoardCategoryKey) {
    const { data, error } = await supabase
      .from(USAGE_POSTS_TABLE)
      .select("id,category_key,title,blocks,user_id,created_at,updated_at")
      .eq("category_key", categoryKey)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return ((data ?? []) as UsagePostRow[]).map(mapUsagePostRow).filter((post): post is UsagePost => post !== null);
  }

  async function fetchNoticePosts() {
    const { data, error } = await supabase
      .from(NOTICE_POSTS_TABLE)
      .select("id,title,content,user_id,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as NoticePostRow[]).map(mapNoticePostRow).filter((post): post is NoticePost => post !== null);
  }

  function shouldIgnoreNoticeLoadError(error: unknown) {
    if (!error || typeof error !== "object") return false;

    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : "";
    const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

    return (
      code === "PGRST116" ||
      code === "42P01" ||
      message.includes("no rows") ||
      message.includes("relation") && message.includes("notice_posts") && message.includes("does not exist")
    );
  }

  async function syncLocalDecksToAccount(currentUserId: string) {
    const localDecks = loadLocalDecks();
    if (localDecks.length === 0) return 0;

    const existingDecks = await fetchUserDecks(currentUserId);
    const existingKeys = new Set(existingDecks.map(getDeckSignature));
    const insertRows: Array<{ user_id: string; raid_key: string; deck_key: string; chars: string[]; score: number }> = [];

    for (const deck of localDecks) {
      const key = getDeckSignature(deck);
      if (existingKeys.has(key)) continue;
      insertRows.push({
        user_id: currentUserId,
        raid_key: deck.raidKey,
        deck_key: deck.deckKey,
        chars: [...deck.chars],
        score: deck.score,
      });
      existingKeys.add(key);
    }

    if (insertRows.length > 0) {
      const { error } = await supabase.from("decks").insert(insertRows);
      if (error) throw error;
    }

    localStorage.removeItem(LOCAL_DECKS_KEY);
    return insertRows.length;
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1700);
  }

  // 선택 리스트 초기화 + 로컬스토리지도 같이
  const resetSelected = () => {
    setSelectedNames([]);
    localStorage.removeItem(SELECTED_KEY);
    showToast("선택 리스트 초기화");
  };

  const resetFilters = () => {
    setSelectedBursts(new Set());
    setSelectedElements(new Set());
    setSelectedRoles(new Set());
  };

  const fmt = (n: number) => formatScore(n, scoreDisplayMode);
  const updateScoreDisplayMode = (mode: ScoreDisplayMode) => {
    setScoreDisplayModeState(mode);

    try {
      localStorage.setItem(SCORE_DISPLAY_MODE_KEY, mode);
    } catch { }
  };

  const updateThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);

    try {
      localStorage.setItem(THEME_MODE_KEY, mode);
      localStorage.setItem("theme", mode);
    } catch { }
  };

  const updatePersistSession = (persist: boolean) => {
    setPersistSessionState(persist);

    try {
      localStorage.setItem(PERSIST_SESSION_KEY, String(persist));
    } catch { }

    migrateAuthCookies(persist);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.body.dataset.theme = themeMode;
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    document.body.classList.toggle("dark", themeMode === "dark");
    document.documentElement.classList.toggle("theme-light", themeMode === "light");
    document.documentElement.classList.toggle("theme-dark", themeMode === "dark");
    document.body.classList.toggle("theme-light", themeMode === "light");
    document.body.classList.toggle("theme-dark", themeMode === "dark");
  }, [themeMode]);

  useEffect(() => {
    migrateAuthCookies(persistSessionState);
  }, [persistSessionState]);

  // 로그인 유저 추적
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setAuthResolved(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthResolved(true);
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
    const validRaidKeys = new Set(resolvedTabs.map((tab) => tab.key));
    const configActiveRaidKey =
      typeof config?.active_raid_key === "string" && validRaidKeys.has(config.active_raid_key.trim())
        ? config.active_raid_key.trim()
        : null;
    const nextActiveKey = configActiveRaidKey ?? getNewestDeckTabKey(resolvedTabs) ?? DEFAULT_ACTIVE_RAID_KEY;

    setDeckTabs(resolvedTabs);
    setConfiguredActiveRaidKey(nextActiveKey);
    setActiveRaidKey(nextActiveKey);
    setSoloRaidActive(config?.solo_raid_active ?? true);
  }

  useEffect(() => {
    setOffSeasonDecks(loadLocalOffSeasonDecks());
    setOffSeasonRaidKey(loadLocalOffSeasonRaidKey());
  }, []);

  useEffect(() => {
    saveLocalOffSeasonRaidKey(offSeasonRaidKey);
  }, [offSeasonRaidKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadAppConfig() {
      setAppConfigLoaded(false);
      try {
        await refreshAppConfig();
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setDeckTabs(DEFAULT_DECK_TABS);
          setConfiguredActiveRaidKey(DEFAULT_ACTIVE_RAID_KEY);
          setActiveRaidKey(DEFAULT_ACTIVE_RAID_KEY);
          setSoloRaidActive(true);
        }
      } finally {
        if (!cancelled) {
          setAppConfigLoaded(true);
        }
      }
    }

    void loadAppConfig();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendedVideo() {
      if (tab !== "recommend" && tab !== "mypage") return;
      try {
        const nextUrl = await fetchRecommendedVideoUrl();
        if (!cancelled) {
          setRecommendedVideoUrl(nextUrl);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setRecommendedVideoUrl("");
        }
      }
    }

    void loadRecommendedVideo();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendedNikkes() {
      if (tab !== "settings" && tab !== "mypage") return;
      try {
        const nextNames = await fetchRecommendedNikkeNames();
        if (!cancelled) {
          setRecommendedNikkeNames(nextNames);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setRecommendedNikkeNames([]);
        }
      }
    }

    void loadRecommendedNikkes();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    let cancelled = false;

    async function loadLegalTexts() {
      if (!isLegalPage && tab !== "mypage") return;
      try {
        const nextTexts = await fetchLegalTexts();
        if (cancelled) return;
        setTermsText(nextTexts.terms);
        setPrivacyText(nextTexts.privacy);
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setTermsText("");
        setPrivacyText("");
      }
    }

    void loadLegalTexts();

    return () => {
      cancelled = true;
    };
  }, [isLegalPage, tab]);

  useEffect(() => {
    if (!authResolved) return;

    if (!userId) {
      setIsMasterUser(false);
      setMasterUserChecked(true);
      return;
    }

    const currentUserId = userId;

    let cancelled = false;

    async function checkMasterUser() {
      setMasterUserChecked(false);
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
      } finally {
        if (!cancelled) {
          setMasterUserChecked(true);
        }
      }
    }

    void checkMasterUser();

    return () => {
      cancelled = true;
    };
  }, [authResolved, userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadContactInquiries() {
      if (tab !== "mypage") return;
      if (process.env.NODE_ENV !== "production" && !userId) {
        if (!cancelled) {
          setContactInquiries(loadLocalContactInquiries().sort((a, b) => b.createdAt - a.createdAt));
        }
        return;
      }

      if (!isMasterUser) {
        if (!cancelled) {
          setContactInquiries([]);
        }
        return;
      }

      setLoadingContactInquiries(true);
      try {
        const inquiries = await fetchContactInquiries();
        if (!cancelled) {
          setContactInquiries(inquiries);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setContactInquiries([]);
          showToast("문의 불러오기 실패");
        }
      } finally {
        if (!cancelled) {
          setLoadingContactInquiries(false);
        }
      }
    }

    void loadContactInquiries();

    return () => {
      cancelled = true;
    };
  }, [isMasterUser, tab, userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsagePosts() {
      if (tab !== "usage") return;
      setLoadingUsagePosts(true);
      try {
        const posts = await fetchUsagePosts(usageBoardTab);
        if (!cancelled) {
          setUsagePosts(posts);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setUsagePosts([]);
          showToast("사용법 게시글 불러오기 실패");
        }
      } finally {
        if (!cancelled) {
          setLoadingUsagePosts(false);
        }
      }
    }

    void loadUsagePosts();

    return () => {
      cancelled = true;
    };
  }, [tab, usageBoardTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadNoticePosts() {
      if (pathname !== "/notice") return;

      setLoadingNoticePosts(true);
      try {
        const posts = await fetchNoticePosts();
        if (!cancelled) {
          setNoticePosts(posts);
        }
      } catch (error) {
        console.warn("공지사항 불러오기 실패", error);
        if (!cancelled) {
          setNoticePosts([]);
          if (!shouldIgnoreNoticeLoadError(error)) {
            showToast("공지사항 불러오기 실패");
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingNoticePosts(false);
        }
      }
    }

    void loadNoticePosts();

    return () => {
      cancelled = true;
    };
  }, []);

  // selected 목록만 localStorage 사용
  useEffect(() => {
    try {
      const rawSel = localStorage.getItem(SELECTED_KEY);
      if (rawSel) {
        const parsed = JSON.parse(rawSel) as string[];
        if (Array.isArray(parsed)) setSelectedNames(parsed.slice(0, MAX_SELECTED));
      }
    } catch { }
    setSelectedNamesReady(true);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SCORE_DISPLAY_MODE_KEY) return;
      if (event.newValue !== "number" && event.newValue !== "eok") return;

      setScoreDisplayModeState(event.newValue);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (!userId) {
        setFavoriteNames(new Set(loadLocalFavorites()));
        return;
      }

      try {
        const remoteFavorites = await fetchFavoriteNames(userId);
        const localFavorites = loadLocalFavorites();
        const missingLocalFavorites = localFavorites.filter((name) => !remoteFavorites.has(name));

        if (missingLocalFavorites.length > 0) {
          const { error } = await supabase
            .from(FAVORITES_TABLE)
            .insert(missingLocalFavorites.map((name) => ({ user_id: userId, nikke_name: name })));
          if (error) throw error;
          for (const name of missingLocalFavorites) remoteFavorites.add(name);
          localStorage.removeItem(LOCAL_FAVORITES_KEY);
        }

        if (!cancelled) {
          setFavoriteNames(new Set(remoteFavorites));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFavoriteNames(new Set());
          showToast("즐겨찾기 불러오기 실패");
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
      setDecks(loadLocalDecks());
      setHomeEditRequest(null);
      setLoadingDecks(false);
      return;
    }

    const currentUserId = userId;
    const cachedDecks = readCachedUserDecks(currentUserId);
    if (cachedDecks) {
      setDecks(cachedDecks);
    }
    let cancelled = false;

    async function syncAndRefreshDecks() {
      setLoadingDecks(!cachedDecks);
      try {
        const syncedCount = await syncLocalDecksToAccount(currentUserId);
        const nextDecks = await fetchUserDecks(currentUserId);
        if (cancelled) return;
        setDecks(nextDecks);
        writeCachedUserDecks(currentUserId, nextDecks);
        if (syncedCount > 0) {
          showToast(`로컬 덱 ${syncedCount}개 동기화 완료`);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setDecks([]);
          showToast("덱 불러오기 실패");
        }
      } finally {
        if (!cancelled) {
          setLoadingDecks(false);
        }
      }
    }

    void syncAndRefreshDecks();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendedDeckSnapshots() {
      if (tab !== "home" && tab !== "recommend" && tab !== "imaginary" && tab !== "mypage") return;
      const targetRaidKeys = deckTabs
        .map((tab) => tab.key)
        .filter((raidKey) => raidKey.toLowerCase() !== "test");

      if (targetRaidKeys.length === 0) {
        setRecommendedDeckSnapshots({});
        setLoadingRecommendedDeckSnapshots(false);
        return;
      }

      setLoadingRecommendedDeckSnapshots(true);
      try {
        const nextSnapshots = await fetchRecommendedDeckSnapshots(targetRaidKeys);
        if (!cancelled) {
          setRecommendedDeckSnapshots(nextSnapshots);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setRecommendedDeckSnapshots({});
        }
      } finally {
        if (!cancelled) {
          setLoadingRecommendedDeckSnapshots(false);
        }
      }
    }

    void loadRecommendedDeckSnapshots();

    return () => {
      cancelled = true;
    };
  }, [deckTabs, tab]);

  useEffect(() => {
    if (!selectedNamesReady) return;
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedNames));
    } catch { }
  }, [selectedNames, selectedNamesReady]);

  useEffect(() => {
    const availableRaidKeys = new Set(deckTabs.map((tab) => tab.key));
    if (availableRaidKeys.size === 0) {
      if (activeRaidKey !== null) setActiveRaidKey(null);
      return;
    }

    if (soloRaidActive) {
      if (activeRaidKey && availableRaidKeys.has(activeRaidKey)) return;
      const preferredRaidKey =
        (configuredActiveRaidKey && availableRaidKeys.has(configuredActiveRaidKey) ? configuredActiveRaidKey : null) ??
        getNewestDeckTabKey(deckTabs) ??
        DEFAULT_ACTIVE_RAID_KEY;
      if (activeRaidKey !== preferredRaidKey) {
        setActiveRaidKey(preferredRaidKey);
      }
      return;
    }

    if (activeRaidKey !== null && !availableRaidKeys.has(activeRaidKey)) {
      setActiveRaidKey(null);
    }
  }, [activeRaidKey, configuredActiveRaidKey, deckTabs, soloRaidActive]);

  async function refreshSupabase(forceSoloRaidActive?: boolean) {
    const hadData = nikkes.length > 0 || bosses.length > 0;
    setLoadingData(!hadData);

    try {
      let nextNikkes = nikkes;
      let nextBosses = bosses;
      const bossSource = (forceSoloRaidActive ?? soloRaidActive) ? "bosses" : "boss_default";

      const [nikkeResult, bossResult] = await Promise.all([
        supabase
          .from("nikkes")
          .select("id,name,image_path,created_at,burst,element,role,aliases")
          .order("name", { ascending: true }),
        supabase
          .from(bossSource)
          .select("id,title,description,image_path,starts_at,ends_at,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const { data: nikkeData, error: nikkeErr } = nikkeResult;
      const { data: bossData, error: bossErr } = bossResult;

      if (nikkeErr) {
        console.error(nikkeErr);
        showToast("니케 목록 불러오기 실패");
      } else {
        nextNikkes = normalizeNikkeRows(nikkeData);
        setnikkes(nextNikkes);
      }

      if (bossErr) {
        console.error(bossErr);
        showToast("보스 정보 불러오기 실패");
      } else {
        nextBosses = (bossData ?? []) as BossRow[];
        setBosses(nextBosses);
        setBoss((currentBoss) => {
          if (selectedBossId) {
            const selectedBoss = nextBosses.find((item) => item.id === selectedBossId) ?? null;
            if (selectedBoss) return selectedBoss;
          }
          return nextBosses[0] ?? null;
        });
      }

      if (!nikkeErr && !bossErr) {
        writeCachedSupabaseData({
          nikkes: nextNikkes,
          bosses: nextBosses,
          bossSource,
          cachedAt: Date.now(),
        });
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
    if (!appConfigLoaded) return;
    const cached = readCachedSupabaseData();
    const bossSource = soloRaidActive ? "bosses" : "boss_default";
    if (cached && cached.bossSource === bossSource && cached.nikkes.length > 0) {
      setLoadingData(false);
      return;
    }

    refreshSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appConfigLoaded, soloRaidActive]);

  useEffect(() => {
    if (bosses.length === 0) {
      if (boss !== null) setBoss(null);
      if (selectedBossId !== null) setSelectedBossId(null);
      return;
    }

    const selectedBoss = selectedBossId ? bosses.find((item) => item.id === selectedBossId) ?? null : null;
    const nextBoss = selectedBoss ?? bosses[0];

    if (!selectedBossId || !selectedBoss) {
      if (selectedBossId !== nextBoss.id) setSelectedBossId(nextBoss.id);
    }

    if (boss?.id !== nextBoss.id) {
      setBoss(nextBoss);
    }
  }, [boss, bosses, selectedBossId]);

  const nikkeMap = useMemo(() => {
    const m = new Map<string, NikkeRow>();
    for (const n of nikkes) m.set(n.name, n);
    return m;
  }, [nikkes]);

  const nikkeNameLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    const prioritizedNikkes = [...nikkes].sort(compareNikkeNamePriority);

    for (const nikke of prioritizedNikkes) {
      const canonicalKey = normToken(nikke.name);
      if (canonicalKey && !lookup.has(canonicalKey)) {
        lookup.set(canonicalKey, nikke.name);
      }
    }

    for (const nikke of prioritizedNikkes) {
      for (const alias of nikke.aliases) {
        const aliasKey = normToken(alias);
        if (aliasKey && !lookup.has(aliasKey)) {
          lookup.set(aliasKey, nikke.name);
        }
      }
    }

    return lookup;
  }, [nikkes]);

	  const selectednikkes = useMemo(() => {
	    return selectedNames
	      .map((name) => {
        const directMatch = nikkeMap.get(name);
        if (directMatch) return directMatch;

        const canonicalName = nikkeNameLookup.get(normToken(name));
        return canonicalName ? nikkeMap.get(canonicalName) ?? null : null;
	      })
	      .filter((nikke): nikke is NikkeRow => nikke !== null);
	  }, [selectedNames, nikkeMap, nikkeNameLookup]);
	  const soloRaidInProgress = soloRaidActive && Boolean(activeRaidKey);

		  const currentDeckRaidKey = useMemo(() => {
		    if (soloRaidInProgress) return activeRaidKey;
		    if (offSeasonRaidKey === SEASON_OFF_RAID_KEY || (offSeasonRaidKey && deckTabs.some((tab) => tab.key === offSeasonRaidKey))) {
		      return offSeasonRaidKey;
		    }
		    return SEASON_OFF_RAID_KEY;
		  }, [activeRaidKey, deckTabs, offSeasonRaidKey, soloRaidInProgress]);
  const defaultSelectableRaidKey = useMemo(
    () =>
      currentDeckRaidKey && currentDeckRaidKey !== SEASON_OFF_RAID_KEY
        ? currentDeckRaidKey
        : getNewestDeckTabKey(deckTabs) ?? null,
    [currentDeckRaidKey, deckTabs]
  );
  const selectedRecommendRaidKey = useMemo(() => {
    if (recommendRaidKey && deckTabs.some((deckTab) => deckTab.key === recommendRaidKey)) return recommendRaidKey;
    return defaultSelectableRaidKey;
  }, [defaultSelectableRaidKey, deckTabs, recommendRaidKey]);
  const selectedTipRaidKey = useMemo(() => {
    if (tipRaidKey && deckTabs.some((deckTab) => deckTab.key === tipRaidKey)) return tipRaidKey;
    return defaultSelectableRaidKey;
  }, [defaultSelectableRaidKey, deckTabs, tipRaidKey]);
  const recommendDeckLoadRaidKey = tab === "recommend" ? selectedRecommendRaidKey : currentDeckRaidKey;
		  const savedDeckSource = useMemo(() => {
	    if (soloRaidInProgress) return decks;
	    const seen = new Set<string>();
	    return [...offSeasonDecks, ...decks].filter((deck) => {
	      const key = getDeckSignature(deck);
	      if (seen.has(key)) return false;
	      seen.add(key);
	      return true;
	    });
	  }, [decks, offSeasonDecks, soloRaidInProgress]);
	  const editableDecks = useMemo(() => (soloRaidInProgress ? decks : offSeasonDecks), [decks, offSeasonDecks, soloRaidInProgress]);
	  const activeRaidDecks = useMemo(
	    () => (soloRaidInProgress && currentDeckRaidKey ? decks.filter((deck) => deck.raidKey === currentDeckRaidKey) : []),
	    [currentDeckRaidKey, decks, soloRaidInProgress]
	  );
  useEffect(() => {
    let cancelled = false;

    async function loadCommunityRaidDecks() {
      if (!recommendDeckLoadRaidKey || recommendDeckLoadRaidKey === SEASON_OFF_RAID_KEY) {
		        setCommunityRaidDecks([]);
		        setLoadingCommunityRaidDecks(false);
		        return;
		      }

      setLoadingCommunityRaidDecks(true);
      try {
	        const nextDecks = await fetchCommunityRaidDecks(recommendDeckLoadRaidKey);
        if (!cancelled) {
          setCommunityRaidDecks(nextDecks);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setCommunityRaidDecks([]);
          showToast("추천 덱 불러오기 실패");
        }
      } finally {
        if (!cancelled) {
          setLoadingCommunityRaidDecks(false);
        }
      }
    }

    void loadCommunityRaidDecks();

    return () => {
      cancelled = true;
    };
	  }, [recommendDeckLoadRaidKey]);
  const recommendedDecks = useMemo(() => {
    const grouped = new Map<string, { chars: string[]; totalScore: number; usedCount: number }>();

    for (const deck of communityRaidDecks) {
      if (!Number.isFinite(deck.score) || deck.score <= MIN_RECOMMENDED_DECK_SCORE) continue;

      const normalizedChars = [...deck.chars].map((char) => char.trim()).sort((a, b) => a.localeCompare(b));
      const key = buildDeckKey(normalizedChars);
      const existing = grouped.get(key);
      if (existing) {
        existing.totalScore += deck.score;
        existing.usedCount += 1;
        continue;
      }

      grouped.set(key, {
        chars: normalizedChars,
        totalScore: deck.score,
        usedCount: 1,
      });
    }

    return Array.from(grouped.entries())
      .map(([deckKey, group]) => ({
        deckKey,
        chars: group.chars,
        usedCount: group.usedCount,
        avgScore: group.totalScore / group.usedCount,
      }))
      .sort(compareRecommendedDecksByScore);
  }, [communityRaidDecks]);
	  const displayedRecommendedDecks = useMemo(() => {
	    if (!selectedRecommendRaidKey || selectedRecommendRaidKey === SEASON_OFF_RAID_KEY) return [];
	    if (recommendedDecks.length > 0) return recommendedDecks;
	    return [...(recommendedDeckSnapshots[selectedRecommendRaidKey]?.decks ?? [])].sort(compareRecommendedDecksByScore);
	  }, [recommendedDeckSnapshots, recommendedDecks, selectedRecommendRaidKey]);
  const best = useMemo(() => pickBest5(activeRaidDecks, { minScore: 0 }), [activeRaidDecks]);
  const canRecommend = best.picked.length === 5;
	  const activeRaidLabel = useMemo(
	    () =>
	      currentDeckRaidKey === SEASON_OFF_RAID_KEY
	        ? SEASON_OFF_TAB_LABEL
	        : deckTabs.find((deckTab) => deckTab.key === currentDeckRaidKey)?.label ?? currentDeckRaidKey ?? "",
	    [currentDeckRaidKey, deckTabs]
	  );
  const recommendRaidLabel = useMemo(
    () => deckTabs.find((deckTab) => deckTab.key === selectedRecommendRaidKey)?.label ?? selectedRecommendRaidKey ?? "",
    [deckTabs, selectedRecommendRaidKey]
  );
  const tipRaidLabel = useMemo(
    () => deckTabs.find((deckTab) => deckTab.key === selectedTipRaidKey)?.label ?? selectedTipRaidKey ?? "",
    [deckTabs, selectedTipRaidKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSoloRaidTips() {
      if (tab !== "recommend") return;
      if (!selectedTipRaidKey || selectedTipRaidKey === SEASON_OFF_RAID_KEY) {
        setSoloRaidTips([]);
        return;
      }

      setLoadingSoloRaidTips(true);
      try {
        const localTips = loadLocalTips()
          .filter((tip) => tip.raidKey === selectedTipRaidKey)
          .sort((a, b) => b.createdAt - a.createdAt);

        if (process.env.NODE_ENV !== "production" && !userId) {
          if (!cancelled) {
            setSoloRaidTips(localTips);
          }
          return;
        }

        const remoteTips = await fetchSoloRaidTips(selectedTipRaidKey);
        if (cancelled) return;
        setSoloRaidTips(process.env.NODE_ENV !== "production" ? [...localTips, ...remoteTips] : remoteTips);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSoloRaidTips(
            loadLocalTips()
              .filter((tip) => tip.raidKey === selectedTipRaidKey)
              .sort((a, b) => b.createdAt - a.createdAt)
          );
          showToast("솔레 팁 불러오기 실패");
        }
      } finally {
        if (!cancelled) {
          setLoadingSoloRaidTips(false);
        }
      }
    }

    void loadSoloRaidTips();

    return () => {
      cancelled = true;
    };
  }, [selectedTipRaidKey, tab, userId]);

	  const sortedDecks = useMemo(
	    () =>
	      savedDeckSource
	        .filter((deck) => deck.raidKey === currentDeckRaidKey)
	        .slice()
	        .sort((a, b) => b.score - a.score),
	    [currentDeckRaidKey, savedDeckSource]
	  );
  const visibleSavedDecks = sortedDecks;
  const showInitialDeckLoading = !isLegalPage && loadingDecks && savedDeckSource.length === 0;
  const savedDeckTabs = useMemo(
    () =>
      deckTabs
        .filter((tab) => tab.key.toLowerCase() !== "test" && tab.label.toLowerCase() !== "test")
        .slice()
        .reverse(),
    [deckTabs]
  );
  const isMaster = isMasterUser;
  const shouldShowCalculator = canAccessCalculator;
  const canManageBosses = isMaster || process.env.NODE_ENV !== "production";

  useEffect(() => {
    const clientId = getStatsClientId();
    if (!clientId) return;

    void trackSiteUser(clientId);
    const intervalId = window.setInterval(() => {
      void trackSiteUser(clientId);
    }, 1000 * 60);

    const channel = supabase.channel("site-online-users", {
      config: {
        presence: {
          key: clientId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineUserCount(Object.keys(channel.presenceState()).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!soloRaidInProgress || !currentDeckRaidKey || currentDeckRaidKey === SEASON_OFF_RAID_KEY) return;
    const clientId = getStatsClientId();
    if (!clientId) return;

    void trackRaidUser(clientId, currentDeckRaidKey, activeRaidLabel || currentDeckRaidKey);
  }, [activeRaidLabel, currentDeckRaidKey, soloRaidInProgress, userId]);

  useEffect(() => {
    if (!canManageBosses) return;
    void refreshUserStats();
  }, [canManageBosses, tab, onlineUserCount, soloRaidInProgress, currentDeckRaidKey]);

	  useEffect(() => {
	    if (soloRaidInProgress) return;
	    if (offSeasonRaidKey === SEASON_OFF_RAID_KEY || (offSeasonRaidKey && deckTabs.some((tab) => tab.key === offSeasonRaidKey))) return;
	    const fallbackRaidKey =
	      [...offSeasonDecks, ...decks].find((deck) => deckTabs.some((tab) => tab.key === deck.raidKey))?.raidKey ??
	      SEASON_OFF_RAID_KEY;
	    setOffSeasonRaidKey(fallbackRaidKey);
	  }, [deckTabs, decks, offSeasonDecks, offSeasonRaidKey, soloRaidInProgress]);

  async function persistRecommendationRecord(currentUserId: string, record: RecommendationRecord) {
    const { error } = await supabase
      .from(RECOMMENDATION_TABLE)
      .upsert(
        {
          user_id: currentUserId,
          raid_key: record.raidKey,
          raid_label: record.raidLabel,
          total: record.total,
          decks: record.decks,
          updated_at: new Date(record.updatedAt).toISOString(),
        },
        { onConflict: "user_id,raid_key" }
      );

    if (error) throw error;
  }

  async function persistRecommendedDeckSnapshot(currentUserId: string, raidKey: string, raidLabel: string, decksToPersist: readonly RecommendedDeck[]) {
    const snapshot: RecommendedDeckSnapshot = {
      raidKey,
      raidLabel,
      decks: decksToPersist.map((deck) => ({
        deckKey: deck.deckKey,
        chars: [...deck.chars],
        usedCount: deck.usedCount,
        avgScore: deck.avgScore,
      })),
      updatedAt: Date.now(),
    };

    const { error } = await supabase
      .from(SITE_SETTINGS_TABLE)
      .upsert(
        {
          key: getRecommendedDeckSnapshotKey(raidKey),
          value: JSON.stringify({
            raidKey: snapshot.raidKey,
            raidLabel: snapshot.raidLabel,
            decks: snapshot.decks.map((deck) => ({
              chars: deck.chars,
              usedCount: deck.usedCount,
              avgScore: deck.avgScore,
            })),
            updatedAt: snapshot.updatedAt,
          }),
          updated_by: currentUserId,
          updated_at: new Date(snapshot.updatedAt).toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) throw error;

    setRecommendedDeckSnapshots((prev) => ({
      ...prev,
      [raidKey]: snapshot,
    }));
  }

  useEffect(() => {
    if (!recommendationLoaded) return;
    if (!userId) return;
	    if (!soloRaidInProgress) return;
    if (!currentDeckRaidKey) return;
    if (!canRecommend) return;

    const currentRaidKey = currentDeckRaidKey;
    const currentUserId = userId;

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
        await persistRecommendationRecord(currentUserId, nextRecord);
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
	  }, [activeRaidLabel, best, canRecommend, currentDeckRaidKey, recommendationHistory, recommendationLoaded, soloRaidInProgress, userId]);

  const navigateToTab = useCallback((nextTab: Exclude<TabKey, "mypage">) => {
    const nextPath = TAB_ROUTE_MAP[nextTab];
    setTab(nextTab);
    if (pathnameRef.current !== nextPath) {
      router.push(nextPath);
    }
  }, [router]);

  const handleProfileClick = useCallback(() => setTab("mypage"), []);

  function copyRecommendedDeckToBuilder(deck: RecommendedDeck) {
    const draft = deck.chars.slice(0, MAX_DECK_CHARS);
    if (draft.length !== MAX_DECK_CHARS) {
      showToast("복사할 추천 덱 정보가 부족해");
      return false;
    }

    try {
      const rawDraft = localStorage.getItem(DECK_BUILDING_DRAFT_STORAGE_KEY);
      const parsed = rawDraft
        ? (JSON.parse(rawDraft) as { pages?: unknown; activePageId?: unknown; deckDrafts?: unknown; spareSlots?: unknown })
        : null;
      const savedPages = Array.isArray(parsed?.pages) && parsed.pages.length > 0 ? parsed.pages : null;
      const activePageId =
        typeof parsed?.activePageId === "number" && savedPages?.some((page) => page && typeof page === "object" && (page as { id?: unknown }).id === parsed.activePageId)
          ? parsed.activePageId
          : 1;
      const activePage =
        savedPages?.find((page) => page && typeof page === "object" && (page as { id?: unknown }).id === activePageId) ??
        ({
          id: activePageId,
          deckDrafts: parsed?.deckDrafts,
          spareSlots: parsed?.spareSlots,
        } as { id: number; deckDrafts?: unknown; spareSlots?: unknown });
      const savedDeckDrafts = Array.isArray((activePage as { deckDrafts?: unknown }).deckDrafts)
        ? ((activePage as { deckDrafts?: unknown }).deckDrafts as unknown[])
        : [];
      const deckDrafts = Array.from({ length: Math.max(DECK_BUILDING_DRAFT_COUNT, savedDeckDrafts.length) }, (_, index) => {
        const saved = savedDeckDrafts[index] as { id?: unknown; draft?: unknown; score?: unknown; editingId?: unknown } | undefined;
        return {
          id: typeof saved?.id === "number" && Number.isFinite(saved.id) ? saved.id : index + 1,
          draft: Array.isArray(saved?.draft) ? saved.draft.slice(0, MAX_DECK_CHARS) : Array.from({ length: MAX_DECK_CHARS }, () => null),
          score: typeof saved?.score === "string" ? saved.score : "",
          editingId: typeof saved?.editingId === "string" ? saved.editingId : null,
        };
      });

      const nextId = deckDrafts.reduce((maxId, deckDraft) => Math.max(maxId, deckDraft.id), 0) + 1;
      const existingDeckKeys = new Set(
        deckDrafts.map((deckDraft) => getDraftDeckKey(deckDraft.draft)).filter((key): key is string => key !== null)
      );
      if (existingDeckKeys.has(buildDeckKey(draft)) && !window.confirm("동일한 조합이 있습니다 복사 하시겠습니까")) {
        return false;
      }

      deckDrafts.unshift({
        id: nextId,
        draft,
        score: String(Math.round(deck.avgScore)),
        editingId: null,
      });

      const savedSpareSlots = (activePage as { spareSlots?: unknown }).spareSlots;
      const spareSlots = Array.isArray(savedSpareSlots)
        ? savedSpareSlots.slice(0, DECK_BUILDING_SPARE_SLOT_COUNT)
        : Array.from({ length: DECK_BUILDING_SPARE_SLOT_COUNT }, () => null);
      const nextActivePage = {
        id: activePageId,
        deckDrafts,
        spareSlots,
      };
      const pages = savedPages
        ? savedPages.map((page) => (page && typeof page === "object" && (page as { id?: unknown }).id === activePageId ? nextActivePage : page))
        : [nextActivePage];

      localStorage.setItem(
        DECK_BUILDING_DRAFT_STORAGE_KEY,
        JSON.stringify({
          pages,
          activePageId,
          savedAt: Date.now(),
        })
      );
      showToast("복사 완료");
      return true;
    } catch {
      showToast("복사 실패");
      return false;
    }
  }

  function copySavedDeckToBuilder(deck: Deck) {
    copyRecommendedDeckToBuilder({
      deckKey: deck.deckKey,
      chars: deck.chars,
      usedCount: 1,
      avgScore: deck.score,
    });
  }

  function copyRecommendedDecksToBuilder(decks: RecommendedDeck[]) {
    const copyTargets = decks
      .map((deck) => ({
        draft: deck.chars.slice(0, MAX_DECK_CHARS),
        score: String(Math.round(deck.avgScore)),
      }))
      .filter((deck) => deck.draft.length === MAX_DECK_CHARS);

    if (copyTargets.length === 0) {
      showToast("복사할 추천 덱 정보가 부족해");
      return;
    }

    try {
      const rawDraft = localStorage.getItem(DECK_BUILDING_DRAFT_STORAGE_KEY);
      const parsed = rawDraft
        ? (JSON.parse(rawDraft) as { pages?: unknown; activePageId?: unknown; deckDrafts?: unknown; spareSlots?: unknown })
        : null;
      const savedPages = Array.isArray(parsed?.pages) && parsed.pages.length > 0 ? parsed.pages : null;
      const activePageId =
        typeof parsed?.activePageId === "number" && savedPages?.some((page) => page && typeof page === "object" && (page as { id?: unknown }).id === parsed.activePageId)
          ? parsed.activePageId
          : 1;
      const activePage =
        savedPages?.find((page) => page && typeof page === "object" && (page as { id?: unknown }).id === activePageId) ??
        ({
          id: activePageId,
          deckDrafts: parsed?.deckDrafts,
          spareSlots: parsed?.spareSlots,
        } as { id: number; deckDrafts?: unknown; spareSlots?: unknown });
      const savedDeckDrafts = Array.isArray((activePage as { deckDrafts?: unknown }).deckDrafts)
        ? ((activePage as { deckDrafts?: unknown }).deckDrafts as unknown[])
        : [];
      const deckDrafts = Array.from({ length: Math.max(DECK_BUILDING_DRAFT_COUNT, savedDeckDrafts.length) }, (_, index) => {
        const saved = savedDeckDrafts[index] as { id?: unknown; draft?: unknown; score?: unknown; editingId?: unknown } | undefined;
        return {
          id: typeof saved?.id === "number" && Number.isFinite(saved.id) ? saved.id : index + 1,
          draft: Array.isArray(saved?.draft) ? saved.draft.slice(0, MAX_DECK_CHARS) : Array.from({ length: MAX_DECK_CHARS }, () => null),
          score: typeof saved?.score === "string" ? saved.score : "",
          editingId: typeof saved?.editingId === "string" ? saved.editingId : null,
        };
      });

      const existingDeckKeys = new Set(
        deckDrafts.map((deckDraft) => getDraftDeckKey(deckDraft.draft)).filter((key): key is string => key !== null)
      );
      const filteredCopyTargets = copyTargets.filter((deck) => !existingDeckKeys.has(buildDeckKey(deck.draft)));
      if (filteredCopyTargets.length === 0) {
        return;
      }
      const nextId = deckDrafts.reduce((maxId, deckDraft) => Math.max(maxId, deckDraft.id), 0) + 1;

      deckDrafts.unshift(
        ...filteredCopyTargets.map((deck, index) => ({
          id: nextId + index,
          draft: deck.draft,
          score: deck.score,
          editingId: null,
        }))
      );

      const savedSpareSlots = (activePage as { spareSlots?: unknown }).spareSlots;
      const spareSlots = Array.isArray(savedSpareSlots)
        ? savedSpareSlots.slice(0, DECK_BUILDING_SPARE_SLOT_COUNT)
        : Array.from({ length: DECK_BUILDING_SPARE_SLOT_COUNT }, () => null);
      const nextActivePage = {
        id: activePageId,
        deckDrafts,
        spareSlots,
      };
      const pages = savedPages
        ? savedPages.map((page) => (page && typeof page === "object" && (page as { id?: unknown }).id === activePageId ? nextActivePage : page))
        : [nextActivePage];

      localStorage.setItem(
        DECK_BUILDING_DRAFT_STORAGE_KEY,
        JSON.stringify({
          pages,
          activePageId,
          savedAt: Date.now(),
        })
      );
      showToast(`${filteredCopyTargets.length}개 덱 복사 완료`);
    } catch {
      showToast("복사 실패");
    }
  }

  function startEditDeck(d: Deck) {
    navigateToTab("home");
    setHomeEditRequest(d);
  }

  async function updateDeckScore(id: string, scoreText: string) {
    const sc = parseScoreInput(scoreText);
    if (sc === null || !Number.isFinite(sc) || sc <= 0) {
      showToast("점수는 숫자 또는 00.0억 형식으로 입력해줘.");
      return false;
    }

	    const targetDeckSource = soloRaidInProgress ? editableDecks : savedDeckSource;
	    const targetDeck = targetDeckSource.find((deck) => deck.id === id);
	    if (!targetDeck) {
	      showToast("덱을 찾을 수 없어");
	      return false;
	    }
	    const targetIsRemoteDeck = Boolean(userId && decks.some((deck) => deck.id === id));
	
	    try {
	      if (targetIsRemoteDeck && userId) {
	        const { data, error } = await supabase
	          .from("decks")
          .update({ score: sc })
          .eq("id", id)
          .eq("user_id", userId)
          .select("id,user_id,raid_key,deck_key,chars,score,created_at")
          .single();

        if (error) throw error;
        const updated = mapDeckRow(data as DeckRow);
        if (!updated) throw new Error("Invalid deck row");
        setDecks((prev) => prev.map((deck) => (deck.id === id ? updated : deck)));
        setCommunityRaidDecks((prev) => prev.map((d) => (d.id === id ? updated : d)));
      } else {
        const updateLocalDecks = (saveDecks: (nextDecks: Deck[]) => void) => (prev: Deck[]) => {
          const next = prev.map((deck) => (deck.id === id ? { ...deck, score: sc } : deck));
          saveDecks(next);
          return next;
        };

        const targetInPrimaryLocalDecks = decks.some((deck) => deck.id === id);

	        if (soloRaidInProgress || (!userId && targetInPrimaryLocalDecks)) {
          setDecks(updateLocalDecks(saveLocalDecks));
        } else {
          setOffSeasonDecks(updateLocalDecks(saveLocalOffSeasonDecks));
        }
      }

      showToast("점수 수정 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("점수 수정 실패");
      return false;
    }
  }

  async function updateDeckChars(id: string, nextChars: string[]) {
    if (nextChars.length !== MAX_DECK_CHARS || new Set(nextChars).size !== MAX_DECK_CHARS) {
      showToast("니케 5명을 중복 없이 맞춰줘.");
      return false;
    }

	    const targetDeckSource = soloRaidInProgress ? editableDecks : savedDeckSource;
	    const targetDeck = targetDeckSource.find((deck) => deck.id === id);
	    if (!targetDeck) {
	      showToast("덱을 찾을 수 없어");
	      return false;
	    }
	    const targetIsRemoteDeck = Boolean(userId && decks.some((deck) => deck.id === id));
	
	    try {
	      if (targetIsRemoteDeck && userId) {
	        const { data, error } = await supabase
	          .from("decks")
          .update({ chars: [...nextChars], deck_key: buildDeckKey(nextChars) })
          .eq("id", id)
          .eq("user_id", userId)
          .select("id,user_id,raid_key,deck_key,chars,score,created_at")
          .single();

        if (error) throw error;
        const updated = mapDeckRow(data as DeckRow);
        if (!updated) throw new Error("Invalid deck row");
        setDecks((prev) => prev.map((deck) => (deck.id === id ? updated : deck)));
      } else {
        const updateLocalDecks = (saveDecks: (nextDecks: Deck[]) => void) => (prev: Deck[]) => {
          const next = prev.map((deck) =>
            deck.id === id ? { ...deck, deckKey: buildDeckKey(nextChars), chars: [...nextChars] } : deck
          );
          saveDecks(next);
          return next;
        };

        const targetInPrimaryLocalDecks = decks.some((deck) => deck.id === id);

	        if (soloRaidInProgress || (!userId && targetInPrimaryLocalDecks)) {
          setDecks(updateLocalDecks(saveLocalDecks));
        } else {
          setOffSeasonDecks(updateLocalDecks(saveLocalOffSeasonDecks));
        }
      }

      showToast("덱 니케 변경 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("덱 니케 변경 실패");
      return false;
    }
  }

	  async function deleteDeck(id: string) {
	    const targetIsRemoteDeck = Boolean(userId && decks.some((deck) => deck.id === id));
	    if (!targetIsRemoteDeck || !userId) {
	      const updateLocalDecks = (saveDecks: (nextDecks: Deck[]) => void) => (prev: Deck[]) => {
        const next = prev.filter((d) => d.id !== id);
        saveDecks(next);
        return next;
      };

      const targetInPrimaryLocalDecks = decks.some((deck) => deck.id === id);

	      if (soloRaidInProgress || (!userId && targetInPrimaryLocalDecks)) {
        setDecks(updateLocalDecks(saveLocalDecks));
      } else {
        setOffSeasonDecks(updateLocalDecks(saveLocalOffSeasonDecks));
      }
      showToast("삭제 완료");
      return;
    }

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

  async function deleteAllVisibleSavedDecks() {
	    if (visibleSavedDecks.length === 0) return;
	    const targetIds = new Set(visibleSavedDecks.map((deck) => deck.id));
	    const remoteTargetIds = userId ? visibleSavedDecks.filter((deck) => decks.some((remoteDeck) => remoteDeck.id === deck.id)).map((deck) => deck.id) : [];
	
	    if (remoteTargetIds.length > 0 && userId) {
	      try {
	        const { error } = await supabase
	          .from("decks")
	          .delete()
	          .in("id", remoteTargetIds)
	          .eq("user_id", userId);
	        if (error) throw error;
	        setDecks((prev) => prev.filter((deck) => !targetIds.has(deck.id)));
	      } catch (error) {
	        console.error(error);
	        showToast("전체 삭제 실패");
	        return;
	      }
	    }

	    const updatePrimaryDecks = (prev: Deck[]) => {
	      const next = prev.filter((deck) => !targetIds.has(deck.id));
	      if (!userId) {
	        saveLocalDecks(next);
	      }
	      return next;
	    };
    const updateOffSeasonDecks = (prev: Deck[]) => {
      const next = prev.filter((deck) => !targetIds.has(deck.id));
      saveLocalOffSeasonDecks(next);
      return next;
    };

	    if (soloRaidInProgress) {
	      setDecks(updatePrimaryDecks);
	    } else {
	      setDecks(updatePrimaryDecks);
	      setOffSeasonDecks(updateOffSeasonDecks);
	    }
    showToast("전체 삭제 완료");
  }

  function toggleSelect(name: string) {
    setSelectedNames((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (prev.length >= MAX_SELECTED) {
        showToast("최대 100개 선택가능.");
        return prev;
      }
      return [...prev, name];
    });
  }

  function removeSelectedNikke(name: string) {
    setSelectedNames((prev) => prev.filter((currentName) => currentName !== name));
  }

  async function toggleFavorite(name: string) {
    const wasFavorite = favoriteNames.has(name);
    const nextFavorites = new Set(favoriteNames);

    if (wasFavorite) {
      nextFavorites.delete(name);
    } else {
      nextFavorites.add(name);
    }

    setFavoriteNames(nextFavorites);

    if (!userId) {
      saveLocalFavorites(nextFavorites);
      return;
    }

    try {
      if (wasFavorite) {
        const { error } = await supabase
          .from(FAVORITES_TABLE)
          .delete()
          .eq("user_id", userId)
          .eq("nikke_name", name);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(FAVORITES_TABLE)
          .insert({ user_id: userId, nikke_name: name });
        if (error) throw error;
      }
    } catch (error) {
      console.error(error);
      setFavoriteNames((prev) => {
        const reverted = new Set(prev);
        if (wasFavorite) {
          reverted.add(name);
        } else {
          reverted.delete(name);
        }
        return reverted;
      });
      showToast("즐겨찾기 저장 실패");
    }
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
	    const { draft, scoreText } = payload;

    if (draft.length !== MAX_DECK_CHARS) {
      showToast("니케 5명을 먼저 골라줘.");
      return false;
    }
	    const targetRaidKey = soloRaidInProgress ? currentDeckRaidKey : SEASON_OFF_RAID_KEY;
	    if (!targetRaidKey) {
	      showToast("저장할 레이드 탭을 찾을 수 없어");
	      return false;
	    }

    const sc = parseScoreInput(scoreText);
    if (sc === null || !Number.isFinite(sc) || sc <= 0) {
      showToast("점수는 숫자 또는 00.0억 형식으로 입력해줘.");
      return false;
    }

    try {
	      const nextDeckKey = buildDeckKey(draft);
	      const duplicateCandidates =
	        soloRaidInProgress || userId ? editableDecks : [...offSeasonDecks, ...decks];
	      const existingDeck = duplicateCandidates.find((deck) => deck.raidKey === targetRaidKey && deck.deckKey === nextDeckKey);

	      if (existingDeck && soloRaidInProgress && userId) {
        const { data, error } = await supabase
          .from("decks")
          .update({ score: sc })
          .eq("id", existingDeck.id)
          .eq("user_id", userId)
          .select("id,user_id,raid_key,deck_key,chars,score,created_at")
          .single();
        if (error) throw error;
        const updated = mapDeckRow(data as DeckRow);
        if (!updated) throw new Error("Invalid deck row");
        setDecks((prev) => prev.map((deck) => (deck.id === existingDeck.id ? updated : deck)));
        showToast("덱 저장 완료");
        setCommunityRaidDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
	      } else if (!existingDeck && soloRaidInProgress && userId) {
        const { data, error } = await supabase
          .from("decks")
	          .insert({ user_id: userId, raid_key: targetRaidKey, deck_key: nextDeckKey, chars: [...draft], score: sc })
          .select("id,user_id,raid_key,deck_key,chars,score,created_at")
          .single();
        if (error) throw error;
        const inserted = mapDeckRow(data as DeckRow);
        if (!inserted) throw new Error("Invalid deck row");
        setDecks((prev) => [inserted, ...prev]);
        setCommunityRaidDecks((prev) => [inserted, ...prev]);
        showToast("덱 저장 완료");
      } else if (existingDeck) {
        const updateLocalDecks = (saveDecks: (nextDecks: Deck[]) => void) => (prev: Deck[]) => {
          const next = prev.map((deck) => (deck.id === existingDeck.id ? { ...deck, score: sc } : deck));
          saveDecks(next);
          return next;
        };

        const existingInPrimaryLocalDecks = decks.some((deck) => deck.id === existingDeck.id);

	        if (soloRaidInProgress) {
          setDecks(updateLocalDecks(saveLocalDecks));
        } else if (!userId && existingInPrimaryLocalDecks) {
          setDecks(updateLocalDecks(saveLocalDecks));
        } else {
          setOffSeasonDecks(updateLocalDecks(saveLocalOffSeasonDecks));
        }
        showToast("덱 저장 완료");
      } else {
        const inserted: Deck = {
	          id: createLocalDeckId(),
	          raidKey: targetRaidKey,
	          deckKey: nextDeckKey,
          chars: [...draft],
          score: sc,
          createdAt: Date.now(),
        };
        const updateLocalDecks = (prev: Deck[]) => {
	          const existingIndex = prev.findIndex((deck) => deck.raidKey === targetRaidKey && deck.deckKey === nextDeckKey);
          const next =
            existingIndex >= 0
              ? prev.map((deck, index) => (index === existingIndex ? { ...deck, score: sc } : deck))
              : [inserted, ...prev];
	          if (soloRaidInProgress) {
            saveLocalDecks(next);
          } else {
            saveLocalOffSeasonDecks(next);
          }
          return next;
        };

	        if (soloRaidInProgress) {
          setDecks(updateLocalDecks);
        } else {
          setOffSeasonDecks(updateLocalDecks);
        }
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
    const parsed = parseBulk(text)
      .map((entry) => {
        const chars = resolveDeckChars(entry.chars, nikkeNameLookup);
        return chars ? { ...entry, chars } : null;
      })
      .filter((entry): entry is { chars: string[]; score: number } => entry !== null);

    if (parsed.length === 0) {
      showToast("맞는 덱이 없음.");
      return false;
    }
	    const targetRaidKey = soloRaidInProgress ? currentDeckRaidKey : SEASON_OFF_RAID_KEY;
	    if (!targetRaidKey) {
	      showToast("저장할 레이드 탭을 찾을 수 없어");
	      return false;
	    }

    const exists = new Set(
	      editableDecks
	        .filter((deck) => deck.raidKey === targetRaidKey)
	        .map((d) => `${d.score}|${d.chars.map(normToken).join("|")}`)
	    );
    const insertCandidates: Array<{ raidKey: string; chars: string[]; score: number }> = [];

    for (const p of parsed) {
      const key = `${p.score}|${p.chars.map(normToken).join("|")}`;
      if (exists.has(key)) continue;
	      insertCandidates.push({ raidKey: targetRaidKey, chars: p.chars, score: p.score });
      exists.add(key);
    }

    if (insertCandidates.length === 0) {
      showToast("추가할 새 덱이 없어.");
      return false;
    }

    try {
      let added: Deck[] = [];

	      if (soloRaidInProgress && userId) {
        const insertRows = insertCandidates.map((candidate) => ({
          user_id: userId,
          raid_key: candidate.raidKey,
          deck_key: buildDeckKey(candidate.chars),
          chars: candidate.chars,
          score: candidate.score,
        }));
        const { data, error } = await supabase
          .from("decks")
          .insert(insertRows)
          .select("id,user_id,raid_key,deck_key,chars,score,created_at");
        if (error) throw error;
        added = ((data ?? []) as DeckRow[]).map(mapDeckRow).filter((d): d is Deck => d !== null);
      } else {
        const now = Date.now();
        added = insertCandidates.map((candidate, index) => ({
          id: createLocalDeckId(),
          raidKey: candidate.raidKey,
          deckKey: buildDeckKey(candidate.chars),
          chars: [...candidate.chars],
          score: candidate.score,
          createdAt: now + index,
        }));
      }

      const updateLocalDecks = (prev: Deck[]) => {
        const next = [...added, ...prev];
	        if (!soloRaidInProgress) {
          saveLocalOffSeasonDecks(next);
        } else if (!userId) {
          saveLocalDecks(next);
        }
        return next;
      };

	      if (soloRaidInProgress && userId) {
        setDecks((prev) => [...added, ...prev]);
	      } else if (soloRaidInProgress) {
        setDecks(updateLocalDecks);
      } else {
        setOffSeasonDecks(updateLocalDecks);
      }
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
    const imagePath = `${slugifyStorageKey(trimmed) || "boss"}-${Date.now()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("boss-images")
        .upload(imagePath, imageFile, {
          cacheControl: STORAGE_IMAGE_CACHE_CONTROL_SECONDS,
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
        .eq("master_user_id", currentUserId)
        .select("master_user_id")
        .maybeSingle();

      if (error) throw error;

      await refreshAppConfig();
      await refreshSupabase(true);
      showToast("새 솔로레이드 추가 완료");
      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "솔로레이드 추가 실패";
      showToast(message);
      return false;
    }
  }

  async function addNikke(payload: AddNikkePayload) {
    const trimmedName = payload.name.trim();
    const aliases = Array.from(new Set(payload.aliases.map((alias) => alias.trim()).filter(Boolean)));
    const imagePath = payload.imagePath.trim();

    if (!isMaster) {
      showToast("마스터 계정만 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 가능");
      return false;
    }

    if (!trimmedName) {
      showToast("니케 이름을 입력해줘");
      return false;
    }

    if (!payload.burst || !payload.element || !payload.role) {
      showToast("버스트/속성/역할을 모두 선택해줘");
      return false;
    }

    if (!imagePath) {
      showToast("파일명을 입력해줘 (예: alice.webp)");
      return false;
    }

    try {
      const { error: upsertError } = await supabase.from("nikkes").upsert(
        {
          name: trimmedName,
          image_path: imagePath,
          burst: payload.burst,
          element: payload.element,
          role: payload.role,
          aliases,
        },
        { onConflict: "name" }
      );

      if (upsertError) throw upsertError;

      await refreshSupabase();
      showToast("니케 등록 완료");
      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "니케 등록 실패";
      showToast(message);
      return false;
    }
  }

  async function updateNikke(payload: {
    id: string;
    name: string;
    image_path: string | null;
    burst: number | null;
    aliases: string[];
    role: NikkeRole;
  }) {
    if (!isMasterUser) {
      showToast("마스터 계정만 가능");
      return false;
    }
    try {
      const { error } = await supabase
        .from("nikkes")
        .update({
          name: payload.name,
          image_path: payload.image_path,
          burst: payload.burst,
          aliases: payload.aliases,
          role: payload.role,
        })
        .eq("id", payload.id);

      if (error) throw error;
      await refreshSupabase();
      showToast("니케 수정 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("니케 수정 실패");
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
      const finalRaidKey =
        (configuredActiveRaidKey && deckTabs.some((tab) => tab.key === configuredActiveRaidKey) ? configuredActiveRaidKey : null) ??
        activeRaidKey;
      const finalLocalDecks =
        finalRaidKey
          ? cloneDecksForLocalStorage(decks.filter((deck) => deck.raidKey === finalRaidKey))
          : [];
      const archivedOffSeasonDecks = finalRaidKey
        ? [...finalLocalDecks, ...offSeasonDecks.filter((deck) => deck.raidKey !== finalRaidKey)]
        : offSeasonDecks;

	      if (currentUserId && finalRaidKey) {
	        await persistRecommendedDeckSnapshot(currentUserId, finalRaidKey, activeRaidLabel, recommendedDecks);
	        if (canRecommend) {
          const finalRecord: RecommendationRecord = {
            raidKey: finalRaidKey,
            raidLabel: activeRaidLabel,
            total: best.total,
            decks: best.picked.map((deck) => ({
              chars: [...deck.chars],
              score: deck.score,
            })),
            updatedAt: Date.now(),
          };
          await persistRecommendationRecord(currentUserId, finalRecord);
          setRecommendationHistory((prev) => ({
            ...prev,
            [finalRaidKey]: finalRecord,
	          }));
	        }
	      }

      if (finalRaidKey) {
        const endedAt = new Date().toISOString();
        const { count, error: countError } = await supabase
          .from(RAID_USER_STATS_TABLE)
          .select("client_id", { count: "exact", head: true })
          .eq("raid_key", finalRaidKey);
        if (countError) throw countError;

        const { error: archiveError } = await supabase.from(RAID_USER_ARCHIVES_TABLE).upsert(
          {
            raid_key: finalRaidKey,
            raid_label: activeRaidLabel || finalRaidKey,
            user_count: count ?? 0,
            ended_at: endedAt,
          },
          { onConflict: "raid_key" }
        );
        if (archiveError) throw archiveError;

        const { error: closeStatsError } = await supabase
          .from(RAID_USER_STATS_TABLE)
          .update({ ended_at: endedAt })
          .eq("raid_key", finalRaidKey)
          .is("ended_at", null);
        if (closeStatsError) throw closeStatsError;
      }
	
	      const { data, error } = await supabase
        .from("app_config")
        .update({
          solo_raid_active: false,
          active_raid_key: finalRaidKey,
        })
        .eq("master_user_id", currentUserId)
        .select("master_user_id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("app_config 업데이트 대상이 없어");

	      setOffSeasonDecks(archivedOffSeasonDecks);
	      saveLocalOffSeasonDecks(archivedOffSeasonDecks);
	      setOffSeasonRaidKey(SEASON_OFF_RAID_KEY);
      await refreshAppConfig();
      await refreshSupabase(false);
      showToast("솔로레이드 종료 완료");
      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "솔로레이드 종료 실패";
      showToast(message);
      return false;
    }
  }

  async function restartSoloRaid() {
    if (!canManageBosses) {
      showToast("마스터 계정만 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 가능");
      return false;
    }

	    const restartRaidKey =
	      (offSeasonRaidKey && offSeasonRaidKey !== SEASON_OFF_RAID_KEY ? offSeasonRaidKey : null) ??
	      (configuredActiveRaidKey && deckTabs.some((tab) => tab.key === configuredActiveRaidKey) ? configuredActiveRaidKey : null);
    if (!restartRaidKey) {
      showToast("재시작할 마지막 레이드가 없어");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("app_config")
        .update({
          solo_raid_active: true,
          active_raid_key: restartRaidKey,
        })
        .eq("master_user_id", currentUserId)
        .select("master_user_id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("app_config 업데이트 대상이 없어");

      await refreshAppConfig();
      await refreshSupabase(true);
      showToast("솔로레이드 재시작 완료");
      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "솔로레이드 재시작 실패";
      showToast(message);
      return false;
    }
  }

  async function saveRecommendedVideo(nextUrl: string) {
    if (!isMaster) {
      showToast("마스터 계정만 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 가능");
      return false;
    }

    const trimmed = nextUrl.trim();
    if (!trimmed) {
      showToast("유튜브 링크를 입력해줘");
      return false;
    }

    if (!extractYouTubeVideoId(trimmed)) {
      showToast("유효한 유튜브 링크가 아니야");
      return false;
    }

    try {
      const { error } = await supabase
        .from(SITE_SETTINGS_TABLE)
        .upsert(
          {
            key: RECOMMENDED_VIDEO_KEY,
            value: trimmed,
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
      setRecommendedVideoUrl(trimmed);
      showToast("추천 영상 저장 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("추천 영상 저장 실패");
      return false;
    }
  }

  async function saveRecommendedNikkes(nextNames: string[]) {
    if (!isMaster) {
      showToast("마스터 계정만 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 가능");
      return false;
    }

    const availableNames = new Set(nikkes.map((nikke) => nikke.name));
    const normalizedNames = normalizeRecommendedNikkeNames(nextNames).filter((name) => availableNames.has(name));

    try {
      const { error } = await supabase
        .from(SITE_SETTINGS_TABLE)
        .upsert(
          {
            key: RECOMMENDED_NIKKES_KEY,
            value: JSON.stringify(normalizedNames),
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
      setRecommendedNikkeNames(normalizedNames);
      showToast("추천 니케 저장 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("추천 니케 저장 실패");
      return false;
    }
  }

  async function saveLegalText(key: typeof TERMS_TEXT_KEY | typeof PRIVACY_TEXT_KEY, nextText: string) {
    if (!isMaster) {
      showToast("마스터 계정만 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 가능");
      return false;
    }

    const trimmed = nextText.trim();
    if (!trimmed) {
      showToast("내용을 입력해줘");
      return false;
    }

    setSavingLegalTextKey(key);
    try {
      const { error } = await supabase
        .from(SITE_SETTINGS_TABLE)
        .upsert(
          {
            key,
            value: trimmed,
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
      if (key === TERMS_TEXT_KEY) {
        setTermsText(trimmed);
      } else {
        setPrivacyText(trimmed);
      }
      showToast("문서 저장 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("문서 저장 실패");
      return false;
    } finally {
      setSavingLegalTextKey(null);
    }
  }

  async function submitSoloRaidTip(payload: { content: string }) {
    const trimmedContent = payload.content.trim();
    const targetRaidKey = selectedTipRaidKey && selectedTipRaidKey !== SEASON_OFF_RAID_KEY ? selectedTipRaidKey : null;

    if (!targetRaidKey) {
      showToast("현재 솔로레이드가 없어");
      return false;
    }

    if (!trimmedContent) {
      showToast("내용을 입력해줘");
      return false;
    }

    if (process.env.NODE_ENV !== "production" && !userId) {
      const nextTip: SoloRaidTip = {
        id: createLocalTipId(),
        raidKey: targetRaidKey,
        content: trimmedContent,
        userId: DEV_LOCAL_TIP_USER_ID,
        createdAt: Date.now(),
        source: "local",
      };

      const nextTips = [nextTip, ...loadLocalTips()];
      saveLocalTips(nextTips);
      setSoloRaidTips((prev) => [nextTip, ...prev]);
      showToast("로컬 테스트 글 저장 완료");
      return true;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 작성 가능");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from(SOLO_RAID_TIPS_TABLE)
        .insert({
          raid_key: targetRaidKey,
          content: trimmedContent,
          user_id: currentUserId,
        })
        .select("id,raid_key,content,user_id,created_at")
        .single();

      if (error) throw error;

      const inserted = mapSoloRaidTipRow(data as SoloRaidTipRow);
      if (!inserted) throw new Error("Invalid solo raid tip row");

      setSoloRaidTips((prev) => [inserted, ...prev]);
      showToast("솔레 팁 등록 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("솔레 팁 등록 실패");
      return false;
    }
  }

  async function updateSoloRaidTip(payload: { id: string; content: string }) {
    const trimmedContent = payload.content.trim();

    if (!trimmedContent) {
      showToast("내용을 입력해줘");
      return false;
    }

    if (process.env.NODE_ENV !== "production" && !userId) {
      const localTips = loadLocalTips();
      const target = localTips.find((tip) => tip.id === payload.id);
      if (!target) {
        showToast("수정할 글을 찾을 수 없어");
        return false;
      }

      const nextTips = localTips.map((tip) =>
        tip.id === payload.id
          ? {
            ...tip,
            content: trimmedContent,
          }
          : tip
      );
      saveLocalTips(nextTips);
      setSoloRaidTips((prev) => prev.map((tip) => (tip.id === payload.id ? { ...tip, content: trimmedContent } : tip)));
      showToast("로컬 테스트 글 수정 완료");
      return true;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 수정 가능");
      return false;
    }

    try {
      let query = supabase
        .from(SOLO_RAID_TIPS_TABLE)
        .update({
          content: trimmedContent,
        })
        .eq("id", payload.id);

      if (!isMasterUser) {
        query = query.eq("user_id", currentUserId);
      }

      const { data, error } = await query
        .select("id,raid_key,content,user_id,created_at")
        .single();

      if (error) throw error;

      const updated = mapSoloRaidTipRow(data as SoloRaidTipRow);
      if (!updated) throw new Error("Invalid solo raid tip row");

      setSoloRaidTips((prev) => prev.map((tip) => (tip.id === payload.id ? updated : tip)));
      showToast("글 수정 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("글 수정 실패");
      return false;
    }
  }

  async function deleteSoloRaidTip(id: string) {
    if (process.env.NODE_ENV !== "production" && !userId) {
      const nextTips = loadLocalTips().filter((tip) => tip.id !== id);
      saveLocalTips(nextTips);
      setSoloRaidTips((prev) => prev.filter((tip) => tip.id !== id));
      showToast("로컬 테스트 글 삭제 완료");
      return true;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 삭제 가능");
      return false;
    }

    try {
      let query = supabase
        .from(SOLO_RAID_TIPS_TABLE)
        .delete()
        .eq("id", id);

      if (!isMasterUser) {
        query = query.eq("user_id", currentUserId);
      }

      const { error } = await query;

      if (error) throw error;

      setSoloRaidTips((prev) => prev.filter((tip) => tip.id !== id));
      showToast("글 삭제 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("글 삭제 실패");
      return false;
    }
  }

  async function submitContactInquiry(payload: { content: string }) {
    const trimmedContent = payload.content.trim();

    if (!trimmedContent) {
      showToast("문의 내용을 입력해줘");
      return false;
    }

    if (process.env.NODE_ENV !== "production" && !userId) {
      const nextInquiry: ContactInquiry = {
        id: createLocalTipId(),
        content: trimmedContent,
        userId: null,
        createdAt: Date.now(),
        source: "local",
      };

      const nextInquiries = [nextInquiry, ...loadLocalContactInquiries()];
      saveLocalContactInquiries(nextInquiries);
      setContactInquiries((prev) => [nextInquiry, ...prev]);
      showToast("로컬 문의 저장 완료");
      return true;
    }

    try {
      const currentUserId = userId ? await getCurrentUserId() : null;
      const insertPayload = {
        content: trimmedContent,
        user_id: currentUserId,
      };

      if (isMasterUser) {
        const { data, error } = await supabase
          .from(CONTACT_INQUIRIES_TABLE)
          .insert(insertPayload)
          .select("id,content,user_id,created_at")
          .single();

        if (error) throw error;

        const inserted = mapContactInquiryRow(data as ContactInquiryRow);
        if (!inserted) throw new Error("Invalid contact inquiry row");
        setContactInquiries((prev) => [inserted, ...prev]);
      } else {
        const { error } = await supabase.from(CONTACT_INQUIRIES_TABLE).insert(insertPayload);
        if (error) throw error;
      }

      showToast("문의 전송 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("문의 전송 실패");
      return false;
    }
  }

  async function deleteContactInquiry(id: string) {
    if (process.env.NODE_ENV !== "production" && !userId) {
      const nextInquiries = loadLocalContactInquiries().filter((inquiry) => inquiry.id !== id);
      saveLocalContactInquiries(nextInquiries);
      setContactInquiries((prev) => prev.filter((inquiry) => inquiry.id !== id));
      showToast("로컬 문의 삭제 완료");
      return true;
    }

    if (!isMasterUser) {
      showToast("마스터 계정만 삭제 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 삭제 가능");
      return false;
    }

    try {
      const { error } = await supabase
        .from(CONTACT_INQUIRIES_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw error;

      setContactInquiries((prev) => prev.filter((inquiry) => inquiry.id !== id));
      showToast("문의 삭제 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("문의 삭제 실패");
      return false;
    }
  }

  async function submitUsagePost(payload: AddUsagePostPayload) {
    const existingPost = usagePosts[0] ?? null;

    if (!isMasterUser) {
      showToast("마스터 계정만 작성 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 작성 가능");
      return false;
    }

    if (!USAGE_BOARD_TABS.some((tab) => tab.key === payload.categoryKey)) {
      showToast("게시판 탭 정보가 올바르지 않아");
      return false;
    }

    if (payload.blocks.length === 0) {
      showToast("본문 블록을 하나 이상 추가해줘");
      return false;
    }

    const hasMeaningfulBlock = payload.blocks.some((block) =>
      block.type === "text" ? block.content.trim().length > 0 : Boolean(block.file || block.imagePath.trim())
    );
    if (!hasMeaningfulBlock) {
      showToast("본문 내용을 입력해줘");
      return false;
    }

    setSavingUsagePost(true);
    try {
      const nextBlocks: UsageBlock[] = [];

      for (const block of payload.blocks) {
        if (block.type === "text") {
          if (!block.content.trim()) continue;
          nextBlocks.push({
            id: block.id,
            type: "text",
            content: block.content,
            fontSize: block.fontSize,
          });
          continue;
        }

        let imagePath = block.imagePath;
        if (block.file) {
          const extension = block.file.name.includes(".")
            ? block.file.name.split(".").pop()?.toLowerCase() ?? "png"
            : "png";
          imagePath = `${payload.categoryKey}/usage-blocks/${block.id}-${Date.now()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("usage-board-images")
            .upload(imagePath, block.file, {
              cacheControl: STORAGE_IMAGE_CACHE_CONTROL_SECONDS,
              upsert: false,
            });

          if (uploadError) throw uploadError;
        }

        if (!imagePath.trim()) continue;
        nextBlocks.push({
          id: block.id,
          type: "image",
          imagePath,
          caption: block.caption.trim(),
        });
      }

      if (nextBlocks.length === 0) {
        showToast("저장할 블록이 없어");
        return false;
      }

      let data: UsagePostRow | null = null;

      if (existingPost?.categoryKey === payload.categoryKey) {
        const response = await supabase
          .from(USAGE_POSTS_TABLE)
          .update({
            title: null,
            blocks: nextBlocks,
            user_id: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPost.id)
          .select("id,category_key,title,blocks,user_id,created_at,updated_at")
          .single();

        if (response.error) throw response.error;
        data = response.data as UsagePostRow;
      } else {
        const response = await supabase
          .from(USAGE_POSTS_TABLE)
          .insert({
            category_key: payload.categoryKey,
            title: null,
            blocks: nextBlocks,
            user_id: currentUserId,
          })
          .select("id,category_key,title,blocks,user_id,created_at,updated_at")
          .single();

        if (response.error) throw response.error;
        data = response.data as UsagePostRow;
      }

      const inserted = mapUsagePostRow(data);
      if (!inserted) throw new Error("Invalid usage post row");

      const oldImagePaths = new Set(existingPost ? getUsageImagePaths(existingPost.blocks) : []);
      const nextImagePaths = new Set(getUsageImagePaths(inserted.blocks));
      const removedImagePaths = [...oldImagePaths].filter((path) => !nextImagePaths.has(path));
      if (removedImagePaths.length > 0) {
        const { error: removeError } = await supabase.storage.from("usage-board-images").remove(removedImagePaths);
        if (removeError) {
          console.error(removeError);
        }
      }

      if (inserted.categoryKey === usageBoardTab) {
        setUsagePosts([inserted]);
      }

      showToast(existingPost ? "사용법 게시글 수정 완료" : "사용법 게시글 등록 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast(existingPost ? "사용법 게시글 수정 실패" : "사용법 게시글 등록 실패");
      return false;
    } finally {
      setSavingUsagePost(false);
    }
  }

  async function deleteUsagePost(id: string) {
    if (!isMasterUser) {
      showToast("마스터 계정만 삭제 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 삭제 가능");
      return false;
    }

    setDeletingUsagePostId(id);
    try {
      const target = usagePosts.find((post) => post.id === id) ?? null;

      const { error } = await supabase
        .from(USAGE_POSTS_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw error;

      const targetPaths = target ? getUsageImagePaths(target.blocks) : [];
      if (targetPaths.length > 0) {
        const { error: storageError } = await supabase.storage.from("usage-board-images").remove(targetPaths);
        if (storageError) {
          console.error(storageError);
        }
      }

      setUsagePosts((prev) => prev.filter((post) => post.id !== id));
      showToast("사용법 게시글 삭제 완료");
      return true;
    } catch (error) {
      console.error(error);
      showToast("사용법 게시글 삭제 실패");
      return false;
    } finally {
      setDeletingUsagePostId(null);
    }
  }

  async function submitNoticePost(payload: { id?: string; title: string; content: string }) {
    if (!isMasterUser) {
      showToast("마스터 계정만 작성 가능");
      return false;
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      showToast("로그인 후 작성 가능");
      return false;
    }

    const title = payload.title.trim();
    const content = payload.content.trim();
    if (!title || !content) {
      showToast("제목과 내용을 입력해줘");
      return false;
    }

    setSavingNoticePost(true);
    try {
      let data: NoticePostRow | null = null;

      if (payload.id) {
        const response = await supabase
          .from(NOTICE_POSTS_TABLE)
          .update({
            title,
            content,
            user_id: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.id)
          .select("id,title,content,user_id,created_at,updated_at")
          .single();

        if (response.error) throw response.error;
        data = response.data as NoticePostRow;
      } else {
        const response = await supabase
          .from(NOTICE_POSTS_TABLE)
          .insert({
            title,
            content,
            user_id: currentUserId,
          })
          .select("id,title,content,user_id,created_at,updated_at")
          .single();

        if (response.error) throw response.error;
        data = response.data as NoticePostRow;
      }

      const saved = data ? mapNoticePostRow(data) : null;
      if (!saved) throw new Error("공지 저장 결과를 읽을 수 없습니다.");

      setNoticePosts((prev) => {
        const withoutSaved = prev.filter((post) => post.id !== saved.id);
        return [saved, ...withoutSaved].sort((a, b) => b.createdAt - a.createdAt);
      });
      showToast(payload.id ? "공지 수정 완료" : "공지 등록 완료");
      return true;
    } catch (error) {
      console.error(error);
      const detail =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error && typeof error.message === "string"
            ? error.message
            : "";
      showToast(
        detail
          ? `${payload.id ? "공지 수정 실패" : "공지 등록 실패"}: ${detail}`
          : payload.id
            ? "공지 수정 실패"
            : "공지 등록 실패"
      );
      return false;
    } finally {
      setSavingNoticePost(false);
    }
  }

  async function deleteNoticePost(id: string) {
    if (!isMasterUser) {
      showToast("마스터 계정만 삭제 가능");
      return false;
    }

    setDeletingNoticePostId(id);
    try {
      const { error } = await supabase.from(NOTICE_POSTS_TABLE).delete().eq("id", id);
      if (error) throw error;

      setNoticePosts((prev) => prev.filter((post) => post.id !== id));
      showToast("공지 삭제 완료");
      return true;
    } catch (error) {
      console.error(error);
      const detail =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error && typeof error.message === "string"
            ? error.message
            : "";
      showToast(detail ? `공지 삭제 실패: ${detail}` : "공지 삭제 실패");
      return false;
    } finally {
      setDeletingNoticePostId(null);
    }
  }

  return (
    <div suppressHydrationWarning className={`theme-${themeMode} ${themeMode === "dark" ? "dark" : ""} min-h-screen bg-[var(--bg)] text-[var(--text)]`}>
      <div className="mx-auto max-w-xl px-4 pb-10 pt-6 sm:px-4 lg:max-w-7xl lg:px-8 lg:pt-4">
        {/* Header */}
        <Header
          tab={tab}
          shouldShowCalculator={shouldShowCalculator}
          onTabChange={navigateToTab}
          onProfileClick={handleProfileClick}
        />

        {/* Toast */}
        {toast && (
          <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl bg-neutral-800 px-4 py-2 text-sm shadow">
            {toast}
          </div>
        )}

        {showInitialDataLoading && (
          <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-300">
            니케/보스 정보를 불러오는 중…
          </div>
        )}
        {showInitialDeckLoading && (
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

        {isLegalPage && tab !== "mypage" ? (
          isNoticePage ? (
            <NoticeContent
              posts={noticePosts}
              loading={loadingNoticePosts}
              isMaster={isMaster}
              saving={savingNoticePost}
              deletingId={deletingNoticePostId}
              onSubmit={submitNoticePost}
              onDelete={deleteNoticePost}
            />
          ) : isTermsPage ? (
            <TermsContent
              content={termsText}
              canEdit={isMaster}
              saving={savingLegalTextKey === TERMS_TEXT_KEY}
              onSave={(nextText) => saveLegalText(TERMS_TEXT_KEY, nextText)}
            />
          ) : isPrivacyPage ? (
            <PrivacyContent
              content={privacyText}
              canEdit={isMaster}
              saving={savingLegalTextKey === PRIVACY_TEXT_KEY}
              onSave={(nextText) => saveLegalText(PRIVACY_TEXT_KEY, nextText)}
            />
          ) : (
            <LicenseContent />
          )
        ) : (
          <>
            {tab === "home" && (
              <HomeTab
                boss={boss}
                bosses={bosses}
	                decksCount={activeRaidDecks.length}
	                canRecommend={canRecommend}
	                showMyRecommendation={soloRaidInProgress}
	                best={best}
                fmt={fmt}
                getPublicUrl={getPublicUrl}
                selectedNames={selectedNames}
                selectedNikkes={selectednikkes}
                maxSelected={MAX_SELECTED}
                nikkeMap={nikkeMap}
                editRequest={homeEditRequest}
                onEditRequestConsumed={() => setHomeEditRequest(null)}
                onResetSelected={resetSelected}
                onRemoveSelectedNikke={removeSelectedNikke}
                onGoToSettings={() => navigateToTab("settings")}
                onShowToast={showToast}
                onSubmitDeck={submitDeckFromHome}
                onSubmitBulk={submitBulkFromHome}
                onUpdateDeckScore={updateDeckScore}
              />
            )}

        {tab === "saved" && (
          <div className="mx-auto w-full lg:max-w-6xl">
            <SavedTab
              visibleSavedDecks={visibleSavedDecks}
	              deckTabs={savedDeckTabs}
	              seasonOffTab={!soloRaidInProgress ? { key: SEASON_OFF_RAID_KEY, label: SEASON_OFF_TAB_LABEL } : null}
	              savedDeckTab={currentDeckRaidKey ?? ""}
              readOnly={!soloRaidInProgress && currentDeckRaidKey !== SEASON_OFF_RAID_KEY}
	              onSavedDeckTabChange={(key) => {
	                if (soloRaidInProgress) {
	                  setActiveRaidKey(key);
	                } else {
	                  setOffSeasonRaidKey(key);
	                }
	              }}
              onUpdateDeckScore={updateDeckScore}
              onUpdateDeckChars={updateDeckChars}
              onDeleteDeck={deleteDeck}
              onDeleteAllDecks={deleteAllVisibleSavedDecks}
              onCopyDeckToBuilder={copySavedDeckToBuilder}
              allNikkeNames={nikkes.map((nikke) => nikke.name)}
              nikkeMap={nikkeMap}
              getPublicUrl={getPublicUrl}
              fmt={fmt}
            />
          </div>
        )}

        {tab === "settings" && (
          <div className="mx-auto w-full pt-2 lg:max-w-6xl lg:pt-3">
            <SettingsTab
              nikkes={nikkes}
              selectedNames={selectedNames}
              toggleSelect={toggleSelect}
              setSelectedNames={setSelectedNames}
              favoriteNames={favoriteNames}
              onToggleFavorite={toggleFavorite}
              recommendedNames={recommendedNikkeNames}
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
              onResetFilters={resetFilters}
            />
          </div>
        )}

        {tab === "recommend" && (
          <div className="mx-auto w-full lg:max-w-6xl">
	            <RecommendTab
	              raidLabel={recommendRaidLabel}
	              raidKey={selectedRecommendRaidKey ?? ""}
	              tipRaidLabel={tipRaidLabel}
	              tipRaidKey={selectedTipRaidKey ?? ""}
	              deckTabs={savedDeckTabs}
	              recommendDeckTab={selectedRecommendRaidKey ?? ""}
	              tipDeckTab={selectedTipRaidKey ?? ""}
	              soloRaidActive={soloRaidInProgress}
	              onRecommendDeckTabChange={(key) => setRecommendRaidKey(key)}
	              onTipDeckTabChange={(key) => setTipRaidKey(key)}
              recommendedDecks={displayedRecommendedDecks}
              loadingRecommendedDecks={loadingCommunityRaidDecks || (!soloRaidInProgress && loadingRecommendedDeckSnapshots)}
              videoEmbedUrl={toYouTubeEmbedUrl(recommendedVideoUrl)}
              tips={soloRaidTips}
              loadingTips={loadingSoloRaidTips}
              currentUserId={userId}
              isMaster={isMaster}
              canWriteTips={Boolean(userId) || process.env.NODE_ENV !== "production"}
              editorUserId={userId ?? (process.env.NODE_ENV !== "production" ? DEV_LOCAL_TIP_USER_ID : null)}
              onSubmitTip={submitSoloRaidTip}
              onUpdateTip={updateSoloRaidTip}
              onDeleteTip={deleteSoloRaidTip}
              onCopyDeckToBuilder={copyRecommendedDeckToBuilder}
              onCopyDecksToBuilder={copyRecommendedDecksToBuilder}
              nikkeMap={nikkeMap}
              getPublicUrl={getPublicUrl}
              fmt={fmt}
            />
          </div>
        )}

        {tab === "imaginary" && (
          <div className="mx-auto w-full lg:max-w-6xl">
            <ImaginarySoloRaidTab
	              decksCount={activeRaidDecks.length}
	              canRecommend={canRecommend}
	              showMyRecommendation={soloRaidInProgress}
	              best={best}
              scoreDisplayMode={scoreDisplayMode}
              onScoreDisplayModeChange={updateScoreDisplayMode}
              selectedNames={selectedNames}
              selectedNikkes={selectednikkes}
              maxSelected={MAX_SELECTED}
              nikkeMap={nikkeMap}
              getPublicUrl={getPublicUrl}
              onResetSelected={resetSelected}
              onRemoveSelectedNikke={removeSelectedNikke}
              onGoToSettings={() => navigateToTab("settings")}
              onShowToast={showToast}
              onSubmitDeck={submitDeckFromHome}
              onUpdateDeckScore={updateDeckScore}
            />
          </div>
        )}

        {tab === "usage" && (
          <div className="mx-auto w-full lg:max-w-6xl">
            <UsageTab
              tabs={USAGE_BOARD_TABS}
              activeTab={usageBoardTab}
              onTabChange={(key) => setUsageBoardTab(key as UsageBoardCategoryKey)}
              posts={usagePosts}
              loadingPosts={loadingUsagePosts}
              isMaster={isMaster}
              savingPost={savingUsagePost}
              deletingPostId={deletingUsagePostId}
              onSubmitPost={submitUsagePost}
              onDeletePost={deleteUsagePost}
              getPublicUrl={getPublicUrl}
            />
          </div>
        )}

        {tab === "calculator" && shouldShowCalculator && (
          <div className="mx-auto w-full lg:max-w-6xl">
            <CalculatorTab />
          </div>
        )}

        {tab === "contact" && (
          <div className="mx-auto w-full lg:max-w-6xl">
            <ContactTab onSubmitInquiry={submitContactInquiry} />
          </div>
        )}

        {tab === "mypage" && (
          <MyPageTab
            deckTabs={deckTabs}
            isMaster={isMaster}
            showBossManagement={canManageBosses}
            recommendationHistory={recommendationHistory}
            onlineUserCount={onlineUserCount}
            totalUserCount={totalUserCount}
            bossUserStats={bossUserStats}
            loadingUserStats={loadingUserStats}
            soloRaidActive={soloRaidActive}
            onSyncNikkes={onSyncBucket}
            syncingNikkes={syncing}
            onAddNikke={addNikke}
            onUpdateNikke={updateNikke}
            nikkes={nikkes}
            recommendedNikkeNames={recommendedNikkeNames}
            onSaveRecommendedNikkes={saveRecommendedNikkes}
            elements={elements}
            roles={roles}
            getPublicUrl={getPublicUrl}
            onAddSoloRaid={addSoloRaid}
            onEndSoloRaid={endSoloRaid}
            onRestartSoloRaid={restartSoloRaid}
            recommendedVideoUrl={recommendedVideoUrl}
            onSaveRecommendedVideo={saveRecommendedVideo}
            inquiries={contactInquiries}
            loadingInquiries={loadingContactInquiries}
            showInquirySection={canManageBosses}
            onDeleteInquiry={deleteContactInquiry}
            fmt={fmt}
            scoreDisplayMode={scoreDisplayMode}
            onScoreDisplayModeChange={updateScoreDisplayMode}
            themeMode={themeMode}
            onThemeModeChange={updateThemeMode}
            persistSession={persistSessionState}
            onPersistSessionChange={updatePersistSession}
          />
        )}
          </>
        )}
      </div>
      <footer className="border-t border-neutral-800 bg-neutral-900/80 px-4 py-6 text-center text-xs leading-6 text-neutral-500">
        <div className="mx-auto max-w-4xl space-y-3">
          <p>© 2025 Nikkesolo. All rights reserved.</p>
          <p>
            본 사이트는 &apos;승리의 여신: 니케&apos;의 비공식 팬 사이트이며, Shift Up Corp. 및 Level
            Infinite와 무관합니다.
          </p>
          <p>
            사이트 내 모든 게임 리소스의 저작권은 원작자에게 있으며, 영리 목적으로 사용되지 않습니다.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-neutral-400">
            <Link href="/terms" className="transition hover:text-neutral-200">
              이용약관
            </Link>
            <Link href="/privacy" className="transition hover:text-neutral-200">
              개인정보처리방침
            </Link>
            <Link href="/license" className="transition hover:text-neutral-200">
              라이센스
            </Link>
            <Link href="/notice" className="transition hover:text-neutral-200">
              공지사항
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

