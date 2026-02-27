import { createBrowserClient } from "@supabase/ssr";

const sessionStorageAdapter = {
  getItem: (key: string) => (typeof window === "undefined" ? null : window.sessionStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(key);
  },
};

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: sessionStorageAdapter,
      persistSession: true,
    },
  }
);
