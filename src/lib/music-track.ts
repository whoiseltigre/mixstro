import { parseClip, type ClipProvider } from "./clips";

/**
 * Everything the Mixstro player needs for one linked song, from the link alone:
 * title, artist, artwork, a 30-second preview to play in the app, and the same song on
 * every other service so a listener can open it in the app they use.
 *
 * Each platform's public oEmbed or page tags give the title and artist. Apple's free iTunes
 * catalog and Deezer then find the same song by name, which gives us a 30-second preview and
 * exact links on those services. (Songlink's free API closed in 2026, so we match ourselves.)
 * Every step is optional: whatever fails just leaves that field out, and the player falls
 * back to the platform's own embed.
 */

export type Platform = "spotify" | "appleMusic" | "youtube" | "soundcloud" | "deezer" | "bandcamp";

export const PLATFORM_LABEL: Record<Platform, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  deezer: "Deezer",
  bandcamp: "Bandcamp",
};

/** The order listeners see the "Listen in full on" choices. */
export const PLATFORM_ORDER: Platform[] = ["spotify", "appleMusic", "youtube", "soundcloud", "bandcamp", "deezer"];

export type TrackDetails = {
  title?: string;
  artist?: string;
  artwork?: string;
  /** A short preview (usually 30 s) we can play in our own player. */
  preview?: string;
  /** Release year, when a catalog knows it. */
  year?: number;
  links: Partial<Record<Platform, string>>;
};

const UA = "Mixstro/1.0 ( https://mixstro.com )";
const WEEK = 60 * 60 * 24 * 7;

async function getJson<T>(url: string, timeout = 5000): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(timeout), next: { revalidate: WEEK } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type ItunesItem = {
  wrapperType: string;
  kind?: string;
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  releaseDate?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
};

export const bigArtwork = (u?: string) => u?.replace(/\/\d+x\d+(bb)?\.(jpg|png|webp)$/, "/600x600bb.$2");
const yearOf = (d?: string) => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : undefined);

/** An Apple song or album id → preview, title and year. Albums preview their first song. */
async function itunes(id: string): Promise<Partial<TrackDetails> | null> {
  const body = await getJson<{ results: ItunesItem[] }>(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=1`);
  const items = body?.results ?? [];
  const head = items[0];
  const song = items.find((r) => r.kind === "song" && r.previewUrl);
  if (!head && !song) return null;
  const isSong = head?.kind === "song";
  return {
    title: (isSong ? head.trackName : head?.collectionName) ?? song?.trackName,
    artist: head?.artistName ?? song?.artistName,
    artwork: bigArtwork(head?.artworkUrl100 ?? song?.artworkUrl100),
    preview: song?.previewUrl,
    year: yearOf(head?.releaseDate ?? song?.releaseDate),
  };
}

type DeezerTrack = { preview?: string; title?: string; artist?: { name: string }; album?: { cover_big?: string; title?: string }; release_date?: string };

async function deezer(kind: "track" | "album", id: string): Promise<Partial<TrackDetails> | null> {
  if (kind === "track") {
    const t = await getJson<DeezerTrack>(`https://api.deezer.com/track/${id}`);
    return t?.preview ? { title: t.title, artist: t.artist?.name, artwork: t.album?.cover_big, preview: t.preview, year: yearOf(t.release_date) } : null;
  }
  const a = await getJson<{ title?: string; artist?: { name: string }; cover_big?: string; release_date?: string; tracks?: { data: DeezerTrack[] } }>(`https://api.deezer.com/album/${id}`);
  const first = a?.tracks?.data.find((t) => t.preview);
  return a ? { title: a.title, artist: a.artist?.name, artwork: a.cover_big, preview: first?.preview, year: yearOf(a.release_date) } : null;
}

/** Apple ids from a music.apple.com link: ?i= is the song, the last path number the album or song. */
function appleId(url: string) {
  try {
    const u = new URL(url);
    return u.searchParams.get("i") ?? u.pathname.match(/\/(\d+)\/?$/)?.[1] ?? u.pathname.match(/id(\d+)/)?.[1];
  } catch {
    return undefined;
  }
}

function deezerRef(url: string): ["track" | "album", string] | undefined {
  const m = url.match(/deezer\.com\/(?:[a-z]{2}\/)?(track|album)\/(\d+)/);
  return m ? [m[1] as "track" | "album", m[2]] : undefined;
}

/** Lowercase letters and digits only, so "Don't Stop (Remastered)" ≈ "dont stop". */
const norm = (s = "") =>
  s
    .toLowerCase()
    .replace(/\s*[([].*?(remaster|live|version|edit|mix|official|video|audio|lyric|feat|ft\.).*?[)\]]/g, "")
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
const same = (a?: string, b?: string) => {
  const x = norm(a);
  const y = norm(b);
  return Boolean(x && y && (x === y || (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x)))));
};

function meta(html: string, prop: string) {
  const v = html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`))?.[1] ?? html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${prop}"`))?.[1];
  return v?.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
}

async function page(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Mixstro/1.0)" }, signal: AbortSignal.timeout(5000), next: { revalidate: WEEK } });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

type Basics = { title?: string; artist?: string; artwork?: string; kind: "song" | "album" };

