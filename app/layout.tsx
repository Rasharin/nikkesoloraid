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

export const metadata: Metadata = {
  title: "니케 솔로레이드 덱 도우미",
  description: "내 솔로레이드 최적 덱 추천",
  openGraph: {
    title: "니케 솔로레이드 덱 도우미",
    description: "내 솔로레이드 최적 덱 추천",
    url: "https://nikkesoloraid.vercel.app",
    siteName: "니케 솔로레이드 덱 도우미",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "니케 솔로레이드 덱 도우미",
    description: "내 솔로레이드 최적 덱 추천",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
