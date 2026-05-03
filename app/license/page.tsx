import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/license"),
  },
  openGraph: {
    url: canonicalUrl("/license"),
  },
};

export { default } from "../page";