/** Title and artist as the platform itself describes the link. */
async function basics(provider: ClipProvider, url: string): Promise<Basics | null> {
  const kind: Basics["kind"] = /\/album\//.test(url) && !/[?&]i=/.test(url) ? "album" : "song";
  if (provider === "spotify") {
    // og:description reads "Artist · Album · Song · 2019" (or "Artist · Album · 2019").
    const html = await page(url);
    if (!html) return null;
    const title = meta(html, "og:title");
    const artist = meta(html, "music:musician_description") ?? meta(html, "og:description")?.split(" · ")[0];
    return { title, artist, artwork: meta(html, "og:image"), kind };
  }
  if (provider === "soundcloud" || provider === "youtube") {
    const endpoint = provider === "soundcloud" ? "https://soundcloud.com/oembed?format=json&url=" : "https://www.youtube.com/oembed?format=json&url=";
    const o = await getJson<{ title?: string; author_name?: string; thumbnail_url?: string }>(endpoint + encodeURIComponent(url));
    if (!o?.title) return null;
    // SoundCloud: "Song by Artist". YouTube: often "Artist - Song (Official Video)".
    const sc = provider === "soundcloud" ? o.title.match(/^(.*) by (.*)$/) : null;
    const yt = provider === "youtube" ? o.title.match(/^(.+?)\s+[-–—]\s+(.+)$/) : null;
    if (sc) return { title: sc[1], artist: sc[2], artwork: o.thumbnail_url, kind };
    if (yt) return { title: yt[2], artist: yt[1], artwork: o.thumbnail_url, kind };
    return { title: o.title, artist: o.author_name?.replace(/\s*-\s*Topic$|VEVO$/i, ""), artwork: o.thumbnail_url, kind };
  }
  if (provider === "bandcamp") {
    const html = await page(url.split("#")[0]);
    const og = html ? meta(html, "og:title") : undefined; // "Song, by Artist"
    const m = og?.match(/^(.*), by (.*)$/);
    return m ? { title: m[1], artist: m[2], artwork: html ? meta(html, "og:image") : undefined, kind: /\/album\//.test(url) ? "album" : "song" } : null;
  }
  return null;
}

/** The same song (or album) in Apple's catalog, found by name. */
async function appleByName(b: Basics) {
  if (!b.title || !b.artist) return null;
  const entity = b.kind === "album" ? "album" : "song";
  const body = await getJson<{ results: ItunesItem[] }>(`https://itunes.apple.com/search?term=${encodeURIComponent(`${b.artist} ${b.title}`)}&entity=${entity}&limit=8`);
  const hit = (body?.results ?? []).find((r) => same(r.artistName, b.artist) && same(entity === "album" ? r.collectionName : r.trackName, b.title));
  if (!hit) return null;
  const link = (entity === "album" ? hit.collectionViewUrl : hit.trackViewUrl)?.replace(/[?&]uo=\d+/, "");
  return { link, id: link ? appleId(link) : undefined, year: yearOf(hit.releaseDate), artwork: bigArtwork(hit.artworkUrl100), preview: hit.previewUrl };
}

/** The same song on Deezer, found by name: another source of previews. */
async function deezerByName(b: Basics) {
  if (!b.title || !b.artist || b.kind === "album") return null;
  const q = `artist:"${b.artist.replace(/"/g, "")}" track:"${b.title.replace(/"/g, "")}"`;
  const body = await getJson<{ data?: (DeezerTrack & { link?: string })[] }>(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`);
  const hit = body?.data?.find((t) => same(t.artist?.name, b.artist) && same(t.title, b.title));
  return hit ? { link: hit.link, preview: hit.preview, artwork: hit.album?.cover_big } : null;
}

/** All we can find about one song or album link. Never throws. */
export async function trackDetails(raw: string): Promise<TrackDetails> {
  const clip = parseClip(raw);
  if (!clip) return { links: {} };
  const own: Partial<Record<ClipProvider, Platform>> = { spotify: "spotify", apple_music: "appleMusic", youtube: "youtube", soundcloud: "soundcloud", bandcamp: "bandcamp" };
  const out: TrackDetails = { links: {} };
  const ownPlatform = own[clip.provider];
  if (ownPlatform) out.links[ownPlatform] = clip.url.split("#")[0];

  if (clip.provider === "apple_music") {
    const id = appleId(clip.url);
    const a = id ? await itunes(id) : null;
    Object.assign(out, { title: a?.title, artist: a?.artist, artwork: a?.artwork, preview: a?.preview, year: a?.year });
    const dz = a?.preview ? null : await deezerByName({ title: a?.title, artist: a?.artist, kind: "song" });
    if (dz) Object.assign(out, { preview: dz.preview });
    if (dz?.link) out.links.deezer = dz.link;
    return out;
  }

  const b = await basics(clip.provider, clip.url);
  if (!b) return { ...out, artwork: clip.thumb };
  out.title = b.title;
  out.artist = b.artist;
  const [apple, dz] = await Promise.all([appleByName(b), deezerByName(b)]);
  // An album's preview comes from its first song.
  const albumSong = apple?.id && b.kind === "album" ? await itunes(apple.id) : null;
  if (apple?.link) out.links.appleMusic = apple.link;
  if (dz?.link) out.links.deezer = dz.link;
  out.year = apple?.year;
  // Videos keep their own thumbnail; songs look best with album art.
  out.artwork = clip.shape === "square" ? (apple?.artwork ?? b.artwork ?? dz?.artwork) : (b.artwork ?? clip.thumb);
  out.preview = apple?.preview ?? albumSong?.preview ?? dz?.preview;
  return out;
}

/**
 * A Deezer link (which we can't embed) → the same song on Apple Music, which we can.
 * Returns undefined when there's no match.
 */
export async function playableLink(raw: string): Promise<string | undefined> {
  const ref = deezerRef(raw);
  if (!ref) return undefined;
  const d = await deezer(...ref);
  if (!d?.title || !d.artist) return undefined;
  const apple = await appleByName({ title: d.title, artist: d.artist, kind: ref[0] === "album" ? "album" : "song" });
  return apple?.link;
}
