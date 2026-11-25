import { NextResponse } from "next/server";
import { trackDetails, type TrackDetails } from "@/lib/music-track";
import { callerIp, memoLookup, withinBudget } from "@/lib/request-guard";

const lookups = memoLookup<TrackDetails>(24 * 3600_000, 10 * 60_000, 1000);

/** GET /api/music/track?url=… → { title?, artist?, artwork?, preview?, year?, links } for the Mixstro player. */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url")?.slice(0, 500) ?? "";
  if (!(await withinBudget([{ key: `music:track:ip:${await callerIp()}`, limit: 600, windowSeconds: 3600 }]))) {
    return NextResponse.json({ links: {} }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const details = await lookups(url, () => trackDetails(url), (d) => !d.title && !d.preview).catch(() => null);
  return NextResponse.json(details ?? { links: {} }, {
    headers: details ? { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000" } : { "Cache-Control": "no-store" },
  });
}
