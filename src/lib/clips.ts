/** Clips are pasted links. We recognise YouTube and TikTok and render their official embeds. */

export type ParsedClip =
  | { provider: "youtube"; id: string; url: string; thumb: string; embed: string }
  | { provider: "tiktok"; id: string; url: string; embed: string };

export function parseClip(raw: string): ParsedClip | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtu.be" || host === "youtube.com" || host === "music.youtube.com") {
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : (u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ?? "");
    if (!/^[\w-]{11}$/.test(id)) return null;
    return {
      provider: "youtube",
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embed: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`,
    };
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    // Short links (vm.tiktok.com/...) need resolving server-side before we know the video id.
    if (!id) return null;
    return { provider: "tiktok", id, url: u.toString(), embed: `https://www.tiktok.com/player/v1/${id}?controls=1&music_info=0&description=0` };
  }

  return null;
}
