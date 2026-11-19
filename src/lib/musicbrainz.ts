import type { JourneyAct, JourneyArtist, JourneyRelease } from "./journey-types";

/**
 * MusicBrainz lookups for Journey import, run in the musician's browser. MusicBrainz turns
 * away requests from shared cloud servers (ours included), but welcomes browsers: it allows
 * cross-origin requests and limits each visitor to about one request a second.
 */

const MB = "https://musicbrainz.org/ws/2";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const yearOf = (d?: string | null) => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : undefined);
export const norm = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s*[([].*?(remaster|deluxe|edition|version|expanded|anniversary).*?[)\]]/g, "")
    .replace(/\s*-\s*(ep|single)$/, "")
    .replace(/[^a-z0-9]/g, "");

let last = 0;

/** One request at a time, a little over a second apart, with one retry when MusicBrainz is busy. */
async function mb<T>(path: string): Promise<T | null> {
  for (let i = 0; i < 2; i++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(`${MB}${path}${path.includes("?") ? "&" : "?"}fmt=json`, { headers: { Accept: "application/json" } });
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 503) return null;
    } catch {
      // Offline or blocked: one more go.
    }
  }
  return null;
}

type MbArtist = {
  id: string;
  name: string;
  type?: string;
  score?: number;
  disambiguation?: string;
  area?: { name: string };
  "life-span"?: { begin?: string; end?: string; ended?: boolean };
  relations?: { type: string; direction: string; attributes?: string[]; begin?: string | null; end?: string | null; ended?: boolean; artist: { id: string; name: string } }[];
};

/** Up to three artists or bands called (or starting with) what you typed. */
export async function mbSearch(term: string): Promise<JourneyArtist[]> {
  const q = `artist:"${term.trim().replace(/"/g, "")}"`;
  const body = await mb<{ artists: MbArtist[] }>(`/artist/?query=${encodeURIComponent(q)}&limit=5`);
  return (body?.artists ?? [])
    .filter((a) => (a.score ?? 0) >= 90 && norm(a.name).startsWith(norm(term)))
    .slice(0, 3)
    .map((a) => ({
      id: `mb:${a.id}`,
      name: a.name,
      kind: a.type === "Group" ? "group" : "person",
      hint: [a.disambiguation, a.area?.name].filter(Boolean).join(" · ") || undefined,
      since: yearOf(a["life-span"]?.begin),
    }));
}

type MbReleaseGroup = { id: string; title: string; "primary-type"?: string; "secondary-types"?: string[]; "first-release-date"?: string };

async function releases(mbid: string): Promise<JourneyRelease[]> {
  const body = await mb<{ "release-groups": MbReleaseGroup[] }>(`/release-group?artist=${mbid}&type=album|ep|single&limit=100`);
  const groups = (body?.["release-groups"] ?? []).filter((g) => !(g["secondary-types"] ?? []).some((t) => ["Compilation", "DJ-mix", "Remix", "Interview", "Audiobook"].includes(t)));
  const big = groups.filter((g) => g["primary-type"] !== "Single");
  // Lots of albums: leave the singles out so the list stays readable.
  return (big.length >= 5 ? big : groups)
    .map((g) => ({ id: g.id, title: g.title, year: yearOf(g["first-release-date"]), type: g["primary-type"] ?? "Release" }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const span = (rs: JourneyRelease[]) => rs.map((r) => r.year).filter((y): y is number => Boolean(y));

/** Your own releases plus up to four bands you were in, each with their releases (no links yet). */
export async function mbJourney(mbid: string): Promise<{ name: string; acts: JourneyAct[] } | null> {
  const artist = await mb<MbArtist>(`/artist/${mbid}?inc=artist-rels`);
  if (!artist) return null;
  const acts: JourneyAct[] = [];
  const life = artist["life-span"];
  const own = await releases(mbid);
  const ownYears = span(own);
  const group = artist.type === "Group";
  if (own.length || group) {
    acts.push({
      name: artist.name,
      relation: "self",
      startYear: (group ? yearOf(life?.begin) : undefined) ?? (ownYears.length ? Math.min(...ownYears) : undefined),
      endYear: group && life?.ended ? yearOf(life.end) : undefined,
      releases: own,
    });
  }

  // Bands this person was a member of, most recent first.
  const bands = (artist.relations ?? [])
    .filter((r) => r.type === "member of band" && r.direction === "forward")
    .reduce<NonNullable<MbArtist["relations"]>>((list, r) => (list.some((x) => x.artist.id === r.artist.id) ? list : [...list, r]), [])
    .sort((a, b) => (yearOf(b.begin) ?? 0) - (yearOf(a.begin) ?? 0))
    .slice(0, 4);

  for (const b of bands) {
    const rs = await releases(b.artist.id);
    const years = span(rs);
    const instruments = (b.attributes ?? []).filter((a) => !["original", "founder", "additional", "minor"].includes(a));
    acts.push({
      name: b.artist.name,
      relation: "band",
      startYear: yearOf(b.begin) ?? (years.length ? Math.min(...years) : undefined),
      endYear: b.ended ? (yearOf(b.end) ?? (years.length ? Math.max(...years) : undefined)) : undefined,
      role: instruments.length ? cap(instruments.slice(0, 3).join(", ")) : undefined,
      releases: rs,
    });
  }
  return { name: artist.name, acts };
}
