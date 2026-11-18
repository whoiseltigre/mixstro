import type { Artist } from "./onboarding";
import { artistId } from "./artists";

/**
 * "Because you picked X" suggestions on the influences step.
 *
 * We used to show Deezer's related-artists list as is. It knows genres well but leans hard on tiny
 * "discovery" acts (Khruangbin gave Holy Hive and Yuuf, 1k fans each; Snarky Puppy gave Nicolas
 * Gardel), so to most musicians a row of nine looked random. Now we blend two independent sources:
 *
 *  - Deezer related artists: tight on genre, but obscure.
 *  - ListenBrainz similar artists: built from what millions of people actually listen to in the
 *    same sessions, so it names artists musicians recognise. Free, no key. It needs a MusicBrainz id,
 *    which we look up by name.
 *
 * See blend() for the scoring. If MusicBrainz or ListenBrainz is down, we fall back to Deezer
 * alone, still reranked.
 */

export type Similar = Artist & { score: number };

const SHOW = 12;
const SMALL_FANS = 5000;
const TIMEOUT = 4000;
const WEEK = 604800;
const UA = "Mixstro/1.0 ( https://mixstro.com )";
// ListenBrainz's recommended general-purpose similarity model (the one its own artist pages use).
const LB_ALGO = "session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30";

/** "The Beatles", "beatles!" and "Béatles" all become "beatles". */
export function norm(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/^the /, "")
    .replace(/\s+/g, " ")
    .trim();
}

type DeezerArtist = { id: number; name: string; picture_big?: string; nb_fan?: number };
type Candidate = { name: string; deezer?: DeezerArtist; dz?: number; lb?: number };

async function getJson<T>(url: string, retry = 0): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT), next: { revalidate: WEEK } });
  // MusicBrainz allows about one request a second and answers 503 when busy: wait and try again.
  if (res.status === 503 && retry > 0) {
    await new Promise((r) => setTimeout(r, 1100));
    return getJson<T>(url, retry - 1);
  }
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  const body = await res.json();
  // Deezer reports errors (like its 50-requests-per-5-seconds quota) with a 200 and an error object.
  if (body?.error) throw new Error(`${new URL(url).host} ${body.error.message ?? "error"}`);
  return body as T;
}

function photo(a?: DeezerArtist) {
  // Artists without a photo get a placeholder whose path has an empty hash ("/artist//").
  return a?.picture_big && !a.picture_big.includes("/artist//") ? a.picture_big : undefined;
}

