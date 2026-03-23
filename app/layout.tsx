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
const description = "니케 솔로레이드 덱 추천, 덱 조합 계산, 덱 만들기";
const siteUrl = "https://nikkesoloraid.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s | 니케 솔로레이드 덱 도우미",
  },
  description,
  keywords: ["니케 솔레 덱 도우미", "니케 솔레", "니케 덱", "니케 솔로레이드", "니케 덱 추천"],
  openGraph: {
    title: siteName,
    description,
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
