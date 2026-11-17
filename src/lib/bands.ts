import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bandmate, Project } from "./projects";

/**
 * Bands (public.bands): "Played with" is the other confirmed members of a band you
 * were in. Membership only changes through the invite functions in the database.
 */

type Row = { project_id: number; band_id: number; username: string; first_name: string; avatar_url: string | null };
type Band = { bandId: string; mates: Bandmate[] };

/** The band and its other members, per project id, for one person's profile. Works signed out too. */
export async function playedWith(supabase: SupabaseClient, profileId: string): Promise<Map<string, Band>> {
  const map = new Map<string, Band>();
  const { data, error } = await supabase.rpc("played_with", { p_profile: profileId });
  if (error || !data) return map;
  for (const r of data as Row[]) {
    const key = String(r.project_id);
    const band = map.get(key) ?? { bandId: String(r.band_id), mates: [] };
    band.mates.push({ username: r.username, name: r.first_name, photo: r.avatar_url });
    map.set(key, band);
  }
  return map;
}

export const withBandmates = (projects: Project[], map: Map<string, Band>) =>
  map.size ? projects.map((p) => (map.has(p.id) ? { ...p, bandmates: map.get(p.id)!.mates, bandId: map.get(p.id)!.bandId } : p)) : projects;

/** A band's page: /b/<id>. */
export const bandPath = (id: string | number) => `/b/${id}`;

/** "Maya", "Maya and Jo", "Maya, Jo and 2 more". */
export function names(list: { name: string }[]) {
  const n = list.map((b) => b.name);
  if (n.length <= 2) return n.join(" and ");
  if (n.length === 3) return `${n[0]}, ${n[1]} and ${n[2]}`;
  return `${n[0]}, ${n[1]} and ${n.length - 2} more`;
}

export type BandInvite = { token: string; band: string; from: { username: string; first_name: string; avatar_url: string | null } };

/** "Confirm your spot" invites waiting on you. */
export async function myBandInvites(supabase: SupabaseClient, me: string): Promise<BandInvite[]> {
  const { data } = await supabase
    .from("band_invites")
    .select("token, bands(name), from:profiles!band_invites_from_id_fkey(username, first_name, avatar_url)")
    .eq("to_id", me)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  type R = { token: string; bands: { name: string } | null; from: BandInvite["from"] | null };
  return ((data ?? []) as unknown as R[]).flatMap((r) => (r.bands && r.from ? [{ token: r.token, band: r.bands.name, from: r.from }] : []));
}
