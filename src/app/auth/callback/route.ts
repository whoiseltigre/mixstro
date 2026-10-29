import type { NextRequest } from "next/server";
import { redirectTo } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

/** OAuth (Apple, Google) and the email sign-in link land here with a code to exchange for a session. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const supabase = await createClient();
  if (!code || !supabase) return redirectTo("/");

  const { data: auth, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirectTo("/?error=auth");

  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  return redirectTo(data?.onboarded_at ? "/discover" : "/onboarding/basics");
}
