import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/deck-building"),
  },
  openGraph: {
    url: canonicalUrl("/deck-building"),
  },
};

export { default } from "../page";
