import { NextResponse } from "next/server";
import { similarArtists } from "@/lib/similar-artists";

/** GET /api/artists/related?name=Khruangbin → { artists: [{ id, name, image? }] }, artists similar to that one
 * (Deezer and ListenBrainz blended, see src/lib/similar-artists.ts). */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.slice(0, 100) ?? "";
  try {
    const artists = (await similarArtists(name)).map(({ id, name, image }) => ({ id, name, image }));
    return NextResponse.json({ artists }, { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=604800" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ artists: [] }, { status: 502 });
  }
}
