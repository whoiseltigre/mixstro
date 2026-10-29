import type { NextRequest } from "next/server";
import { redirectTo } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

/** OAuth (Apple, Google) and the email sign-in link land here with a code to exchange for a session. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  // Only same-site paths, e.g. "/settings" after linking Google from Settings.
  const next = searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
  const supabase = await createClient();
  if (!code || !supabase) return redirectTo("/");

  const { data: auth, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirectTo("/?error=auth");

  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!data?.onboarded_at) return redirectTo("/onboarding/basics");
  return redirectTo(safeNext ?? "/discover");
}
