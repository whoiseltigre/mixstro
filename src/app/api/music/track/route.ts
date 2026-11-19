import { NextResponse } from "next/server";
import { trackDetails } from "@/lib/music-track";

/** GET /api/music/track?url=… → { title?, artist?, artwork?, preview?, year?, links } for the Mixstro player. */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url")?.slice(0, 500) ?? "";
  const details = await trackDetails(url).catch(() => ({ links: {} }));
  return NextResponse.json(details, { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000" } });
}
