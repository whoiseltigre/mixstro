import { rankArtists } from "./artist-search";
import { artistId } from "./artists";

/**
 * "Is this you?": type your band or artist name once and we look for your music everywhere we can.
 * Apple Music via the iTunes Search API (free, no key) gives playable song links; Deezer adds the
 * artist photo and fan count; YouTube videos join in when YOUTUBE_API_KEY is set. SoundCloud,
 * Bandcamp and Spotify don't allow this kind of search for new apps, so those stay paste-a-link.
 */
export type FoundTrack = { title: string; url: string; thumb?: string; source: "Apple Music" | "YouTube" };
export type FoundArtist = { id: string; name: string; image?: string; fans?: number; genre?: string; tracks: FoundTrack[] };

type ItunesArtist = { artistId: number; artistName: string; primaryGenreName?: string };
type ItunesSong = { wrapperType: string; kind?: string; trackName?: string; trackViewUrl?: string; artworkUrl100?: string };

async function json<T>(url: string, revalidate = 86400): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function appleArtists(name: string) {
  const body = await json<{ results: ItunesArtist[] }>(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=10`);
  return body?.results ?? [];
}

async function appleSongs(id: number): Promise<FoundTrack[]> {
  const body = await json<{ results: ItunesSong[] }>(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=4`);
  return (body?.results ?? [])
    .filter((r) => r.wrapperType === "track" && r.kind === "song" && r.trackViewUrl && r.trackName)
    .slice(0, 3)
    .map((r) => ({
      title: r.trackName!,
      url: r.trackViewUrl!.replace(/[?&]uo=\d+/, ""),
      thumb: r.artworkUrl100?.replace("100x100bb", "300x300bb"),
      source: "Apple Music" as const,
    }));
}

async function deezerPhotos(name: string) {
  const body = await json<{ data?: { name: string; picture_big?: string; nb_fan?: number }[] }>(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=10`,
  );
  return new Map((body?.data ?? []).map((a) => [artistId(a.name), { image: a.picture_big?.includes("/artist//") ? undefined : a.picture_big, fans: a.nb_fan }]));
}

async function youtubeVideos(name: string): Promise<FoundTrack[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const body = await json<{ items?: { id: { videoId?: string }; snippet: { title: string; channelTitle: string; thumbnails?: { high?: { url: string } } } }[] }>(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=5&q=${encodeURIComponent(name)}&key=${key}`,
  );
  const n = artistId(name);
  return (body?.items ?? [])
    .filter((v) => v.id.videoId && (artistId(v.snippet.channelTitle).includes(n) || artistId(v.snippet.title).includes(n)))
    .slice(0, 2)
    .map((v) => ({ title: v.snippet.title, url: `https://www.youtube.com/watch?v=${v.id.videoId}`, thumb: v.snippet.thumbnails?.high?.url, source: "YouTube" as const }));
}

/** Up to three artists whose name is (or starts with) what you typed, each with a few playable tracks. */
export async function findMusic(name: string): Promise<FoundArtist[]> {
  const term = name.trim();
  if (term.length < 2) return [];
  const [artists, photos, videos] = await Promise.all([appleArtists(term), deezerPhotos(term), youtubeVideos(term)]);
  const close = rankArtists(
    term,
    artists.map((a) => ({ id: artistId(a.artistName), name: a.artistName, fans: photos.get(artistId(a.artistName))?.fans, a })),
  )
    .filter((x) => artistId(x.name).startsWith(artistId(term)))
    .slice(0, 3);
  const found = await Promise.all(
    close.map(async (x, i) => ({
      id: x.id,
      name: x.name,
      image: photos.get(x.id)?.image,
      fans: x.fans,
      genre: x.a.primaryGenreName,
      // YouTube results are matched on name only, so they go with the closest artist.
      tracks: [...(await appleSongs(x.a.artistId)), ...(i === 0 ? videos : [])],
    })),
  );
  if (!found.length && videos.length) return [{ id: artistId(term), name: term, tracks: videos }];
  return found.filter((f) => f.tracks.length);
}
