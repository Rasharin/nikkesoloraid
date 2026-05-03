import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/terms"),
  },
  openGraph: {
    url: canonicalUrl("/terms"),
  },
};

export { default } from "../page";
