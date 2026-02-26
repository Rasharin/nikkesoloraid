"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string };
};

export default function LoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 처음 로드 + 로그인 상태 변화 감지
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser((data.user as any) ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((session?.user as any) ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

async function handleGoogleLogin() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://nikkesoloraid.vercel.app/auth/callback",
    },
  });
}

  const logout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange로 null 처리되지만, 즉시 반영용으로 한 번 더
    setUser(null);
  };

  if (loading) {
    return (
      <button className="rounded-xl border border-neutral-700 px-3 py-2 text-sm opacity-60">
        ...
      </button>
    );
  }

  if (user) {
    const name =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email ||
      "로그인됨";

    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs text-neutral-300">{name}</span>
        <button
          onClick={logout}
          className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-400 active:scale-[0.99]"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGoogleLogin}
      className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-400 active:scale-[0.99]"
    >
      Google 로그인
    </button>
  );
}