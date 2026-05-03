import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/faq"),
  },
  openGraph: {
    url: canonicalUrl("/faq"),
  },
};

export { default } from "../page";
