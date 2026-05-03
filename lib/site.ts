export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://www.nikkesolo.com";

export function canonicalUrl(path = "") {
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "/";
  return `${siteUrl}${normalizedPath}`;
}

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
