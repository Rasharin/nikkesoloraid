const API = "https://api.blablalink.com/api/game/proxy/";
export const COMMON = {
  game_id: "16",
  area_id: "global",
  source: "pc_web",
  intl_game_id: "29080",
  language: "ko",
  env: "prod",
  data_statistics_scene: "outer",
  data_statistics_page_id: "https://www.blablalink.com/",
  data_statistics_client_type: "pc_web",
  data_statistics_lang: "ko",
};
const AREAS = [83, 81, 84, 82, 85];
const PRIVACY_CODES = new Set([1301002, 1303002]);

export function normalizeCookie(value) {
  let cookie = String(value ?? "").trim();
  cookie = cookie.replace(/^--?b\s+/i, "").trim();
  cookie = cookie.replace(/^cookie:\s*/i, "").trim();
  if ((cookie.startsWith("'") && cookie.endsWith("'")) || (cookie.startsWith('"') && cookie.endsWith('"'))) {
    cookie = cookie.slice(1, -1).trim();
  }
  return cookie.replace(/[\r\n]+/g, "; ").replace(/;\s*;/g, "; ").replace(/;\s+/g, "; ").replace(/;\s*$/, "");
}

class SyncError extends Error {
  constructor(reason, message, status = 502) {
    super(message);
    this.reason = reason;
    this.status = status;
  }
}

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

function openidFrom(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const candidates = [];
  try {
    const url = new URL(text);
    if (!/(^|\.)blablalink\.com$/i.test(url.hostname)) return null;
    for (const key of ["openid", "uid", "intl_open_id", "open_id"]) {
      const candidate = url.searchParams.get(key);
      if (candidate) candidates.push(candidate);
    }
  } catch {
    candidates.push(text);
  }
  for (const candidate of candidates) {
    let decoded = candidate;
    try {
      const normalized = candidate.replace(/-/g, "+").replace(/_/g, "/");
      const guess = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
      if (/^[\x20-\x7e]+$/.test(guess)) decoded = guess;
    } catch {
      // The input may already be a plain UID.
    }
    const match = decoded.match(/(\d{6,})\s*$/);
    if (match) return match[1];
  }
  return null;
}

function upstreamHeaders(cookie) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36",
    Origin: "https://www.blablalink.com",
    Referer: "https://www.blablalink.com/",
    "X-Channel-Type": "2",
    "X-Language": "ko",
    "X-Common-Params": JSON.stringify(COMMON),
    Cookie: cookie,
  };
}

