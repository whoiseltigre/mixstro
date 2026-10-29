import { NextResponse } from "next/server";

/**
 * A redirect with a relative Location, which the browser resolves against the address
 * it actually used. Behind AWS Amplify's proxy `request.nextUrl.origin` is the internal
 * server (http://localhost:3000), so absolute redirects built from it send people there.
 */
export function redirectTo(path: string, init?: { headers?: Headers }) {
  const res = new NextResponse(null, { status: 307, headers: init?.headers });
  res.headers.set("Location", path);
  return res;
}

// Hosts we'll build absolute redirects for. Middleware can't use relative Locations.
const OWN_HOST = /^(?:([a-z0-9-]+\.)*mixstro\.com|[a-z0-9-]+\.[a-z0-9]+\.amplifyapp\.com|localhost(?::\d+)?)$/i;

/**
 * The public origin the visitor used, from the proxy's forwarded headers. Only hosts we
 * own are trusted, so a spoofed header can't turn a redirect into an open redirect.
 */
export function publicOrigin(headers: Headers, fallback: string) {
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim();
  if (!OWN_HOST.test(host)) return fallback;
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}
