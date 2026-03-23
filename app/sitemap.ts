import type { MetadataRoute } from "next";

const siteUrl = "https://nikkesoloraid.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
    },
  ];
}
