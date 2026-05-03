import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/saved-deck"),
  },
  openGraph: {
    url: canonicalUrl("/saved-deck"),
  },
};

export { default } from "../page";
