import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/redirect";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

const APP_ROUTES = ["/discover", "/board", "/messages", "/me", "/onboarding", "/connected", "/search", "/settings"];

/** app.mixstro.com/@name is the short link to someone's music page. */
const VANITY = /^\/@([A-Za-z0-9_.]{3,24})\/?$/;
const PROFILE = /^\/m\/([A-Za-z0-9_.]{3,24})\/?$/;
const REF_COOKIE = "mx_ref";

// The public website lives on the apex domain; the app lives on app.mixstro.com.
const SITE_HOST = "mixstro.com";
const APP_ORIGIN = "https://app.mixstro.com";
// Paths on mixstro.com that belong to the app, sent over to app.mixstro.com.
const APP_ONLY = [...APP_ROUTES, "/auth", "/m/", "/@", "/p/", "/join"];

function siteRouting(request: NextRequest): NextResponse | null {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const { pathname, search } = request.nextUrl;
  if (host === `www.${SITE_HOST}`) return NextResponse.redirect(`https://${SITE_HOST}${pathname}${search}`, 308);
  if (host !== SITE_HOST) return null;
  if (pathname === "/") {
    // Static homepage (src/app/site-home). No auth lookup, so it can be served from the CDN cache.
    const res = NextResponse.rewrite(new URL("/site-home", request.url));
    res.headers.set("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    return res;
  }
  if (APP_ONLY.some((r) => pathname.startsWith(r))) return NextResponse.redirect(`${APP_ORIGIN}${pathname}${search}`, 307);
  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  const site = siteRouting(request);
  if (site) return site;
  const path = request.nextUrl.pathname;
  const vanity = path.match(VANITY)?.[1];

  if (!isSupabaseConfigured) {
    return vanity ? NextResponse.rewrite(new URL(`/m/${vanity.toLowerCase()}`, request.url)) : NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims checks the session token's signature locally (keys cached in memory), so most
  // requests skip the round trip to Supabase Auth that getUser() makes. It refreshes an expired
  // session the same way. With legacy shared-secret keys it falls back to getUser().
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims.sub ? { id: claims.claims.sub } : null;

  // Music pages: members get the full profile, everyone else the public page.
  const profile = vanity ?? path.match(PROFILE)?.[1];
  if (profile) {
    const name = profile.toLowerCase();
    const rewritten = NextResponse.rewrite(new URL(user ? `/m/${name}` : `/p/${name}`, request.url), { request });
    response.cookies.getAll().forEach((c) => rewritten.cookies.set(c));
    // Remember whose page brought a visitor here, so their signup can say so.
    if (!user && !request.cookies.get(REF_COOKIE)) {
      const source = request.nextUrl.searchParams.get("s") === "invite" ? "invite" : "page";
      rewritten.cookies.set(REF_COOKIE, `${name}:${source}`, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
    }
    return rewritten;
  }

  // A "Confirm your spot" link: remember it through signup so onboarding can bring them back.
  const join = path.match(/^\/join\/([0-9a-f]{32})\/?$/)?.[1];
  if (join) response.cookies.set("mx_join", join, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });

  if (!user && (APP_ROUTES.some((r) => path.startsWith(r)) || path.startsWith("/m/"))) {
    return NextResponse.redirect(new URL("/", publicOrigin(request.headers, request.nextUrl.origin)));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|site/|photos|icon|apple-icon|manifest|.*\\.(?:png|jpg|svg|webmanifest)$).*)"],
};
