import { NextResponse } from "next/server";
import { activeProvider, searchArtistsRemote } from "@/lib/artist-search";

/** GET /api/artists?q=khruangbin → { provider, artists: [{ id, name, image? }] } */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 100) ?? "";
  try {
    const artists = await searchArtistsRemote(q);
    return NextResponse.json(
      { provider: activeProvider(), artists },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Artist search is unavailable right now." }, { status: 502 });
  }
}
