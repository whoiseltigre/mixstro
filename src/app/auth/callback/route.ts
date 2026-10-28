import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth (Apple, Google) lands here with a code to exchange for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const supabase = await createClient();
  if (!code || !supabase) return NextResponse.redirect(`${origin}/`);

  const { data: auth, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/?error=auth`);

  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  return NextResponse.redirect(`${origin}${data?.onboarded_at ? "/discover" : "/onboarding/basics"}`);
}
