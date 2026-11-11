export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://www.nikkesolo.com";

export function canonicalUrl(path = "") {
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "/";
  return `${siteUrl}${normalizedPath}`;
}

export const publicRoutes = [
  "",
  "/saved-deck",
  "/terms",
  "/privacy",
  "/license",
] as const;
