import { NextResponse } from "next/server";
import { findMusic } from "@/lib/music-finder";

/** GET /api/music/find?name=The+Low+Tides → { artists: [{ name, image?, tracks: [{ title, url, thumb?, source }] }] } */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.slice(0, 80) ?? "";
  const artists = await findMusic(name).catch(() => []);
  return NextResponse.json({ artists }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
