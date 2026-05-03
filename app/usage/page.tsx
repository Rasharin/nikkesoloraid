import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/usage"),
  },
  openGraph: {
    url: canonicalUrl("/usage"),
  },
};

export { default } from "../page";
