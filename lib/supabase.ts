import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

const PERSIST_SESSION_KEY = "soloraid_persist_session_v1";

function shouldPersistSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PERSIST_SESSION_KEY) !== "false";
  } catch {
    return true;
  }
}

// 설정값을 매 접근마다 읽어 localStorage/sessionStorage를 동적으로 선택
const dynamicAuthStorage = {
  get length() {
    if (typeof window === "undefined") return 0;
    return window.localStorage.length;
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.clear();
    window.sessionStorage.clear();
  },
  key(index: number) {
    if (typeof window === "undefined") return null;
    return window.localStorage.key(index);
  },
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      if (shouldPersistSession()) {
        window.sessionStorage.removeItem(key);
        window.localStorage.setItem(key, value);
      } else {
        window.localStorage.removeItem(key);
        window.sessionStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};

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
      auth: {
        persistSession,
        detectSessionInUrl: true,
        flowType: "implicit",
        storage: persistSession && typeof window !== "undefined" ? window.localStorage : (typeof window !== "undefined" ? window.sessionStorage : undefined),
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
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "implicit",
      storage: dynamicAuthStorage,
    },
  }
);
