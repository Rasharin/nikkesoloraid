import "server-only";

import { createHash } from "node:crypto";
import {
  mapBlaBlaLinkCharacters,
  isBlaBlaLinkPrivacyCode,
  type BlaBlaLinkCharacterSource,
} from "../blablalink";
import {
  BLABLALINK_SERVERS,
  resolveBlaBlaLinkArea,
  type BlaBlaLinkServerKey,
} from "../blablalink/constants";
import { buildBlaBlaLinkMappingCandidates } from "../blablalink-mapping";

const API_BASE = "https://api.blablalink.com/api/game/proxy/";
const CDN_BASE = "https://sg-tools-cdn.blablalink.com";
const SCRAPED_DATA_URL = "https://raw.githubusercontent.com/Jgaram/nikke-calc/master/scraper/nikke_scraped.json";
const LARGE_PRIMES = [224737, 1000639, 2654435761, 2654435769, 1000621, 4294967291] as const;
const COMMON_PARAMS = { game_id: "29080", area_id: "global", source: "pc_web", intl_game_id: "29080", language: "ko", env: "prod" };

export class BlaBlaLinkError extends Error {
  constructor(
    public code: "AUTH" | "ACCOUNT" | "PRIVATE" | "API" | "NETWORK" | "CONFIG",
    message: string,
    public upstreamCode?: number,
  ) {
    super(message);
  }
}

export function getBlaBlaLinkServerSessionCookie() {
  const cookie = process.env.BLABLALINK_COOKIE?.trim() ?? "";
  const hasGameToken = /(?:^|;\s*)game_token=[^;\s]+/.test(cookie);
  const hasGameOpenId = /(?:^|;\s*)game_openid=[^;\s]+/.test(cookie);
  if (!cookie || /[\r\n]/.test(cookie) || !hasGameToken || !hasGameOpenId) {
    throw new BlaBlaLinkError("CONFIG", "현재 블라블라링크 연결을 사용할 수 없습니다. 잠시 후 다시 시도해주세요.");
  }
  return cookie;
}

function djb2(value: string, seed: number) {
  let result = seed | 0;
  for (const character of value) result = Math.imul(result, 33) + character.charCodeAt(0) | 0;
  return result;
}

function cdnUrl(path: string) {
  const plain = path.replace(/^\/+/, "");
  const segments = plain.split("/").filter(Boolean);
  return `${CDN_BASE}/${segments.map((segment, index) => {
    if (index === segments.length - 1) {
      const extension = segment.split(".").slice(1).join(".");
      return `${createHash("md5").update(plain).digest("hex")}.${extension}`;
    }
    const prime = LARGE_PRIMES[index];
    const hash = djb2(plain, prime);
    const remainder = ((hash % prime) + prime) % prime;
    const letters = String.fromCharCode(97 + Math.floor(remainder / 26) % 26, 97 + remainder % 26);
    return `${letters}-${String(remainder % 99).padStart(2, "0")}`;
  }).join("/")}`;
}

async function postApi(route: string, body: object, cookie: string) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Origin: "https://www.blablalink.com",
        Referer: "https://www.blablalink.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36",
        "X-Channel-Type": "2",
        "X-Language": "ko",
        "X-Common-Params": JSON.stringify(COMMON_PARAMS),
        Cookie: cookie,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new BlaBlaLinkError("NETWORK", "BlaBlaLink 네트워크 연결에 실패했습니다.");
  }
  const payload = await response.json().catch(() => null) as { code?: number; msg?: string; data?: Record<string, unknown> } | null;
  if (!response.ok || !payload) throw new BlaBlaLinkError("API", "BlaBlaLink API 응답을 확인할 수 없습니다.");
  if (payload.code === 300001) throw new BlaBlaLinkError("AUTH", "현재 블라블라링크 연결을 사용할 수 없습니다. 잠시 후 다시 시도해주세요.", payload.code);
  if (payload.code !== 0) throw new BlaBlaLinkError("API", "블라블라링크 서비스 응답을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.", payload.code);
  return payload.data ?? {};
}

function createCookieShape(cookie: string) {
  const pairs = cookie.split(";").map((part) => part.trim()).filter(Boolean);
  const names = pairs.map((part) => part.split("=")[0]);
  return {
    length: cookie.length,
    cookies: names.length,
    hasGameToken: names.includes("game_token"),
    hasGameOpenId: names.includes("game_openid"),
  };
}

export async function getBlaBlaLinkSessionHealth() {
  const cookie = process.env.BLABLALINK_COOKIE?.trim() ?? "";
  const shape = createCookieShape(cookie);
  if (!cookie) return { shape, upstream: null };
  try {
    const response = await fetch(
      "https://api.blablalink.com/api/ugc/proxy/standalonesite/User/GetUserInfoNew",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          Origin: "https://www.blablalink.com",
          Referer: "https://www.blablalink.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36",
          "X-Channel-Type": "2",
          "X-Language": "ko",
          "X-Common-Params": JSON.stringify(COMMON_PARAMS),
          Cookie: cookie,
        },
        body: "{}",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const payload = await response.json().catch(() => null) as { code?: number; msg?: string; data?: { info?: { intl_openid?: string } } } | null;
    return {
      shape,
      upstream: payload ? {
        httpStatus: response.status,
        code: payload.code ?? null,
        msg: payload.msg ?? "",
        openidTail: payload.data?.info?.intl_openid ? String(payload.data.info.intl_openid).slice(-4) : null,
      } : { httpStatus: response.status, code: null, msg: "invalid json", openidTail: null },
    };
  } catch (error) {
    return { shape, upstream: { httpStatus: null, code: null, msg: error instanceof Error ? error.message : "network error", openidTail: null } };
  }
}

