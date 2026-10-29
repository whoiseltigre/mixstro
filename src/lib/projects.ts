import { parseClip, type ClipProvider, type ParsedClip } from "./clips";

/**
 * Projects: the bands and projects someone has played in, with their role, the years,
 * and a few linked tracks. Together they're a profile's Journey, so a band from 2011
 * sits right next to what someone's doing now. Stored in public.projects and
 * public.project_tracks; demo mode keeps them in the browser.
 */

export type Track = {
  id: string;
  provider: ClipProvider;
  /** Missing only on sample profiles, which have nothing to play. */
  url?: string;
  title?: string;
  thumb?: string;
};

export type Project = {
  id: string;
  name: string;
  role?: string;
  startYear: number;
  /** Undefined while they still play with it. */
  endYear?: number;
  /** Sample profiles only; real projects use their first track's artwork. */
  artwork?: string;
  tracks: Track[];
};

export type ProjectRow = {
  id: number;
  name: string;
  role: string | null;
  start_year: number;
  end_year: number | null;
  created_at: string;
  project_tracks: TrackRow[];
};

export type TrackRow = { id: number; provider: ClipProvider; url: string; title: string | null; thumb_url: string | null; rank: number };

export const PROJECT_SELECT = "id, name, role, start_year, end_year, created_at, project_tracks (id, provider, url, title, thumb_url, rank)";
export const NAME_MAX = 80;
export const ROLE_MAX = 80;
export const TRACKS_MAX = 6;
export const FIRST_YEAR = 1950;
export const thisYear = () => new Date().getFullYear();
export const YEARS = Array.from({ length: thisYear() - FIRST_YEAR + 1 }, (_, i) => thisYear() - i);

export const fromRow = (r: ProjectRow): Project => ({
  id: String(r.id),
  name: r.name,
  role: r.role ?? undefined,
  startYear: r.start_year,
  endYear: r.end_year ?? undefined,
  tracks: [...(r.project_tracks ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .map((t) => ({ id: String(t.id), provider: t.provider, url: t.url, title: t.title ?? undefined, thumb: t.thumb_url ?? undefined })),
});

export const isCurrent = (p: Project) => p.endYear === undefined;

/** "2021 to now", "2016 to 2021" or "2011". */
export function yearsLabel(p: Project) {
  if (isCurrent(p)) return `${p.startYear} to now`;
  return p.endYear === p.startYear ? `${p.startYear}` : `${p.startYear} to ${p.endYear}`;
}

/** What you're in now first, then most recent first, like a résumé. */
export function sortProjects(projects: Project[]) {
  const end = (p: Project) => p.endYear ?? Infinity;
  return [...projects].sort((a, b) => end(b) - end(a) || b.startYear - a.startYear);
}

export const artworkOf = (p: Project) => p.artwork ?? p.tracks.find((t) => t.thumb)?.thumb;

export const firstYear = (projects: Project[]) => (projects.length ? Math.min(...projects.map((p) => p.startYear)) : undefined);

/** The player for a track: compact audio embeds so the mini player stays small. */
export function trackPlayer(track: Track): (ParsedClip & { height?: number }) | null {
  const clip = track.url ? parseClip(track.url) : null;
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

/** A warm wash for projects without artwork, so the list still has some color. */
export function nameWash(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(150deg, hsl(${h} 50% 40%), hsl(${(h + 40) % 360} 40% 16%))`;
}

/** Sample musicians' projects. Their tracks have no links, so they show but don't play. */
export const SAMPLE_PROJECTS: Record<string, Project[]> = {
  eli: [
    { id: "eli-1", name: "Night Shift", role: "Guitar, vocals", startYear: 2022, artwork: "/photos/rock-red.jpg", tracks: [{ id: "e1", provider: "spotify", title: "Low Ceilings" }, { id: "e2", provider: "youtube", title: "Live at the Echo" }] },
    { id: "eli-2", name: "Basement demos", role: "Everything", startYear: 2018, endYear: 2019, tracks: [{ id: "e3", provider: "soundcloud", title: "Vol. 2" }] },
    { id: "eli-3", name: "Second Period", role: "Rhythm guitar", startYear: 2012, endYear: 2014, tracks: [{ id: "e4", provider: "youtube", title: "Battle of the bands" }] },
  ],
  maya: [
    { id: "maya-1", name: "Low Tide Trio", role: "Bass, backing vocals", startYear: 2021, artwork: "/photos/rock-red.jpg", tracks: [{ id: "m1", provider: "youtube", title: "Live at the Echo" }, { id: "m2", provider: "spotify", title: "Undertow" }] },
    { id: "maya-2", name: "Session work", role: "Session bass", startYear: 2019, endYear: 2021, artwork: "/photos/gretsch.jpg", tracks: [{ id: "m3", provider: "spotify", title: "Slow Burn" }] },
    { id: "maya-3", name: "Berklee Funk Ensemble", role: "Bass", startYear: 2014, endYear: 2016, tracks: [{ id: "m4", provider: "youtube", title: "Senior recital" }] },
  ],
  jonah: [
    { id: "jonah-1", name: "Porch Songs", role: "Songwriter, acoustic", startYear: 2023, endYear: 2023, artwork: "/photos/acoustic-amber.jpg", tracks: [{ id: "j1", provider: "apple_music", title: "Porch Songs" }] },
    { id: "jonah-2", name: "Open mics", role: "Solo", startYear: 2014, endYear: 2016, tracks: [{ id: "j2", provider: "youtube", title: "Hotel Cafe" }] },
  ],
};
