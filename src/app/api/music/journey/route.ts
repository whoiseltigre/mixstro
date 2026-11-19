import { NextResponse } from "next/server";
import { findJourneyArtists, journeyFor } from "@/lib/journey";

// Looking up a whole discography respects MusicBrainz's one-request-a-second limit, so give it time.
export const maxDuration = 30;

/**
 * GET /api/music/journey?name=… → { artists } ("Is this you?" candidates)
 * GET /api/music/journey?id=mb:… → { name, acts } (your releases and bands, by year)
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const cache = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
  const id = params.get("id")?.slice(0, 60);
  if (id) {
    const journey = await journeyFor(id).catch(() => null);
    return NextResponse.json(journey ?? { name: "", acts: [] }, { headers: journey ? cache : {} });
  }
  const artists = await findJourneyArtists(params.get("name")?.slice(0, 80) ?? "").catch(() => []);
  return NextResponse.json({ artists }, { headers: cache });
}
