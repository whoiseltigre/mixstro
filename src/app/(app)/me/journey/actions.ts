"use server";

import { parseClip } from "@/lib/clips";

export type TrackInfo = { title?: string; thumb?: string };

const OEMBED: Partial<Record<string, (url: string) => string>> = {
  youtube: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  soundcloud: (u) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  spotify: (u) => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
};

/**
 * Fills in a pasted link's title and artwork so adding to your journey is one paste.
 * Uses each platform's public oEmbed; Apple Music has none, so we read its og: tags.
 * Any failure just leaves the fields for the person to type.
 */
export async function lookupTrack(raw: string): Promise<TrackInfo> {
  const clip = parseClip(raw);
  if (!clip) return {};
  const signal = AbortSignal.timeout(4000);
  try {
    const endpoint = OEMBED[clip.provider];
    if (endpoint) {
      const res = await fetch(endpoint(clip.url), { signal, next: { revalidate: 86400 } });
      if (!res.ok) return {};
      const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
      const title = clip.provider === "youtube" || !data.author_name || data.title?.includes(data.author_name) ? data.title : `${data.title} · ${data.author_name}`;
      return { title: title?.slice(0, 120), thumb: data.thumbnail_url ?? clip.thumb };
    }
    if (clip.provider === "apple_music") {
      const res = await fetch(clip.url, { signal, next: { revalidate: 86400 } });
      if (!res.ok) return {};
      const html = await res.text();
      const meta = (p: string) => html.match(new RegExp(`<meta[^>]+property="${p}"[^>]+content="([^"]*)"`))?.[1];
      return { title: meta("og:title")?.replace(/&amp;/g, "&").slice(0, 120), thumb: meta("og:image") };
    }
  } catch {
    // Offline or blocked: the person can type the title.
  }
  return { thumb: clip.thumb };
}
