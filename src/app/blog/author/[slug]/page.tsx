import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostGrid } from "@/components/blog/post-grid";
import { accentOf } from "@/components/blog/cover";
import { AUTHORS, SITE_URL, authorPath, authorSchema, category, getAllPosts } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

const bySlug = (slug: string) => Object.entries(AUTHORS).find(([, a]) => a.slug === slug);

export function generateStaticParams() {
  return Object.values(AUTHORS).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = bySlug((await params).slug);
  if (!found) return {};
  const [name, a] = found;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${name}, ${a.jobTitle} · Mixstro blog`,
    description: a.bio,
    alternates: { canonical: authorPath(a) },
    openGraph: { type: "profile", url: authorPath(a), title: `${name} on the Mixstro blog`, description: a.bio },
  };
}

/** An author page: who writes the posts, and everything they've written. Google uses it to judge who's behind the advice. */
export default async function AuthorPage({ params }: Props) {
  const found = bySlug((await params).slug);
  if (!found) notFound();
  const [name, a] = found;
  const posts = getAllPosts().filter((p) => p.author === name);
  const grid = posts.map((p) => {
    const cat = category(p);
    return { slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags, cat, minutes: p.readingMinutes, cover: p.cover, ...accentOf(cat) };
  });
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: `${SITE_URL}${authorPath(a)}`,
      mainEntity: authorSchema(name, a),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${authorPath(a)}` },
      ],
    },
  ];
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <div className="mxb-glow" aria-hidden="true" />
      <div className="mxb-wrap">
        <section className="mxb-hero mxb-author-hero">
          {a.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="mxb-author-photo" src={a.image} alt={name} width={112} height={112} />
          ) : (
            <span className="mxb-author-photo av" aria-hidden="true">{initials}</span>
          )}
          <h1>{name}</h1>
          <p className="sub">{a.bio}</p>
          {a.sameAs && a.sameAs.length > 0 && (
            <p className="mxb-author-links">
              {a.sameAs.map((u) => (
                <a key={u} href={u} rel="me noopener" target="_blank">{new URL(u).hostname.replace(/^www\./, "")}</a>
              ))}
            </p>
          )}
        </section>
        <h2 className="mxb-h2">{posts.length} posts by {name.split(" ")[0]}</h2>
        <PostGrid posts={grid} topics={[]} />
      </div>
    </main>
  );
}
