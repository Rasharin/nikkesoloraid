"use client";

import { supabase } from "@/lib/supabase";

export default function LoginButton() {
  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button onClick={login} className="border px-3 py-2 rounded-xl">
      Google 로그인
    </button>
  );
}