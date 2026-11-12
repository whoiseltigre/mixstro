import { NextResponse } from "next/server";
import { relatedArtists } from "@/lib/artist-search";

/** GET /api/artists/related?name=Khruangbin → { artists: [{ id, name, image? }] }, artists similar to that one. */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.slice(0, 100) ?? "";
  try {
    const artists = await relatedArtists(name);
    return NextResponse.json({ artists }, { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=604800" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ artists: [] }, { status: 502 });
  }
}
