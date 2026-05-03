import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/calculator"),
  },
  openGraph: {
    url: canonicalUrl("/calculator"),
  },
};

export { default } from "../page";
