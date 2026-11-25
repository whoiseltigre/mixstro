import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/health → which build is live and whether it's wired up.
 * `sha` is the commit the host built (Amplify sets AWS_COMMIT_ID), so anyone can check
 * that production runs the reviewed revision. A production build without its database
 * settings would quietly fall back to demo mode; here that answers 503 so checks catch it.
 * Previews that are meant to run as the demo set MIXSTRO_ALLOW_DEMO=1.
 */
export function GET() {
  const strict = process.env.NODE_ENV === "production" && process.env.MIXSTRO_ALLOW_DEMO !== "1";
  const checks = {
    database: isSupabaseConfigured,
    serverKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const ok = !strict || (checks.database && checks.serverKey);
  return NextResponse.json(
    { ok, sha: process.env.NEXT_PUBLIC_BUILD_SHA || "unknown", builtAt: process.env.NEXT_PUBLIC_BUILT_AT || null, demo: !isSupabaseConfigured, checks },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
