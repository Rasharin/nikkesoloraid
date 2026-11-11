import type { Metadata } from "next";

import TermsContent from "@/app/components/TermsContent";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "이용약관",
  alternates: { canonical: canonicalUrl("/terms") },
  openGraph: { url: canonicalUrl("/terms") },
};

export default function TermsPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8"><a className="mb-4 inline-block text-sm text-cyan-300" href="/">← 보관소로 돌아가기</a><TermsContent /></main>;
}
