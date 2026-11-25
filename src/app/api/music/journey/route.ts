import { NextResponse } from "next/server";
import { appleCandidate, appleJourney, withApple } from "@/lib/journey";
import { MAX_JOURNEY_BYTES, parseActs } from "@/lib/journey-validate";
import { callerIp, memoLookup, readJson, withinBudget } from "@/lib/request-guard";

const cache = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const BUSY = () => NextResponse.json({ error: "busy" }, { status: 429, headers: { "Retry-After": "60" } });

const candidates = memoLookup<Awaited<ReturnType<typeof appleCandidate>> | null>(6 * 3600_000, 10 * 60_000);
const journeys = memoLookup<Awaited<ReturnType<typeof appleJourney>>>(6 * 3600_000, 10 * 60_000);

/**
 * GET ?name=…        → { apple?, image? }  the Apple Music artist by that name, and a photo
 * GET ?id=apple:123  → { name, acts }      an Apple-only discography
 * POST { acts }      → { acts }            MusicBrainz releases with Apple links and artwork added
 *
 * Bodies are capped before parsing and checked field by field before Apple is called; each
 * address has an hourly budget; identical lookups share one answer.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = params.get("id") ?? "";
  if (!(await withinBudget([{ key: `music:journey:ip:${await callerIp()}`, limit: 300, windowSeconds: 3600 }]))) return BUSY();
  if (/^apple:\d{1,15}$/.test(id)) {
    const journey = await journeys(id, () => appleJourney(Number(id.slice(6)))).catch(() => null);
    return NextResponse.json(journey ?? { name: "", acts: [] }, { headers: journey ? cache : {} });
  }
  const name = params.get("name")?.slice(0, 80).trim() ?? "";
  const found = name ? await candidates(name.toLowerCase(), () => appleCandidate(name), (v) => !v || (!v.apple && !v.image)).catch(() => null) : null;
  return NextResponse.json(found ?? {}, { headers: found ? cache : {} });
}

export async function POST(req: Request) {
  const body = await readJson(req, MAX_JOURNEY_BYTES);
  if (body === undefined) return NextResponse.json({ acts: [] }, { status: 413 });
  const acts = parseActs(body);
  if (!acts) return NextResponse.json({ acts: [] }, { status: 400 });
  if (!(await withinBudget([{ key: `music:journey-post:ip:${await callerIp()}`, limit: 60, windowSeconds: 3600 }]))) return BUSY();
  const enriched = await withApple(acts).catch(() => acts);
  return NextResponse.json({ acts: enriched });
}
