import type { NextConfig } from "next";
import { getAllPosts } from "./src/lib/blog";

/**
 * Old WordPress posts (2024) lived at mixstro.com/<slug>/. Ported posts list their old
 * paths in `old_urls` frontmatter; posts we dropped point at the closest new page.
 */
const DROPPED_POSTS: Record<string, string> = {
  "/10-best-music-collaborations-of-all-time": "/blog/best-songwriting-duos",
  "/best-selling-albums-of-all-time": "/blog",
  "/best-albums-of-the-1970s": "/blog",
  "/musicians-that-died-too-young": "/blog",
  "/when-the-call-of-the-rock-gods-ceases": "/blog",
  "/blogs": "/blog",
};

function blogRedirects() {
  const fromPosts = getAllPosts().flatMap((p) =>
    p.old_urls.map((from) => ({ source: from.replace(/\/$/, ""), destination: `/blog/${p.slug}` })),
  );
  const dropped = Object.entries(DROPPED_POSTS).map(([source, destination]) => ({ source, destination }));
  // Next first strips the trailing slash WordPress used, then these send the old path to its new home.
  return [...fromPosts, ...dropped].map((r) => ({ ...r, permanent: true }));
}

const nextConfig: NextConfig = {
  async redirects() {
    return blogRedirects();
  },
};

export default nextConfig;
