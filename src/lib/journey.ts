import { bigArtwork } from "./music-track";

/**
 * Journey import: type the name you release under and we lay out your releases by year,
 * plus the bands you were in (with years and what you played). MusicBrainz knows band
 * memberships and release years; Apple's free catalog gives each release a link that plays
 * on Mixstro and its artwork. Artists MusicBrainz doesn't know (most self-released musicians)
 * fall back to Apple's catalog alone.
 *
 * MusicBrainz asks for at most one request a second and a descriptive User-Agent.
 */

export type JourneyArtist = {
  /** "mb:<MBID>" or "apple:<artistId>". */
  id: string;
  name: string;
  kind: "person" | "group";
  /** "UK rock band", "Austin, TX", genre… whatever helps you tell namesakes apart. */
  hint?: string;
  since?: number;
  image?: string;
};

export type JourneyRelease = { id: string; title: string; year?: number; type: string; url?: string; artwork?: string };

export type JourneyAct = {
  name: string;
  /** "self" is your own name; "band" one you were a member of. */
  relation: "self" | "band";
  startYear?: number;
  endYear?: number;
  role?: string;
  releases: JourneyRelease[];
};

const UA = "Mixstro/1.0 ( https://mixstro.com )";
const DAY = 86400;
const MB = "https://musicbrainz.org/ws/2";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const yearOf = (d?: string | null) => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : undefined);
const norm = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s*[([].*?(remaster|deluxe|edition|version|expanded|anniversary).*?[)\]]/g, "")
    .replace(/\s*-\s*(ep|single)$/, "")
    .replace(/[^a-z0-9]/g, "");

async function json<T>(url: string, tries = 2): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: DAY } });
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 503) return null;
    } catch {
      // Network hiccup: one more go.
    }
    await sleep(1100);
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

type ItunesArtist = { artistId: number; artistName: string; primaryGenreName?: string };
type ItunesAlbum = { wrapperType: string; collectionName?: string; collectionViewUrl?: string; artworkUrl100?: string; releaseDate?: string; trackCount?: number; collectionType?: string };

async function appleArtist(name: string) {
  const body = await json<{ results: ItunesArtist[] }>(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=5`, 1);
  return body?.results.find((a) => norm(a.artistName) === norm(name));
}

async function appleAlbums(artistId: number) {
  const body = await json<{ results: ItunesAlbum[] }>(`https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=200`, 1);
  return (body?.results ?? []).filter((r) => r.wrapperType === "collection" && r.collectionName && r.collectionViewUrl);
}

async function deezerPhoto(name: string) {
  const body = await json<{ data?: { name: string; picture_big?: string; nb_fan?: number }[] }>(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`, 1);
  const best = (body?.data ?? []).filter((a) => norm(a.name) === norm(name)).sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
  return best?.picture_big?.includes("/artist//") ? undefined : best?.picture_big;
}

/** Up to three artists or bands called (or starting with) what you typed. */
export async function findJourneyArtists(name: string): Promise<JourneyArtist[]> {
  const term = name.trim();
  if (term.length < 2) return [];
  const q = `artist:"${term.replace(/"/g, "")}"`;
  const [mb, apple] = await Promise.all([json<{ artists: MbArtist[] }>(`${MB}/artist/?query=${encodeURIComponent(q)}&fmt=json&limit=5`), appleArtist(term)]);
  const close = (mb?.artists ?? []).filter((a) => (a.score ?? 0) >= 90 && norm(a.name).startsWith(norm(term))).slice(0, 3);
  const found: JourneyArtist[] = close.map((a) => ({
    id: `mb:${a.id}`,
    name: a.name,
    kind: a.type === "Group" ? "group" : "person",
    hint: [a.disambiguation, a.area?.name].filter(Boolean).join(" · ") || undefined,
    since: yearOf(a["life-span"]?.begin),
  }));
  // Self-released musicians are usually on Apple Music but not in MusicBrainz.
  if (apple && !found.some((f) => norm(f.name) === norm(apple.artistName))) {
    found.push({ id: `apple:${apple.artistId}`, name: apple.artistName, kind: "person", hint: apple.primaryGenreName });
  }
  const photos = await Promise.all(found.map((f) => deezerPhoto(f.name)));
  return found.map((f, i) => ({ ...f, image: photos[i] }));
}

type MbReleaseGroup = { id: string; title: string; "primary-type"?: string; "secondary-types"?: string[]; "first-release-date"?: string };

