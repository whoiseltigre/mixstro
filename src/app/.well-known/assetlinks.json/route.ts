import { NextResponse } from "next/server";

/**
 * App Links for the Android app: tapping an app.mixstro.com link opens the app instead of
 * Chrome when it's installed. ANDROID_CERT_SHA256 is the app signing key's SHA-256 fingerprint
 * from Play Console (Test and release > App integrity); several can be comma-separated, e.g.
 * the Play key plus a local upload key.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!prints.length) return NextResponse.json({ error: "not set up" }, { status: 404 });
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
        target: { namespace: "android_app", package_name: "com.mixstro.app", sha256_cert_fingerprints: prints },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
