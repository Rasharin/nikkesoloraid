import type { Metadata } from "next";

import { canonicalUrl, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: canonicalUrl("/") },
  title: "NiDeck 읽기 전용 덱 보관소",
  description: "기존 NiDeck 이용자가 본인의 저장 덱을 확인하고 내려받는 읽기 전용 보관소입니다.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "NiDeck 읽기 전용 덱 보관소",
    description: "저장된 솔로·유니온 레이드 덱 조회 및 내보내기",
    url: canonicalUrl("/"),
    siteName: "NiDeck Archive",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
