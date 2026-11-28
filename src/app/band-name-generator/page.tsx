import type { Metadata } from "next";
import { SITE_URL } from "@/lib/blog";
import { DESCRIPTION, GeneratorPage, TITLE } from "./content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/band-name-generator" },
  title: `${TITLE} | Mixstro`,
  description: DESCRIPTION,
  openGraph: { type: "website", url: "/band-name-generator", title: "Band name generator · Mixstro", description: DESCRIPTION, images: [{ url: "/site/v1/og-card.jpg", width: 1200, height: 630 }] },
};

// A fresh first batch every hour, rendered on the server so the names are in the HTML.
export const revalidate = 3600;

export default function BandNameGeneratorPage() {
  return <GeneratorPage />;
}