async function releaseGroups(mbid: string) {
  const body = await json<{ "release-groups": MbReleaseGroup[] }>(`${MB}/release-group?artist=${mbid}&type=album|ep|single&fmt=json&limit=100`);
  const groups = (body?.["release-groups"] ?? []).filter((g) => !(g["secondary-types"] ?? []).some((t) => ["Compilation", "DJ-mix", "Remix", "Interview", "Audiobook"].includes(t)));
  const big = groups.filter((g) => g["primary-type"] !== "Single");
  // Lots of albums: leave the singles out so the list stays readable.
  return big.length >= 5 ? big : groups;
}

/** Give each release Apple's link and artwork when Apple has it under the same title. */
function withApple(releases: JourneyRelease[], albums: ItunesAlbum[]): JourneyRelease[] {
  const byTitle = new Map(albums.map((a) => [norm(a.collectionName), a]));
  return releases.map((r) => {
    const a = byTitle.get(norm(r.title));
    return a ? { ...r, url: a.collectionViewUrl!.replace(/[?&]uo=\d+/, ""), artwork: bigArtwork(a.artworkUrl100), year: r.year ?? yearOf(a.releaseDate) } : r;
  });
}

async function actReleases(mbid: string, name: string): Promise<JourneyRelease[]> {
  const [groups, apple] = await Promise.all([releaseGroups(mbid), appleArtist(name)]);
  const albums = apple ? await appleAlbums(apple.artistId) : [];
  const releases = groups.map((g) => ({ id: g.id, title: g.title, year: yearOf(g["first-release-date"]), type: g["primary-type"] ?? "Release" }));
  return withApple(releases, albums).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Your own releases plus up to four bands you were in, each with their releases. */
export async function journeyFor(id: string): Promise<{ name: string; acts: JourneyAct[] } | null> {
  if (id.startsWith("apple:")) {
    const albums = await appleAlbums(Number(id.slice(6)));
    if (!albums.length) return null;
    const name = (albums[0] as ItunesAlbum & { artistName?: string }).artistName ?? "";
    const releases = albums
      .map((a) => ({
        id: a.collectionViewUrl!,
        title: a.collectionName!.replace(/ - (Single|EP)$/, ""),
        year: yearOf(a.releaseDate),
        type: / - Single$/.test(a.collectionName!) ? "Single" : / - EP$/.test(a.collectionName!) ? "EP" : "Album",
        url: a.collectionViewUrl!.replace(/[?&]uo=\d+/, ""),
        artwork: bigArtwork(a.artworkUrl100),
      }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const years = releases.map((r) => r.year).filter((y): y is number => Boolean(y));
    return { name, acts: [{ name, relation: "self", startYear: years.length ? Math.min(...years) : undefined, releases }] };
  }

  const mbid = id.replace(/^mb:/, "");
  if (!/^[0-9a-f-]{36}$/.test(mbid)) return null;
  const artist = await json<MbArtist>(`${MB}/artist/${mbid}?inc=artist-rels&fmt=json`);
  if (!artist) return null;

  const acts: JourneyAct[] = [];
  const life = artist["life-span"];
  await sleep(1000);
  const own = await actReleases(mbid, artist.name);
  const ownYears = own.map((r) => r.year).filter((y): y is number => Boolean(y));
  if (own.length || artist.type === "Group") {
    acts.push({
      name: artist.name,
      relation: "self",
      startYear: artist.type === "Group" ? (yearOf(life?.begin) ?? (ownYears.length ? Math.min(...ownYears) : undefined)) : ownYears.length ? Math.min(...ownYears) : undefined,
      endYear: artist.type === "Group" && life?.ended ? yearOf(life.end) : undefined,
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
    await sleep(1100);
    const releases = await actReleases(b.artist.id, b.artist.name);
    const years = releases.map((r) => r.year).filter((y): y is number => Boolean(y));
    const instruments = (b.attributes ?? []).filter((a) => !["original", "founder", "additional", "minor"].includes(a));
    acts.push({
      name: b.artist.name,
      relation: "band",
      startYear: yearOf(b.begin) ?? (years.length ? Math.min(...years) : undefined),
      endYear: b.ended ? (yearOf(b.end) ?? (years.length ? Math.max(...years) : undefined)) : undefined,
      role: instruments.length ? cap(instruments.slice(0, 3).join(", ")) : undefined,
      releases,
    });
  }
  return { name: artist.name, acts };
}
