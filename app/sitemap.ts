import type { MetadataRoute } from "next";

const siteUrl = "https://nikkesoloraid.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/deck-recommend`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/deck-setting`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/usage`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/saved-deck`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
    },
  ];
}
