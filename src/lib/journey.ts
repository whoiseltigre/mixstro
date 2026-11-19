import { bigArtwork } from "./music-track";
import { norm, yearOf } from "./musicbrainz";
import type { JourneyAct, JourneyArtist, JourneyRelease } from "./journey-types";

export type { JourneyAct, JourneyArtist, JourneyRelease } from "./journey-types";

/**
 * Journey import, server half: Apple's free catalog gives each release a link that plays on
 * Mixstro and its artwork, Deezer gives artist photos, and artists MusicBrainz doesn't know
 * (most self-released musicians) get their whole Apple discography. The MusicBrainz half
 * runs in the browser (see musicbrainz.ts).
 */

const DAY = 86400;

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: DAY } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type ItunesArtist = { artistId: number; artistName: string; primaryGenreName?: string };
type ItunesAlbum = { wrapperType: string; artistName?: string; collectionName?: string; collectionViewUrl?: string; artworkUrl100?: string; releaseDate?: string };

async function appleArtist(name: string) {
  const body = await json<{ results: ItunesArtist[] }>(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=5`);
  return body?.results.find((a) => norm(a.artistName) === norm(name));
}

async function appleAlbums(artistId: number) {
  const body = await json<{ results: ItunesAlbum[] }>(`https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=200`);
  return (body?.results ?? []).filter((r) => r.wrapperType === "collection" && r.collectionName && r.collectionViewUrl);
}

async function deezerPhoto(name: string) {
  const body = await json<{ data?: { name: string; picture_big?: string; nb_fan?: number }[] }>(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`);
  const best = (body?.data ?? []).filter((a) => norm(a.name) === norm(name)).sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
  return best?.picture_big?.includes("/artist//") ? undefined : best?.picture_big;
}

const cleanUrl = (u: string) => u.replace(/[?&]uo=\d+/, "");

/** The Apple Music artist with exactly this name, plus a photo for it. */
export async function appleCandidate(name: string): Promise<{ apple?: JourneyArtist; image?: string }> {
  const term = name.trim();
  if (term.length < 2) return {};
  const [a, image] = await Promise.all([appleArtist(term), deezerPhoto(term)]);
  return { image, apple: a ? { id: `apple:${a.artistId}`, name: a.artistName, kind: "person", hint: a.primaryGenreName, image } : undefined };
}

/** Give each release Apple's link and artwork when Apple has it under the same title. */
export async function withApple(acts: JourneyAct[]): Promise<JourneyAct[]> {
  return Promise.all(
    acts.slice(0, 6).map(async (act) => {
      const artist = await appleArtist(act.name);
      const albums = artist ? await appleAlbums(artist.artistId) : [];
      const byTitle = new Map(albums.map((a) => [norm(a.collectionName!.replace(/ - (Single|EP)$/, "")), a]));
      const releases = act.releases.slice(0, 120).map((r): JourneyRelease => {
        const a = byTitle.get(norm(r.title));
        return a ? { ...r, url: cleanUrl(a.collectionViewUrl!), artwork: bigArtwork(a.artworkUrl100), year: r.year ?? yearOf(a.releaseDate) } : r;
      });
      return { ...act, releases };
    }),
  );
}

/** Everything Apple has for an artist MusicBrainz doesn't know, as one act. */
export async function appleJourney(artistId: number): Promise<{ name: string; acts: JourneyAct[] } | null> {
  const albums = await appleAlbums(artistId);
  if (!albums.length) return null;
  const name = albums[0].artistName ?? "";
  const releases = albums
    .map((a) => ({
      id: a.collectionViewUrl!,
      title: a.collectionName!.replace(/ - (Single|EP)$/, ""),
      year: yearOf(a.releaseDate),
      type: / - Single$/.test(a.collectionName!) ? "Single" : / - EP$/.test(a.collectionName!) ? "EP" : "Album",
      url: cleanUrl(a.collectionViewUrl!),
      artwork: bigArtwork(a.artworkUrl100),
    }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const years = releases.map((r) => r.year).filter((y): y is number => Boolean(y));
  return { name, acts: [{ name, relation: "self", startYear: years.length ? Math.min(...years) : undefined, releases }] };
}
