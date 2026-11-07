import type { Metadata } from "next";
import Link from "next/link";
import { BackButton, Wordmark } from "@/components/ui";
import { SITE_URL, formatDate, getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/blog" },
  title: "Blog · Mixstro",
  description: "Gear, songwriting, scenes and stories for musicians, from the team behind Mixstro.",
};

// Placeholder layout: the website design work owns the final look.
export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <main className="pt-safe pb-safe px-5">
      <div className="flex items-center justify-between py-2">
        <BackButton href="/" />
        <Wordmark size={18} />
        <span className="size-10" />
      </div>
      <h1 className="headline mt-8 text-[34px]" style={{ fontWeight: 700 }}>
        Blog
      </h1>
      <ul className="mt-8 flex flex-col gap-6">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="block">
              <p className="text-[13px] text-smoke">
                {formatDate(p.updated ?? p.date)} · {p.readingMinutes} min read
              </p>
              <h2 className="mt-1 text-[19px] font-semibold leading-snug">{p.title}</h2>
              <p className="mt-1 text-[15px] leading-[1.5] text-paper/75">{p.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
