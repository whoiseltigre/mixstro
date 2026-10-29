import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth (Apple, Google) and the email sign-in link land here with a code to exchange for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Only same-site paths, e.g. "/settings" after linking Google from Settings.
  const next = searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
  const supabase = await createClient();
  if (!code || !supabase) return NextResponse.redirect(`${origin}/`);

  const { data: auth, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/?error=auth`);

  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!data?.onboarded_at) return NextResponse.redirect(`${origin}/onboarding/basics`);
  return NextResponse.redirect(`${origin}${safeNext ?? "/discover"}`);
}
