import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/deck-recommend"),
  },
  openGraph: {
    url: canonicalUrl("/deck-recommend"),
  },
};

export { default } from "../page";
