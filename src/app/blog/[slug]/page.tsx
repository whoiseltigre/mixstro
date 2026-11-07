import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton, Wordmark } from "@/components/ui";
import { AUTHORS, SITE_URL, formatDate, getAllPosts, getPost } from "@/lib/blog";

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
  const author = AUTHORS[post.author];
  const url = `${SITE_URL}/blog/${post.slug}`;
  const schema: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      author: author
        ? { "@type": "Person", name: post.author, jobTitle: author.jobTitle, description: author.bio }
        : { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Mixstro", url: SITE_URL },
      mainEntityOfPage: url,
      keywords: post.tags.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 2, name: post.title, item: url },
      ],
    },
  ];
  // FAQPage only mirrors the FAQ that is visible on the page.
  if (post.faqs.length) {
    schema.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }
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
        By {post.author} · {post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.date)} · {post.readingMinutes} min read
      </p>
      <article
        className="mt-8 text-[16px] leading-[1.6] text-paper/85 [&_a]:text-tungsten [&_a]:underline [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-[21px] [&_h2]:font-semibold [&_h2]:text-paper [&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-paper [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-stage [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-[1.5] [&_blockquote]:mt-4 [&_blockquote]:border-l-2 [&_blockquote]:border-riser [&_blockquote]:pl-4 [&_blockquote]:text-paper/75"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
      {author && (
        <aside className="mt-12 rounded-2xl bg-stage p-5 text-[14px] leading-[1.55] text-paper/80">
          <p className="font-semibold text-paper">About {post.author}</p>
          <p className="mt-1.5">{author.bio}</p>
        </aside>
      )}
    </main>
  );
}
