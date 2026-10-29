import { parseClip, type ClipProvider, type ParsedClip } from "./clips";

/**
 * Journey: tracks by year, each with a short note, so a profile can show someone's
 * whole musical history and not just what they're doing now. Stored in
 * public.journey_entries; demo mode keeps them in the browser.
 */

export type JourneyEntry = {
  id: string;
  year: number;
  provider: ClipProvider;
  /** Missing only on sample profiles, which have nothing to play. */
  url?: string;
  title?: string;
  thumb?: string;
  note?: string;
};

export type JourneyRow = {
  id: number;
  year: number;
  provider: ClipProvider;
  url: string;
  title: string | null;
  thumb_url: string | null;
  note: string | null;
  created_at: string;
};

export const JOURNEY_COLUMNS = "id, year, provider, url, title, thumb_url, note, created_at";
export const NOTE_MAX = 280;
export const TITLE_MAX = 120;
export const FIRST_YEAR = 1950;
export const thisYear = () => new Date().getFullYear();

export const fromRow = (r: JourneyRow): JourneyEntry => ({
  id: String(r.id),
  year: r.year,
  provider: r.provider,
  url: r.url,
  title: r.title ?? undefined,
  thumb: r.thumb_url ?? undefined,
  note: r.note ?? undefined,
});

/** Newest year first; entries keep the order they were added within a year. */
export function byYear(entries: JourneyEntry[]) {
  const years = new Map<number, JourneyEntry[]>();
  for (const e of [...entries].sort((a, b) => b.year - a.year)) {
    years.set(e.year, [...(years.get(e.year) ?? []), e]);
  }
  return [...years.entries()].map(([year, items]) => ({ year, items }));
}

/** "Since 2011 · 15 years of music", or null for an empty journey. */
export function journeySpan(entries: JourneyEntry[]) {
  if (!entries.length) return null;
  const first = Math.min(...entries.map((e) => e.year));
  const years = Math.max(thisYear(), ...entries.map((e) => e.year)) - first;
  return { first, years, label: years > 1 ? `Since ${first} · ${years} years of music` : `Since ${first}` };
}

/** The player for a journey row: shorter audio embeds than clip cards use, so a timeline stays scannable. */
export function journeyPlayer(entry: JourneyEntry): (ParsedClip & { height?: number }) | null {
  const clip = entry.url ? parseClip(entry.url) : null;
  if (!clip) return null;
  switch (clip.provider) {
    case "spotify":
      return { ...clip, height: 152 };
    case "soundcloud":
      return { ...clip, embed: clip.embed.replace("visual=true", "visual=false"), height: 166 };
    case "apple_music":
      return { ...clip, height: 175 };
    default:
      return clip;
  }
}

/** A warm, muted wash per year for entries without artwork, so the timeline has some color. */
export function yearWash(year: number) {
  const hue = (year * 47) % 360;
  return `linear-gradient(150deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 45% 18%))`;
}

/** Sample musicians' journeys. They have no links, so they show but don't play. */
export const SAMPLE_JOURNEYS: Record<string, JourneyEntry[]> = {
  eli: [
    { id: "eli-1", year: 2025, provider: "spotify", title: "Night Shift: Low Ceilings", note: "First single with the band. Tracked live in one afternoon." },
    { id: "eli-2", year: 2019, provider: "soundcloud", title: "Basement demos, vol. 2", note: "Four-track recordings from my apartment in Long Beach." },
    { id: "eli-3", year: 2012, provider: "youtube", title: "Battle of the bands set", note: "Seventeen, borrowed amp, came in second." },
  ],
  maya: [
    { id: "maya-1", year: 2024, provider: "youtube", title: "Low Tide Trio live at the Echo", note: "Our first sold-out show." },
    { id: "maya-2", year: 2020, provider: "spotify", title: "Session bass for Ama Lou covers EP", note: "Recorded remotely during lockdown." },
    { id: "maya-3", year: 2016, provider: "soundcloud", title: "Thesis recital, Berklee", note: "Transcribed Jaco solos and one original." },
  ],
  jonah: [
    { id: "jonah-1", year: 2023, provider: "apple_music", title: "Porch Songs", note: "Self-released, all acoustic." },
    { id: "jonah-2", year: 2014, provider: "youtube", title: "Open mic at Hotel Cafe", note: "The night I decided to keep writing." },
  ],
};
