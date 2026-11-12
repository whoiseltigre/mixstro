import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/blog";

/**
 * mixstro.com and app.mixstro.com are open to search engines, with one sitemap for both
 * (Search Console verifies the whole domain). Staging and Amplify preview hosts are not.
 * On the app, only the public pages are worth crawling: music pages, band pages, sign-in.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (host === "mixstro.com") return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` };
  if (host === "app.mixstro.com") {
    return {
      rules: { userAgent: "*", allow: ["/$", "/@", "/p/", "/b/"], disallow: ["/api/", "/auth", "/join/", "/onboarding", "/discover", "/board", "/messages", "/me", "/m/", "/search", "/settings", "/connected"] },
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }
  return { rules: { userAgent: "*", disallow: "/" } };
}
