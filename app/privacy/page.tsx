import type { Metadata } from "next";

import PrivacyContent from "@/app/components/PrivacyContent";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  alternates: { canonical: canonicalUrl("/privacy") },
  openGraph: { url: canonicalUrl("/privacy") },
};

export default function PrivacyPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8"><a className="mb-4 inline-block text-sm text-cyan-300" href="/">← 보관소로 돌아가기</a><PrivacyContent /></main>;
}
