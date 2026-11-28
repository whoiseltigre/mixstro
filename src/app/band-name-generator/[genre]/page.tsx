import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/blog";
import { GENRE_PAGES, genrePage } from "@/lib/band-names/genre-pages";
import { GeneratorPage } from "../content";

type Props = { params: Promise<{ genre: string }> };

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => GENRE_PAGES.map((g) => ({ genre: g.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = genrePage((await params).genre);
  if (!page) return {};
  const path = `/band-name-generator/${page.slug}`;
  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: path },
    title: `${page.h1}: Free Ideas, Checked Against Real Bands | Mixstro`,
    description: page.dek,
    openGraph: { type: "website", url: path, title: `${page.h1} · Mixstro`, description: page.dek, images: [{ url: "/site/v1/og-card.jpg", width: 1200, height: 630 }] },
  };
}

export default async function GenreGeneratorPage({ params }: Props) {
  const page = genrePage((await params).genre);
  if (!page) notFound();
  return <GeneratorPage page={page} />;
}
