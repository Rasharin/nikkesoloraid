import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/deck-setting"),
  },
  openGraph: {
    url: canonicalUrl("/deck-setting"),
  },
};

export { default } from "../page";
