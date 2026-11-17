/** Highlights: up to 8 standout moments on a profile (public.highlights). */

export type HighlightKind = "release" | "show" | "press" | "award" | "other";

export type Highlight = { id: string; kind: HighlightKind; title: string; detail?: string; year?: number; url?: string };

export type HighlightRow = { id: number; kind: HighlightKind; title: string; detail: string | null; year: number | null; url: string | null };

export const HIGHLIGHT_KINDS: { id: HighlightKind; label: string; example: string; color: string }[] = [
  { id: "release", label: "Release", example: "Debut EP, “Low Ceilings”", color: "#FFB245" },
  { id: "show", label: "Show", example: "Opened for Big Thief at the Fonda", color: "#67E2DA" },
  { id: "press", label: "Press", example: "Featured on KCRW's Morning Becomes Eclectic", color: "#B5C5FF" },
  { id: "award", label: "Award", example: "Winner, Battle of the Bands 2019", color: "#FFACBA" },
  { id: "other", label: "Other", example: "Toured the West Coast", color: "#C9B6FF" },
];

export const HIGHLIGHTS_MAX = 8;
export const HIGHLIGHT_SELECT = "id, kind, title, detail, year, url";

export const fromHighlightRow = (r: HighlightRow): Highlight => ({
  id: String(r.id),
  kind: r.kind,
  title: r.title,
  detail: r.detail ?? undefined,
  year: r.year ?? undefined,
  url: r.url ?? undefined,
});

/** Newest first, undated last. */
export const sortHighlights = (list: Highlight[]) => [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

export const SAMPLE_HIGHLIGHTS: Record<string, Highlight[]> = {
  eli: [
    { id: "eh1", kind: "release", title: "Night Shift, “Low Ceilings” EP", year: 2024 },
    { id: "eh2", kind: "show", title: "Sold out the Echo with Night Shift", detail: "Headline show, 350 cap", year: 2024 },
    { id: "eh3", kind: "award", title: "Winner, Battle of the Bands", detail: "With Second Period", year: 2013 },
  ],
  maya: [
    { id: "mh1", kind: "press", title: "KCRW session with Low Tide Trio", year: 2023 },
    { id: "mh2", kind: "show", title: "Toured the West Coast", detail: "14 dates", year: 2022 },
  ],
};

export const SAMPLE_OPEN_TO: Record<string, string[]> = { eli: ["band", "cowrite"], maya: ["sessions", "gigs", "fill_in"], jonah: ["cowrite", "teaching"] };
