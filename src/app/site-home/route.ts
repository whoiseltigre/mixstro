import { HOMEPAGE_HTML } from "@/site/homepage";

// The mixstro.com homepage. Middleware rewrites mixstro.com/ here. It is a route handler,
// not a public/ file, because Amplify's server can't serve a middleware rewrite to a
// public file (those only exist on the CDN). Prerendered at build time.
export const dynamic = "force-static";

export function GET() {
  return new Response(HOMEPAGE_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
