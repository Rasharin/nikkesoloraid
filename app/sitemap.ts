import type { MetadataRoute } from "next";
import { publicRoutes, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: route ? `${siteUrl}${route}` : siteUrl,
    lastModified,
    changeFrequency: "yearly",
    priority: route === "" ? 1 : 0.8,
  }));
}
