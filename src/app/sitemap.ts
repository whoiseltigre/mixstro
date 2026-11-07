import type { MetadataRoute } from "next";
import { SITE_URL, getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  return [
    { url: `${SITE_URL}/blog`, lastModified: posts[0]?.updated ?? posts[0]?.date },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updated ?? p.date })),
  ];
}
