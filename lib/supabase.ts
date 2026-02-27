import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

function normalizeCookieOptions(value: string, options: Record<string, unknown>) {
  const next = { ...options } as Record<string, unknown>;
  const isDeleteCookie = value === "" || options.maxAge === 0;
  if (!isDeleteCookie) {
    delete next.maxAge;
    delete next.expires;
  }
  return next;
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
        cookiesToSet.forEach(({ name, value, options }) => {
          const normalized = normalizeCookieOptions(value, (options ?? {}) as Record<string, unknown>);
          document.cookie = serialize(name, value, normalized);
        });
      },
    },
  }
);
