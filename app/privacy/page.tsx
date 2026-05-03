import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/privacy"),
  },
  openGraph: {
    url: canonicalUrl("/privacy"),
  },
};

export { default } from "../page";
