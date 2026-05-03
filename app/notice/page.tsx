import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/notice"),
  },
  openGraph: {
    url: canonicalUrl("/notice"),
  },
};

export { default } from "../page";
