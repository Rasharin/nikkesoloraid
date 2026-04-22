export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://nikkesolo.com";

export const publicRoutes = [
  "",
  "/deck-recommend",
  "/deck-setting",
  "/usage",
  "/saved-deck",
  "/faq",
  "/notice",
  "/terms",
  "/privacy",
  "/license",
] as const;
