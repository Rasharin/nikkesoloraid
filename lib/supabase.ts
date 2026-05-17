import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

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
            // persistSession=false: 만료시간 제거 → 세션 쿠키 → 브라우저 종료 시 삭제
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

export const supabase = createSupabaseClient(true);
