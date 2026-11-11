import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, getAllPosts } from "@/lib/blog";
import { APP_ORIGIN } from "@/lib/public-profile";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

// Rebuilt at most once an hour, so new public pages show up without a deploy.
export const revalidate = 3600;

/** Public music pages (app.mixstro.com/@name) and band pages, from public.sitemap_entries(). */
async function musicPages(): Promise<MetadataRoute.Sitemap> {
  if (!isSupabaseConfigured) return [];
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("sitemap_entries");
  if (error || !data) return [];
  return (data as { kind: "profile" | "band"; key: string }[]).map((e) =>
    e.kind === "profile"
      ? { url: `${APP_ORIGIN}/@${e.key}`, changeFrequency: "weekly" as const, priority: 0.6 }
      : { url: `${APP_ORIGIN}/b/${e.key}`, changeFrequency: "weekly" as const, priority: 0.5 },
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  return [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: posts[0]?.updated ?? posts[0]?.date },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updated ?? p.date })),
    ...(await musicPages()),
  ];
}
