import type { Metadata } from "next";

import LicenseContent from "@/app/components/LicenseContent";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "라이센스",
  alternates: { canonical: canonicalUrl("/license") },
  openGraph: { url: canonicalUrl("/license") },
};

export default function LicensePage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8"><a className="mb-4 inline-block text-sm text-cyan-300" href="/">← 보관소로 돌아가기</a><LicenseContent /></main>;
}
