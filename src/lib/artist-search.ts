import { createPrivateKey, sign } from "node:crypto";
import type { Artist } from "./onboarding";
import { artistId } from "./artists";

/**
 * Artist search with photos, run on the server. Uses Apple Music once its
 * MusicKit key is set (APPLE_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY),
 * otherwise Deezer, which needs no key.
 *
 * Artist ids are a slug of the name on every provider, so influence overlap
 * keeps matching when we switch providers.
 */
export type Provider = "apple" | "deezer";

const LIMIT = 8;
/** Ask providers for more than we show, so our own ranking has something to choose from. */
const FETCH = 25;

export function activeProvider(): Provider {
  const { APPLE_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY } = process.env;
  return APPLE_TEAM_ID && APPLE_MUSIC_KEY_ID && APPLE_MUSIC_PRIVATE_KEY ? "apple" : "deezer";
}

export async function searchArtistsRemote(q: string): Promise<Artist[]> {
  const term = q.trim();
  if (!term) return [];
  const found = activeProvider() === "apple" ? await searchApple(term) : await deezerSearch(term);
  return rankArtists(term, found).slice(0, LIMIT).map(({ id, name, image }) => ({ id, name, image }));
}

type Ranked = Artist & { fans?: number };

/** "The Beatles", "beatles!" and "Béatles" all become "beatles". */
function norm(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/^the /, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Providers rank by fuzzy spelling, so "La Roux" could beat an exact "Ameroux". We rank ourselves:
 * exact name, then names starting with what you typed, then a word starting with it, then names
 * containing it, and only then sound-alikes. Within a group the artist with more fans comes first.
 * Sound-alikes are dropped when there are already a few real hits.
 */
export function rankArtists<T extends Ranked>(term: string, list: T[]): T[] {
  const q = norm(term);
  if (!q) return list;
  const tier = (name: string) => {
    const n = norm(name);
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.split(" ").some((w) => w.startsWith(q))) return 2;
    if (n.includes(q) || n.replace(/ /g, "").includes(q.replace(/ /g, ""))) return 3;
    return 4;
  };
  const scored = list.map((a, i) => ({ a, t: tier(a.name), i }));
  scored.sort((x, y) => x.t - y.t || (y.a.fans ?? 0) - (x.a.fans ?? 0) || x.i - y.i);
  const strong = scored.filter((x) => x.t < 4).length;
  return scored.filter((x) => x.t < 4 || strong < 3).map((x) => x.a);
}

/**
 * Artists similar to the one you picked, for the "sounds like" step: Deezer's related artists
 * (free, no key) for whichever provider runs search. Finds the artist by name first.
 */
export async function relatedArtists(name: string): Promise<Artist[]> {
  const term = name.trim();
  if (!term) return [];
  const found = rankArtists(term, await deezerSearch(term));
  const me = found[0];
  if (!me?.deezerId || norm(me.name) !== norm(term)) return [];
  const res = await fetch(`https://api.deezer.com/artist/${me.deezerId}/related?limit=12`, { next: { revalidate: 604800 } });
  if (!res.ok) throw new Error(`Deezer related failed: ${res.status}`);
  const body = (await res.json()) as { data?: DeezerArtist[]; error?: { message: string } };
  if (body.error) throw new Error(`Deezer related failed: ${body.error.message}`);
  return dedupe((body.data ?? []).map(fromDeezer)).filter((a) => a.id !== me.id).map(({ id, name, image }) => ({ id, name, image }));
}

function dedupe<T extends Artist>(list: T[]) {
  const seen = new Set<string>();
  return list.filter((a) => a.id && (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

// Deezer: https://developers.deezer.com/api/search

type DeezerArtist = { id?: number; name: string; picture_medium?: string; picture_big?: string; nb_fan?: number };
type DeezerHit = Ranked & { deezerId?: number };

function fromDeezer(a: DeezerArtist): DeezerHit {
  return {
    id: artistId(a.name),
    name: a.name,
    // Artists without a photo get a placeholder whose path has an empty hash ("/artist//").
    image: a.picture_big && !a.picture_big.includes("/artist//") ? a.picture_big : undefined,
    fans: a.nb_fan,
    deezerId: a.id,
  };
}

async function deezerSearch(term: string): Promise<DeezerHit[]> {
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(term)}&limit=${FETCH}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Deezer search failed: ${res.status}`);
  const body = (await res.json()) as { data?: DeezerArtist[]; error?: { message: string } };
  if (body.error) throw new Error(`Deezer search failed: ${body.error.message}`);
  return dedupe((body.data ?? []).map(fromDeezer));
}

// Apple Music: https://developer.apple.com/documentation/applemusicapi/search_for_catalog_resources

type AppleArtist = { attributes?: { name: string; artwork?: { url: string } } };

let appleToken: { value: string; expires: number } | undefined;

/** A developer token: an ES256 JWT signed with the MusicKit key, reused for 12 hours. */
function appleDeveloperToken() {
  const now = Math.floor(Date.now() / 1000);
  if (appleToken && appleToken.expires - 60 > now) return appleToken.value;
  const exp = now + 12 * 3600;
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = `${enc({ alg: "ES256", kid: process.env.APPLE_MUSIC_KEY_ID })}.${enc({ iss: process.env.APPLE_TEAM_ID, iat: now, exp })}`;
  const key = createPrivateKey(process.env.APPLE_MUSIC_PRIVATE_KEY!.replace(/\\n/g, "\n"));
  const sig = sign("sha256", Buffer.from(head), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  appleToken = { value: `${head}.${sig}`, expires: exp };
  return appleToken.value;
}

async function searchApple(term: string): Promise<Artist[]> {
  const storefront = process.env.APPLE_MUSIC_STOREFRONT || "us";
  const url = `https://api.music.apple.com/v1/catalog/${storefront}/search?types=artists&limit=${FETCH}&term=${encodeURIComponent(term)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${appleDeveloperToken()}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Apple Music search failed: ${res.status}`);
  const body = (await res.json()) as { results?: { artists?: { data?: AppleArtist[] } } };
  return dedupe(
    (body.results?.artists?.data ?? []).flatMap((a) =>
      a.attributes
        ? [{ id: artistId(a.attributes.name), name: a.attributes.name, image: a.attributes.artwork?.url.replace("{w}x{h}", "300x300") }]
        : [],
    ),
  );
}
