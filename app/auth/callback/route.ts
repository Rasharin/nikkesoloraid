import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function normalizeCookieOptions(value: string, options: Record<string, unknown>) {
  const next = { ...options } as Record<string, unknown>;
  const isDeleteCookie = value === "" || options.maxAge === 0;
  if (!isDeleteCookie) {
    delete next.maxAge;
    delete next.expires;
  }
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const cookieStore = await cookies(); // ✅ Next 16에서는 await 필요

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(
              name,
              value,
              normalizeCookieOptions(value, (options ?? {}) as Record<string, unknown>)
            );
          });
        },
      },
    }
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", url.origin));
}
