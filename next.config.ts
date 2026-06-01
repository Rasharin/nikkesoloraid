import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // 니케 이미지 - 파일명이 바뀌지 않으므로 1년 캐시
        source: "/nikke-images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // 기타 공개 정적 자산 (아이콘 등)
        source: "/:file((?!_next|api).+\\.(?:png|webp|jpg|jpeg|svg|ico|woff2?))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
