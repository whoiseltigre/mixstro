import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/redirect";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

const APP_ROUTES = ["/discover", "/board", "/messages", "/me", "/onboarding", "/m/", "/connected", "/search", "/settings"];

export async function middleware(request: NextRequest) {
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
  matcher: ["/((?!_next/static|_next/image|photos|icon|apple-icon|manifest|.*\\.(?:png|jpg|svg|webmanifest)$).*)"],
};
