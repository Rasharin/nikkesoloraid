const PROFILE_URL_ERROR = "올바른 블라블라링크 프로필 링크를 입력해주세요.";
const HOME_URL_ERROR = "BlaBlaLink 홈 주소에는 계정 정보가 없습니다. 프로필 공유 링크 또는 게임 프로필의 UID 숫자를 입력해주세요.";

export class BlaBlaLinkProfileUrlError extends Error {}

export type BlaBlaLinkProfileIdentifier = {
  openId: string;
  areaId?: number;
};

export function parseBlaBlaLinkProfileUrl(value: string): BlaBlaLinkProfileIdentifier {
  const text = value.trim();
  const directMatch = text.match(/(?:^\d+-)?(\d{6,})$/);
  if (directMatch) return { openId: directMatch[1] };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new BlaBlaLinkProfileUrlError(PROFILE_URL_ERROR);
  }

  const hostname = url.hostname.toLocaleLowerCase("en-US");
  if (url.protocol !== "https:" || (hostname !== "blablalink.com" && hostname !== "www.blablalink.com")) {
    throw new BlaBlaLinkProfileUrlError(PROFILE_URL_ERROR);
  }
  const candidates = ["openid", "uid", "intl_open_id", "open_id"]
    .map((key) => url.searchParams.get(key)?.trim())
    .filter((candidate): candidate is string => Boolean(candidate));

  for (const raw of candidates) {
    let decoded = raw;
    try {
      const unpadded = raw.replace(/-/g, "+").replace(/_/g, "/");
      const guess = atob(unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, "="));
      if (/^[\x20-\x7e]+$/.test(guess)) decoded = guess;
    } catch {
      // Plain identifiers are also used by BlaBlaLink share URLs.
    }
    const match = decoded.match(/(\d{6,})\s*$/);
    if (match) return { openId: match[1] };
  }
  if (/^\/shiftyspad\/home(?:\/|$)/.test(url.pathname)) {
    throw new BlaBlaLinkProfileUrlError(HOME_URL_ERROR);
  }
  throw new BlaBlaLinkProfileUrlError(PROFILE_URL_ERROR);
}
