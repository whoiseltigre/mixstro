/**
 * Clips are pasted links. We recognise the platforms musicians actually post to and
 * render each one's official embed player. Shape drives the thumbnail: wide video,
 * tall vertical video, or square audio.
 */

export type ClipProvider = "youtube" | "tiktok" | "instagram" | "soundcloud" | "spotify" | "apple_music";
export type ClipShape = "wide" | "tall" | "square";

export type ParsedClip = {
  provider: ClipProvider;
  id: string;
  url: string;
  embed: string;
  shape: ClipShape;
  thumb?: string;
};

export const PROVIDER_LABEL: Record<ClipProvider, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  apple_music: "Apple Music",
};

export function parseClip(raw: string): ParsedClip | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtu.be" || host === "youtube.com" || host === "music.youtube.com") {
    const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/)?.[1];
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : (u.searchParams.get("v") ?? shorts ?? u.pathname.match(/^\/(?:embed|live)\/([\w-]{11})/)?.[1] ?? "");
    if (!/^[\w-]{11}$/.test(id)) return null;
    return {
      provider: "youtube",
      id,
      url: shorts ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      embed: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`,
      shape: shorts ? "tall" : "wide",
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    // Short links (vm.tiktok.com/...) need resolving server-side before we know the video id.
    if (!id) return null;
    return { provider: "tiktok", id, url: u.toString(), embed: `https://www.tiktok.com/player/v1/${id}?controls=1&music_info=0&description=0`, shape: "tall" };
  }

  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(reel|reels|p)\/([\w-]+)/);
    if (!m) return null;
    const kind = m[1] === "p" ? "p" : "reel";
    // TODO: thumbnails need the Meta oEmbed API with an app token; the iframe embed works without one.
    return { provider: "instagram", id: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/`, embed: `https://www.instagram.com/${kind}/${m[2]}/embed`, shape: "tall" };
  }

  if (host === "soundcloud.com" || host === "on.soundcloud.com") {
    if (u.pathname.split("/").filter(Boolean).length < 2) return null;
    const clean = `https://soundcloud.com${u.pathname}`;
    return {
      provider: "soundcloud",
      id: u.pathname,
      url: clean,
      embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&visual=true&show_comments=false`,
      shape: "square",
    };
  }

  if (host === "open.spotify.com") {
    const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/(\w+)/);
    if (!m) return null;
    return { provider: "spotify", id: m[2], url: `https://open.spotify.com/${m[1]}/${m[2]}`, embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, shape: "square" };
  }

  if (host === "music.apple.com") {
    if (!/\/(album|song|playlist)\//.test(u.pathname)) return null;
    return {
      provider: "apple_music",
      id: u.pathname + u.search,
      url: u.toString(),
      embed: `https://embed.music.apple.com${u.pathname}${u.search}`,
      shape: "square",
    };
  }

  return null;
}
