import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton, Wordmark } from "@/components/ui";
import { SITE_URL, formatDate, getAllPosts, getPost } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    metadataBase: new URL(SITE_URL),
    title: `${post.title} · Mixstro`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
    },
  };
}

// Placeholder layout: the website design work owns the final look.
export default async function BlogPost({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "Mixstro", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    keywords: post.tags.join(", "),
  };
  return (
    <main className="pt-safe pb-safe px-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <div className="flex items-center justify-between py-2">
        <BackButton href="/blog" />
        <Wordmark size={18} />
        <span className="size-10" />
      </div>
      <h1 className="headline mt-8 text-[32px]" style={{ fontWeight: 700 }}>
        {post.title}
      </h1>
      <p className="mt-2 text-[13px] text-smoke">
        {post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.date)} · {post.readingMinutes} min read
      </p>
      <article
        className="mt-8 text-[16px] leading-[1.6] text-paper/85 [&_a]:text-tungsten [&_a]:underline [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-[21px] [&_h2]:font-semibold [&_h2]:text-paper [&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-paper [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </main>
  );
}
