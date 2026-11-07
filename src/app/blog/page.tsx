import type { Metadata } from "next";
import Link from "next/link";
import { Cover, accentOf } from "@/components/blog/cover";
import { PostGrid } from "@/components/blog/post-grid";
import { SITE_URL, category, getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/blog" },
  title: "Blog · Mixstro",
  description: "Guides for musicians on starting a band, finding bandmates, gear, recording and getting gigs, from the team behind Mixstro.",
  openGraph: { type: "website", url: "/blog", title: "The Mixstro blog", images: ["/site/v1/og-card.jpg"] },
};

/** The pillar guide leads the page; the next newest posts sit beside it. */
const FEATURED = "how-to-start-a-band";
const TOPICS = ["Bands", "Gigs", "Gear", "Guitar", "Metal", "Live", "Songwriting"];

export default function BlogIndex() {
  const posts = getAllPosts();
  const feat = posts.find((p) => p.slug === FEATURED) ?? posts[0];
  const side = posts.filter((p) => p !== feat).slice(0, 3);
  const topics = TOPICS.filter((t) => posts.some((p) => p.tags.includes(t)));
  const grid = posts.map((p) => {
    const cat = category(p);
    return { slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags, cat, minutes: p.readingMinutes, ...accentOf(cat) };
  });

  return (
    <main>
      <div className="mxb-glow" aria-hidden="true" />
      <div className="mxb-wrap">
        <section className="mxb-hero">
          <h1>
            Play it <span className="mxb-hl">better</span>
          </h1>
          <p className="sub">
            The Mixstro blog: <b>starting bands, finding bandmates, gear and gigs.</b>
          </p>
        </section>

        {feat && (
          <div className="mxb-bgrid">
            <Link className="mxb-feat" href={`/blog/${feat.slug}`}>
              <Cover slug={feat.slug} cat={category(feat)} label={false} rings={60} />
              <span className="meta">
                {category(feat)} · {feat.readingMinutes} min read
              </span>
              <h2>{feat.title}</h2>
              <p>{feat.excerpt}</p>
              <span className="mxb-btn ink">
                Read it
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
            <div className="mxb-side">
              {side.map((p) => (
                <Link key={p.slug} className="mxb-mini" href={`/blog/${p.slug}`}>
                  <Cover slug={p.slug} cat={category(p)} rings={30} />
                  <div>
                    <span className="meta">{p.readingMinutes} min read</span>
                    <h3>{p.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <h2 className="mxb-h2">All posts</h2>
        <PostGrid posts={grid} topics={topics} />
      </div>
    </main>
  );
}