async function post(route, body, cookie) {
  let response;
  try {
    response = await fetch(API + route, {
      method: "POST",
      headers: upstreamHeaders(cookie),
      body: JSON.stringify(body),
    });
  } catch {
    throw new SyncError("upstream", `블라블라링크에 연결하지 못했습니다 (${route}).`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new SyncError("upstream", `블라블라링크 응답을 확인할 수 없습니다 (${route}).`);
  }
  if (payload.code === 300001) {
    throw new SyncError("session", "프록시 세션이 만료되었거나 설정되지 않았습니다.", 503);
  }
  return payload;
}

async function collectArea(openid, area, cookie) {
  const roster = await post("Game/GetUserCharacters", { intl_open_id: openid, nikke_area_id: area }, cookie);
  const characters = roster.code === 0 ? roster.data?.characters ?? null : null;
  if (!characters?.length) {
    return { failedCode: roster.code ?? 0, failedMsg: roster.msg ?? "" };
  }
  const nameCodes = characters.map((character) => character.name_code);
  const details = [];
  for (let index = 0; index < nameCodes.length; index += 60) {
    const result = await post("Game/GetUserCharacterDetails", {
      intl_open_id: openid,
      nikke_area_id: area,
      name_codes: nameCodes.slice(index, index + 60),
    }, cookie);
    if (result.code !== 0) throw new SyncError("upstream", `육성 상세를 받지 못했습니다 (${result.code}).`);
    details.push(...(result.data?.character_details ?? []));
  }
  let outpost = null;
  try {
    const result = await post("Game/GetUserProfileOutpostInfo", { intl_open_id: openid, nikke_area_id: area }, cookie);
    if (result.code === 0) outpost = result.data?.outpost_info ?? null;
  } catch (error) {
    if (error instanceof SyncError && error.reason === "session") throw error;
  }
  return { area, characters, details, outpost };
}

async function health(env) {
  const cookie = normalizeCookie(env.BLABLA_COOKIE);
  const pairs = cookie.split(";").map((part) => part.trim()).filter(Boolean);
  const names = pairs.map((part) => part.split("=")[0]);
  const shape = {
    length: cookie.length,
    cookies: names.length,
    hasGameToken: names.includes("game_token"),
    hasGameOpenid: names.includes("game_openid"),
  };
  if (!cookie) return { shape, upstream: null };
  try {
    const response = await fetch(`${API.replace("game/proxy/", "ugc/proxy/standalonesite/")}User/GetUserInfoNew`, {
      method: "POST",
      headers: upstreamHeaders(cookie),
      body: "{}",
    });
    const payload = await response.json().catch(() => null);
    return {
      shape,
      upstream: payload
        ? { httpStatus: response.status, code: payload.code ?? null, msg: payload.msg ?? "" }
        : { httpStatus: response.status, code: null, msg: "invalid json" },
    };
  } catch {
    return { shape, upstream: { httpStatus: null, code: null, msg: "network error" } };
  }
}

async function sync(body, env) {
  const openid = openidFrom(body?.profileUrl);
  if (!openid) throw new SyncError("badurl", "블라블라링크 프로필 주소를 확인해주세요.", 400);
  const requestedArea = body?.area === undefined || body?.area === null || body?.area === ""
    ? null
    : Number(body.area);
  if (requestedArea !== null && !AREAS.includes(requestedArea)) {
    throw new SyncError("badarea", "지원하지 않는 서버입니다.", 400);
  }
  const cookie = normalizeCookie(env.BLABLA_COOKIE);
  if (!cookie) throw new SyncError("session", "프록시 세션이 설정되지 않았습니다.", 503);
  const areas = [];
  const failures = [];
  for (const area of requestedArea === null ? AREAS : [requestedArea]) {
    const result = await collectArea(openid, area, cookie);
    if (result.failedCode === undefined) areas.push(result);
    else failures.push(result);
  }
  if (!areas.length) {
    if (failures.some((failure) => PRIVACY_CODES.has(failure.failedCode))) {
      throw new SyncError("private", "프로필과 니케 목록을 공개로 설정해주세요.", 404);
    }
    const first = failures[0] ?? {};
    throw new SyncError("upstream", `니케 목록을 받지 못했습니다 (${first.failedCode ?? "?"}).`);
  }
  return { openid, areas };
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request.headers.get("Origin"), env);
    if (request.method === "OPTIONS") return new Response(null, { status: headers ? 204 : 403, headers: headers ?? {} });
    if (!headers) return new Response("forbidden origin", { status: 403 });
    const url = new URL(request.url);
    if (request.method !== "POST" || !["/sync", "/health"].includes(url.pathname)) {
      return json({ error: "POST /sync 또는 POST /health만 받습니다.", reason: "badurl" }, 404, headers);
    }
    if (url.pathname === "/health") {
      const result = await health(env);
      return json(result, result.upstream?.code === 0 ? 200 : 503, headers);
    }
    try {
      const result = await sync(await request.json(), env);
      console.log(JSON.stringify({ event: "sync", areas: result.areas.length }));
      return json(result, 200, headers);
    } catch (caught) {
      const error = caught instanceof SyncError ? caught : new SyncError("upstream", "알 수 없는 오류로 실패했습니다.", 500);
      console.log(JSON.stringify({ event: "sync_error", reason: error.reason, status: error.status }));
      return json({ error: error.message, reason: error.reason }, error.status, headers);
    }
  },
};
