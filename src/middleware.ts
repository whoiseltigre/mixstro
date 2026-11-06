import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/redirect";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

const APP_ROUTES = ["/discover", "/board", "/messages", "/me", "/onboarding", "/m/", "/connected", "/search", "/settings"];

// The public website lives on the apex domain; the app lives on app.mixstro.com.
const SITE_HOST = "mixstro.com";
const APP_ORIGIN = "https://app.mixstro.com";
// Paths on mixstro.com that belong to the app, sent over to app.mixstro.com.
const APP_ONLY = [...APP_ROUTES, "/auth"];

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
  if (!isSupabaseConfigured) return NextResponse.next();

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && APP_ROUTES.some((r) => path.startsWith(r))) {
    return NextResponse.redirect(new URL("/", publicOrigin(request.headers, request.nextUrl.origin)));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|site/|photos|icon|apple-icon|manifest|.*\\.(?:png|jpg|svg|webmanifest)$).*)"],
};
