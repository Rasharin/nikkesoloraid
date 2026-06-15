import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const STATS_CLIENT_COOKIE = "nideck_stats_client_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type AppConfigRow = {
  active_raid_key: string | null;
  solo_raid_active: boolean | null;
  solo_raid_tabs: unknown;
};

function getServerEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

function createStatsClientId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function signClientId(clientId: string, secret: string) {
  return createHmac("sha256", secret).update(clientId).digest("base64url");
}

function encodeClientCookie(clientId: string, secret: string) {
  return `${clientId}.${signClientId(clientId, secret)}`;
}

function decodeClientCookie(value: string | undefined, secret: string) {
  if (!value) return null;
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const clientId = value.slice(0, separatorIndex).trim();
  const signature = value.slice(separatorIndex + 1).trim();
  if (!clientId || !signature) return null;

  const expected = signClientId(clientId, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return null;
  return timingSafeEqual(expectedBuffer, actualBuffer) ? clientId : null;
}

function getRaidLabel(config: AppConfigRow, raidKey: string) {
  const tabs = Array.isArray(config.solo_raid_tabs) ? config.solo_raid_tabs : [];
  const matched = tabs.find((item): item is { key?: unknown; label?: unknown } => {
    return Boolean(item && typeof item === "object" && "key" in item && item.key === raidKey);
  });

  return typeof matched?.label === "string" && matched.label.trim() ? matched.label.trim() : raidKey;
}

export async function POST() {
  const env = getServerEnv();
  if (!env) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(STATS_CLIENT_COOKIE)?.value?.trim();
  const existingClientId = decodeClientCookie(existingCookie, env.serviceRoleKey);
  const clientId = existingClientId || createStatsClientId();
  const now = new Date().toISOString();

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options ?? {});
        });
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: siteError } = await admin.from("site_user_stats").upsert(
    {
      client_id: clientId,
      user_id: userId,
      last_seen: now,
    },
    { onConflict: "client_id" }
  );

  if (siteError) {
    console.error("[stats/heartbeat] site_user_stats upsert failed", siteError);
    return NextResponse.json({ error: "Failed to track site stats." }, { status: 500 });
  }

  const { data: config, error: configError } = await admin
    .from("app_config")
    .select("active_raid_key,solo_raid_active,solo_raid_tabs")
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error("[stats/heartbeat] app_config fetch failed", configError);
    return NextResponse.json({ error: "Failed to load app config." }, { status: 500 });
  }

  const appConfig = config as AppConfigRow | null;
  const activeRaidKey = appConfig?.active_raid_key?.trim() ?? "";

  if (appConfig?.solo_raid_active && activeRaidKey) {
    const { error: raidError } = await admin.from("raid_user_stats").upsert(
      {
        raid_key: activeRaidKey,
        raid_label: getRaidLabel(appConfig, activeRaidKey),
        client_id: clientId,
        user_id: userId,
        last_seen: now,
        ended_at: null,
      },
      { onConflict: "raid_key,client_id" }
    );

    if (raidError) {
      console.error("[stats/heartbeat] raid_user_stats upsert failed", raidError);
      return NextResponse.json({ error: "Failed to track raid stats." }, { status: 500 });
    }
  }

  const response = NextResponse.json({ ok: true });
  if (!existingClientId) {
    response.cookies.set(STATS_CLIENT_COOKIE, encodeClientCookie(clientId, env.serviceRoleKey), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}
