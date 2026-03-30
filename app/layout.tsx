import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "니케 솔로레이드 덱 도우미";
const siteUrl = "https://nikkesoloraid.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s | 니케 솔로레이드 덱 도우미",
  },
  description: "니케 솔로레이드 덱 추천, 조합 계산, 점수 최적화 도우미",
  keywords: [
    "니케 솔레",
    "니케 덱",
    "니케 솔로레이드",
    "니케 덱 추천",
    "니케 조합",
  ],
  openGraph: {
    title: siteName,
    description: "니케 덱 추천 최적화 사이트",
    url: siteUrl,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
