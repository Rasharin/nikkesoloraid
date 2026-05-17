import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

const PERSIST_SESSION_KEY = "soloraid_persist_session_v1";
// @supabase/ssr DEFAULT_COOKIE_OPTIONS.maxAge
const SUPABASE_COOKIE_MAX_AGE = 34560000;

function shouldPersistSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PERSIST_SESSION_KEY) !== "false";
  } catch {
    return true;
  }
}

// 설정 변경 시 기존 Supabase 인증 쿠키를 즉시 업데이트
export function migrateAuthCookies(persist: boolean) {
  if (typeof document === "undefined") return;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const allCookies = parse(document.cookie);

  Object.entries(allCookies).forEach(([name, value]) => {
    if (!name.startsWith("sb-") || !name.includes("auth")) return;
    if (!value) return;

    const opts: Record<string, unknown> = { path: "/", sameSite: "lax" };
    if (isSecure) opts.secure = true;
    if (persist) opts.maxAge = SUPABASE_COOKIE_MAX_AGE;
    // persist=false: maxAge 없음 → 세션 쿠키 → 브라우저 종료 시 삭제

    document.cookie = serialize(name, value, opts as Parameters<typeof serialize>[2]);
  });
}

export function createSupabaseClient(persistSession: boolean = true) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          const parsed = parse(document.cookie ?? "");
          return Object.entries(parsed).map(([name, value]) => ({ name, value: value ?? "" }));
        },
        setAll(cookiesToSet) {
          if (typeof document === "undefined") return;
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...(options ?? {}) } as Record<string, unknown>;
            if (!persistSession && value !== "" && opts.maxAge !== 0) {
              delete opts.maxAge;
              delete opts.expires;
            }
            document.cookie = serialize(name, value, opts);
          });
        },
      },
    }
  );
}

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        if (typeof document === "undefined") return [];
        const parsed = parse(document.cookie ?? "");
        return Object.entries(parsed).map(([name, value]) => ({ name, value: value ?? "" }));
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;
        const persist = shouldPersistSession();
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...(options ?? {}) } as Record<string, unknown>;
          if (!persist && value !== "" && opts.maxAge !== 0) {
            delete opts.maxAge;
            delete opts.expires;
          }
          document.cookie = serialize(name, value, opts);
        });
      },
    },
  }
);