/** The Deezer artist with exactly this name, the most-followed one when several share it. */
export async function deezerByName(name: string): Promise<DeezerArtist | undefined> {
  const body = await getJson<{ data?: DeezerArtist[] }>(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=25`);
  const n = norm(name);
  return (body.data ?? []).filter((a) => norm(a.name) === n).sort((x, y) => (y.nb_fan ?? 0) - (x.nb_fan ?? 0))[0];
}

async function deezerRelated(id: number) {
  const body = await getJson<{ data?: DeezerArtist[] }>(`https://api.deezer.com/artist/${id}/related?limit=25`);
  return body.data ?? [];
}

/** MusicBrainz id for a name: the best-scored exact-name match. */
async function musicbrainzId(name: string) {
  const q = encodeURIComponent(`artist:"${name.replace(/"/g, "")}"`);
  const body = await getJson<{ artists?: { id: string; name: string; score: number; aliases?: { name: string }[] }[] }>(`https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=5`, 2);
  const n = norm(name);
  return (body.artists ?? []).find((a) => a.score >= 90 && (norm(a.name) === n || a.aliases?.some((x) => norm(x.name) === n)))?.id;
}

async function listenbrainzSimilar(mbid: string) {
  const body = await getJson<{ name: string; artist_mbid: string; score: number }[]>(`https://labs.api.listenbrainz.org/similar-artists/json?artist_mbids=${mbid}&algorithm=${LB_ALGO}`);
  return Array.isArray(body) ? body : [];
}

/** Settle a promise to undefined instead of throwing: every source is optional. */
const maybe = <T>(p: Promise<T>) => p.catch((e) => (console.warn("similar-artists:", String(e)), undefined));

/**
 * Score candidates. Exported so it can be tested without the network.
 *
 * Deezer's list is the pool, because it stays inside the genre. ListenBrainz votes on it: an artist
 * both agree on gets up to 1.8x its Deezer score. Deezer-only acts under 5k fans drop down. Artists only ListenBrainz
 * names are allowed in only as late filler, at 0.3 weight, because on their own they drift to
 * whoever is most streamed (Zach Bryan → Harry Styles, Chris Stapleton → Ariana Grande).
 */
export function blend(seed: string, dz: DeezerArtist[], lb: { name: string }[]): (Candidate & { score: number })[] {
  const me = norm(seed);
  const DZ = 20;
  const LB = 25;
  const lbRank = new Map<string, number>();
  lb.slice(0, LB).forEach((a, i) => {
    const n = norm(a.name);
    if (n !== me && !lbRank.has(n)) lbRank.set(n, i);
  });
  const by = new Map<string, Candidate & { score: number }>();
  dz.slice(0, DZ).forEach((a, i) => {
    const n = norm(a.name);
    if (n === me || by.has(n)) return;
    const l = lbRank.get(n);
    let score = 1 - i / DZ;
    // Agreement multiplies rather than adds, so a Deezer tail pick can't jump to the top on one vote.
    if (l !== undefined) score *= 1 + 0.8 * (1 - l / LB);
    else if ((a.nb_fan ?? 0) < SMALL_FANS) score *= 0.45;
    by.set(n, { name: a.name, deezer: a, dz: i, lb: l, score });
  });
  for (const [n, l] of lbRank) {
    const name = lb.find((a) => norm(a.name) === n)!.name;
    if (!by.has(n)) by.set(n, { name, lb: l, score: 0.3 * (1 - l / LB) });
  }
  return [...by.values()].sort((x, y) => y.score - x.score);
}

export async function similarArtists(name: string): Promise<Similar[]> {
  const term = name.trim();
  if (!term) return [];
  const [seed, mbid] = await Promise.all([maybe(deezerByName(term)), maybe(musicbrainzId(term))]);
  const [dz, lb] = await Promise.all([seed ? maybe(deezerRelated(seed.id)) : undefined, mbid ? maybe(listenbrainzSimilar(mbid)) : undefined]);
  if (!dz?.length && !lb?.length) return [];

  const ranked = blend(seed?.name ?? term, dz ?? [], lb ?? []);
  // Take a few extra: some ListenBrainz names may turn out to be the same artist on Deezer ("Ye" / "Kanye West").
  const top = ranked.slice(0, SHOW + 4);
  await Promise.all(top.filter((c) => !c.deezer).map(async (c) => (c.deezer = await maybe(deezerByName(c.name)))));

  const seen = new Set<string>([artistId(seed?.name ?? term)]);
  const seenDeezer = new Set<number>(seed ? [seed.id] : []);
  const out: Similar[] = [];
  for (const c of top) {
    // A ListenBrainz-only name Deezer can't find, or finds without a photo, is often a mismatch: skip it.
    if (!c.deezer || (c.dz === undefined && !photo(c.deezer))) continue;
    // ListenBrainz-only filler that's far bigger than the seed is popularity drift (Hozier → Ed Sheeran).
    if (c.dz === undefined && seed?.nb_fan && (c.deezer.nb_fan ?? 0) > seed.nb_fan * 10) continue;
    const display = c.deezer?.name ?? c.name;
    const id = artistId(display);
    if (!id || seen.has(id) || (c.deezer && seenDeezer.has(c.deezer.id))) continue;
    seen.add(id);
    if (c.deezer) seenDeezer.add(c.deezer.id);
    out.push({ id, name: display, image: photo(c.deezer), score: Math.round(c.score * 100) / 100 });
    if (out.length === SHOW) break;
  }
  return out;
}
