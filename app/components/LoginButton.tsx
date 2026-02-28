"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import InAppBlockerModal, { isInAppBrowser } from "./InAppBlocker";

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
  };
  identities?: Array<{
    identity_data?: {
      avatar_url?: string;
      picture?: string;
    };
  }>;
};

type LoginButtonProps = {
  onProfileClick?: () => void;
};

export default function LoginButton({ onProfileClick }: LoginButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser((data.user as User) ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((session?.user as User) ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleGoogleLogin() {
    if (isInAppBrowser()) {
      setOpen(true);
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://nikkesoloraid.vercel.app/auth/callback",
      },
    });
  }

  const logout = async () => {
    await supabase.auth.signOut();
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
    const profileImage =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      user.identities?.[0]?.identity_data?.avatar_url ||
      user.identities?.[0]?.identity_data?.picture ||
      null;

    return (
      <div className="flex items-center gap-2">
        {profileImage ? (
          <button
            type="button"
            onClick={onProfileClick}
            className="overflow-hidden rounded-full active:scale-[0.99]"
            aria-label="Open my page"
          >
            <img
              src={profileImage}
              alt="Google profile"
              className="h-9 w-9 rounded-full border border-neutral-700 object-cover"
              referrerPolicy="no-referrer"
            />
          </button>
        ) : null}
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
    <>
      <button
        onClick={handleGoogleLogin}
        className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-400 active:scale-[0.99]"
      >
        Google 로그인
      </button>

      <InAppBlockerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
