import { NextResponse } from "next/server";
import { appleCandidate, appleJourney, withApple, type JourneyAct } from "@/lib/journey";

const cache = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

/**
 * GET ?name=…        → { apple?, image? }  the Apple Music artist by that name, and a photo
 * GET ?id=apple:123  → { name, acts }      an Apple-only discography
 * POST { acts }      → { acts }            MusicBrainz releases with Apple links and artwork added
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = params.get("id") ?? "";
  if (/^apple:\d+$/.test(id)) {
    const journey = await appleJourney(Number(id.slice(6))).catch(() => null);
    return NextResponse.json(journey ?? { name: "", acts: [] }, { headers: journey ? cache : {} });
  }
  const found = await appleCandidate(params.get("name")?.slice(0, 80) ?? "").catch(() => ({}));
  return NextResponse.json(found, { headers: cache });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { acts?: JourneyAct[] } | null;
  if (!Array.isArray(body?.acts)) return NextResponse.json({ acts: [] }, { status: 400 });
  const acts = await withApple(body.acts).catch(() => body.acts!);
  return NextResponse.json({ acts });
}
