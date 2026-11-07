import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { accentOf } from "@/components/blog/cover";
import { AUTHORS, SITE_URL, category, formatDate, getAllPosts, getPost, relatedPosts } from "@/lib/blog";

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
      images: ["/site/v1/og-card.jpg"],
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
  const cat = category(post);
  const related = relatedPosts(post.slug, 3);
  const initials = post.author.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <div className="mxb-glow" aria-hidden="true" />
      <div className="mxb-wrap">
        <header className="mxb-post-hero">
          <nav className="mxb-crumb" aria-label="Breadcrumb">
            <Link href="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <span>{cat}</span>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
          </nav>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="dek">{post.excerpt}</p>}
          <p className="mxb-byline">
            By <b>{post.author}</b> · {post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.date)}
          </p>
        </header>

        <article className="mxb-article" dangerouslySetInnerHTML={{ __html: post.html }} />

        {author && (
          <aside className="mxb-author">
            <span className="av" aria-hidden="true">{initials}</span>
            <span>
              <b>About {post.author}</b>
              {author.bio}
            </span>
          </aside>
        )}

        <section className="mxb-join">
          <h2>Find the people for your next band</h2>
          <p>Put every band you&apos;ve played in on one profile, then find the next one. Free.</p>
          <a className="mxb-btn paper" href="https://app.mixstro.com">Join free</a>
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="mxb-h2" style={{ fontSize: "clamp(32px,4vw,40px)", marginTop: 96 }}>Keep reading</h2>
            <div className="mxb-cards" style={{ marginTop: 24 }}>
              {related.map((p) => {
                const c = category(p);
                const { accent, glow } = accentOf(c);
                return (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="mxb-card" style={{ "--accent": accent, "--glow": glow, minHeight: 220 } as React.CSSProperties}>
                    <span className="meta">{c} · {p.readingMinutes} min read</span>
                    <h3>{p.title}</h3>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
