import type { Artist } from "./onboarding";

/** Provider-independent artist id: a slug of the name, so overlap survives a switch from Deezer to Apple Music. */
export function artistId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Offline catalog for demo-mode suggestions and as a fallback when the search
 * API (/api/artists) can't be reached. It has no photos, so the UI draws an initials avatar.
 */
const NAMES = [
  "Thundercat", "Khruangbin", "D'Angelo", "Hiatus Kaiyote", "Esperanza Spalding", "Erykah Badu",
  "Tom Misch", "Anderson .Paak", "Vulfpeck", "Phoebe Bridgers", "The National", "Big Thief",
  "Wilco", "Radiohead", "Fleetwood Mac", "Prince", "Stevie Wonder", "Arctic Monkeys",
  "Tame Impala", "Fiona Apple", "Bon Iver", "Paramore", "Foo Fighters", "Haim",
  "Kendrick Lamar", "SZA", "Frank Ocean", "Mitski", "boygenius", "St. Vincent",
  "Queens of the Stone Age", "The Strokes", "Snarky Puppy", "Robert Glasper", "Herbie Hancock", "Miles Davis",
  "John Mayer", "Hozier", "Lizzy McAlpine", "Japanese Breakfast", "Turnstile", "Deftones",
  "Daft Punk", "Bonobo", "Fred again..", "Jacob Collier", "Cory Wong", "Mac DeMarco",
];

export const CATALOG: Artist[] = NAMES.map((name) => ({ id: artistId(name), name }));

/** What "Connect Apple Music" returns in demo mode: a plausible top-artists list. */
export const DEMO_TOP_ARTISTS = CATALOG.slice(0, 12);

export function searchArtists(q: string): Artist[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return CATALOG.filter((a) => a.name.toLowerCase().includes(s)).slice(0, 8);
}

const HUES = [28, 350, 230, 175, 45, 300];

export function artistTint(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return `linear-gradient(140deg, oklch(0.42 0.08 ${hue}), oklch(0.24 0.04 ${hue}))`;
}

export function initials(name: string) {
  return name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
