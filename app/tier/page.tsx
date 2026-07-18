import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "니케 티어",
  description: "니케 전체 목록을 기반으로 정리한 공용 니케 티어표입니다.",
  alternates: {
    canonical: canonicalUrl("/tier"),
  },
  openGraph: {
    url: canonicalUrl("/tier"),
  },
};

export { default } from "../page";
