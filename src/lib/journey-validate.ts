import type { JourneyAct, JourneyRelease } from "./journey-types.ts";

/** Most acts and releases a Journey import sends at once (matches withApple's own caps). */
export const MAX_ACTS = 6;
export const MAX_RELEASES = 120;
export const MAX_JOURNEY_BYTES = 64 * 1024;

const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : undefined);
const year = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1900 && (v as number) <= 2100 ? (v as number) : undefined);

/**
 * A Journey import body, checked field by field before any provider is called. Returns null
 * when the shape is wrong or anything is over its limit, so oversized work is never started.
 */
export function parseActs(body: unknown): JourneyAct[] | null {
  const acts = (body as { acts?: unknown } | null)?.acts;
  if (!Array.isArray(acts) || acts.length > MAX_ACTS) return null;
  const out: JourneyAct[] = [];
  for (const a of acts) {
    if (!a || typeof a !== "object") return null;
    const r = a as Record<string, unknown>;
    const name = str(r.name, 120)?.trim();
    if (!name || (r.relation !== "self" && r.relation !== "band")) return null;
    if (!Array.isArray(r.releases) || r.releases.length > MAX_RELEASES) return null;
    const releases: JourneyRelease[] = [];
    for (const x of r.releases) {
      const rel = (x ?? {}) as Record<string, unknown>;
      const id = str(rel.id, 200);
      const title = str(rel.title, 200);
      const type = str(rel.type, 30);
      if (!id || !title || !type) return null;
      if (rel.year !== undefined && year(rel.year) === undefined) return null;
      releases.push({ id, title, type, year: year(rel.year), url: str(rel.url, 500), artwork: str(rel.artwork, 500) });
    }
    out.push({
      name,
      relation: r.relation,
      startYear: year(r.startYear),
      endYear: year(r.endYear),
      role: str(r.role, 80),
      releases,
    });
  }
  return out;
}
