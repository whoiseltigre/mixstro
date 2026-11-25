import { NextResponse } from "next/server";
import { findMusic } from "@/lib/music-finder";
import { callerIp, memoLookup, withinBudget } from "@/lib/request-guard";

const lookups = memoLookup<Awaited<ReturnType<typeof findMusic>>>(6 * 3600_000, 10 * 60_000, 300);

/** GET /api/music/find?name=The+Low+Tides → { artists: [{ name, image?, tracks: [{ title, url, thumb?, source }] }] } */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.slice(0, 80).trim() ?? "";
  if (!(await withinBudget([{ key: `music:find:ip:${await callerIp()}`, limit: 120, windowSeconds: 3600 }]))) {
    return NextResponse.json({ artists: [] }, { status: 429, headers: { "Retry-After": "60" } });
  }
  // Errors aren't cached, so a provider hiccup recovers on the next try.
  const artists = name.length >= 2 ? await lookups(name.toLowerCase(), () => findMusic(name), (a) => !a.length).catch(() => null) : [];
  return NextResponse.json({ artists: artists ?? [] }, { headers: artists?.length ? { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } : { "Cache-Control": "no-store" } });
}