async function loadCharacterMaps(nikkes: readonly { id: string; name: string; resource_id: number | null }[]) {
  const idMapResponse = await fetch(cdnUrl("/character/character_id_map.json"), { next: { revalidate: 86400 } });
  if (!idMapResponse.ok) throw new BlaBlaLinkError("API", "캐릭터 매핑 데이터를 불러오지 못했습니다.");
  const idRows = await idMapResponse.json() as Array<{ name_code: number; resource_id: number }>;
  const resourceIdByNameCode = new Map(idRows.map((row) => [Number(row.name_code), Number(row.resource_id)]));
  const nikkeIdByResourceId = new Map<number, string>();
  for (const nikke of nikkes) if (nikke.resource_id !== null) nikkeIdByResourceId.set(Number(nikke.resource_id), nikke.id);
  return { resourceIdByNameCode, nikkeIdByResourceId };
}

export async function fetchBlaBlaLinkMappingCandidates() {
  const [idMapResponse, scrapedResponse] = await Promise.all([
    fetch(cdnUrl("/character/character_id_map.json"), { next: { revalidate: 86400 } }),
    fetch(SCRAPED_DATA_URL, { next: { revalidate: 86400 } }),
  ]);
  if (!idMapResponse.ok || !scrapedResponse.ok) throw new BlaBlaLinkError("API", "캐릭터 매핑 후보 데이터를 불러오지 못했습니다.");
  const idRows = await idMapResponse.json() as Array<{ name_code: number; resource_id: number }>;
  const scraped = await scrapedResponse.json() as Record<string, { id?: number; name?: string }>;
  return buildBlaBlaLinkMappingCandidates(scraped, idRows);
}

export async function fetchBlaBlaLinkProfile(input: {
  server: BlaBlaLinkServerKey;
  openId: string;
  sessionCookie: string;
  nikkes: readonly { id: string; name: string; resource_id: number | null }[];
}) {
  if (!BLABLALINK_SERVERS.some((server) => server.key === input.server)) {
    throw new BlaBlaLinkError("CONFIG", "선택한 서버가 올바르지 않습니다.");
  }
  const cookie = input.sessionCookie;
  const openId = input.openId.trim();
  let sawPrivacyResponse = false;
  const resolvedArea = await resolveBlaBlaLinkArea(input.server, async (candidateAreaId) => {
    let characterData: Record<string, unknown>;
    try {
      characterData = await postApi(
        "Game/GetUserCharacters",
        { intl_open_id: openId, nikke_area_id: candidateAreaId },
        cookie
      );
    } catch (error) {
      if (error instanceof BlaBlaLinkError && error.code === "API" && isBlaBlaLinkPrivacyCode(error.upstreamCode)) {
        sawPrivacyResponse = true;
        return [];
      }
      throw error;
    }
    return Array.isArray(characterData.characters)
      ? characterData.characters as BlaBlaLinkCharacterSource[]
      : [];
  });
  if (!resolvedArea) {
    throw new BlaBlaLinkError(sawPrivacyResponse ? "PRIVATE" : "ACCOUNT", "프로필 정보를 확인할 수 없습니다. 프로필 공개 상태와 링크를 확인해주세요.");
  }
  const { areaId, value: sourceCharacters } = resolvedArea;
  const requestBase = { intl_open_id: openId, nikke_area_id: areaId };
  const nameCodes = sourceCharacters.map((character) => character.name_code);
  const characterDetails: Array<Record<string, unknown>> = [];
  for (let index = 0; index < nameCodes.length; index += 60) {
    const detailsData = await postApi("Game/GetUserCharacterDetails", {
      ...requestBase,
      name_codes: nameCodes.slice(index, index + 60),
    }, cookie);
    if (Array.isArray(detailsData.character_details)) {
      characterDetails.push(...detailsData.character_details as Array<Record<string, unknown>>);
    }
  }
  let outpostData: Record<string, unknown> = {};
  try {
    outpostData = await postApi("Game/GetUserProfileOutpostInfo", requestBase, cookie);
  } catch (error) {
    if (error instanceof BlaBlaLinkError && error.code === "AUTH") throw error;
  }
  const outpostInfo = outpostData.outpost_info && typeof outpostData.outpost_info === "object"
    ? outpostData.outpost_info as Record<string, unknown>
    : {};
  const synchroLevel = Number(outpostInfo.synchro_level);
  if (!Number.isInteger(synchroLevel) || synchroLevel <= 0) {
    throw new BlaBlaLinkError("PRIVATE", "프로필 정보를 확인할 수 없습니다. 프로필 공개 상태와 링크를 확인해주세요.");
  }
  const maps = await loadCharacterMaps(input.nikkes);
  const mapped = mapBlaBlaLinkCharacters(sourceCharacters, maps.resourceIdByNameCode, maps.nikkeIdByResourceId);
  const detailsByNameCode = new Map(characterDetails.map((detail) => [Number(detail.name_code), detail]));
  return {
    ...mapped,
    characters: mapped.characters.map((character) => ({
      ...character,
      details: detailsByNameCode.get(character.nameCode) ?? {},
    })),
    synchroLevel,
    areaId,
  };
}

export function hashGameOpenId(gameOpenId: string) {
  return createHash("sha256").update(gameOpenId.trim()).digest("hex");
}
