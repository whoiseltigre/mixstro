import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Turns a neighborhood like "Echo Park, Los Angeles" into a rough point so we can say
 * "3 mi" and keep Today within your radius. Server-side only.
 *
 * Points are rounded to two decimals (about 1 km) before they're stored, live in
 * profile_locations (readable only by their owner), and other people only ever get
 * whole miles back from the distances_from_me() function.
 */

export type Point = { lat: number; lng: number };

export const coarse = (p: Point): Point => ({ lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 });

/** OpenStreetMap's Nominatim: free, no key, about one lookup per new neighborhood. */
export async function geocode(place: string): Promise<Point | null> {
  const q = place.trim();
  if (q.length < 2) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "Mixstro (https://app.mixstro.com)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    if (!hit) return null;
    const point = { lat: Number(hit.lat), lng: Number(hit.lon) };
    return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? coarse(point) : null;
  } catch {
    return null;
  }
}

/**
 * Makes sure your stored point matches your neighborhood. `point` is what the browser's
 * "Use my location" gave us; otherwise we look the neighborhood up. Everyone who signed up
 * before distances existed gets filled in the next time they open Today or Search.
 */
export async function ensureLocation(supabase: SupabaseClient, profileId: string, neighborhood: string | null, point?: Point) {
  const place = neighborhood?.trim();
  if (!place) return;
  if (!point) {
    const { data, error } = await supabase.from("profile_locations").select("place").eq("profile_id", profileId).maybeSingle();
    if (error || data?.place === place) return; // up to date, or the table isn't there yet
  }
  const where = point ? coarse(point) : await geocode(place);
  if (!where) return;
  await supabase.from("profile_locations").upsert({ profile_id: profileId, ...where, place, updated_at: new Date().toISOString() });
}

/** Whole miles from you to each of `ids` that has a location. Empty if distances aren't set up yet. */
export async function distancesFromMe(supabase: SupabaseClient, ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.rpc("distances_from_me", { ids });
  if (error || !data) return new Map();
  return new Map((data as { profile_id: string; miles: number }[]).map((r) => [r.profile_id, r.miles]));
}
