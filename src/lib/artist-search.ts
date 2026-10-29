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

export function activeProvider(): Provider {
  const { APPLE_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY } = process.env;
  return APPLE_TEAM_ID && APPLE_MUSIC_KEY_ID && APPLE_MUSIC_PRIVATE_KEY ? "apple" : "deezer";
}

export async function searchArtistsRemote(q: string): Promise<Artist[]> {
  const term = q.trim();
  if (!term) return [];
  return activeProvider() === "apple" ? searchApple(term) : searchDeezer(term);
}

function dedupe(list: Artist[]) {
  const seen = new Set<string>();
  return list.filter((a) => a.id && (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

// Deezer: https://developers.deezer.com/api/search

type DeezerArtist = { name: string; picture_medium?: string; picture_big?: string };

async function searchDeezer(term: string): Promise<Artist[]> {
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(term)}&limit=${LIMIT}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Deezer search failed: ${res.status}`);
  const body = (await res.json()) as { data?: DeezerArtist[]; error?: { message: string } };
  if (body.error) throw new Error(`Deezer search failed: ${body.error.message}`);
  return dedupe(
    (body.data ?? []).map((a) => ({
      id: artistId(a.name),
      name: a.name,
      // Artists without a photo get a placeholder whose path has an empty hash ("/artist//").
      image: a.picture_big && !a.picture_big.includes("/artist//") ? a.picture_big : undefined,
    })),
  );
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
  const url = `https://api.music.apple.com/v1/catalog/${storefront}/search?types=artists&limit=${LIMIT}&term=${encodeURIComponent(term)}`;
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
