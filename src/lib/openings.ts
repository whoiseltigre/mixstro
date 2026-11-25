import { familyOf, nounFor } from "./instruments";
import type { Musician } from "./mock";
import { reasonsFor, type OpeningStatus } from "./opening-reasons";
import { getMusicians, type Viewer } from "./people";

/** The structured part of a Board post: who's needed, who's asking, when, how far, until when. */
export type Opening = {
  neededRole: string;
  offeredRole?: string;
  days: string[];
  radiusMi?: number;
  eventDate?: string;
  status: OpeningStatus;
  expiresAt: string | null;
  /** Set when the poster turned on the public link (/o/<id>). */
  sharedAt?: string;
  shareClipId?: number;
};

export type OpeningRow = {
  needed_role?: string | null;
  offered_role?: string | null;
  rehearsal_days?: string[] | null;
  radius_mi?: number | null;
  event_date?: string | null;
  status?: string | null;
  expires_at?: string | null;
  shared_at?: string | null;
  share_clip_id?: number | null;
};

export function toOpening(r: OpeningRow): Opening | undefined {
  if (!r.needed_role) return undefined;
  return {
    neededRole: r.needed_role,
    offeredRole: r.offered_role ?? undefined,
    days: r.rehearsal_days ?? [],
    radiusMi: r.radius_mi ?? undefined,
    eventDate: r.event_date ?? undefined,
    status: (r.status as OpeningStatus) ?? "open",
    expiresAt: r.expires_at ?? null,
    sharedAt: r.shared_at ?? undefined,
    shareClipId: r.share_clip_id ?? undefined,
  };
}

export type Candidate = { person: Musician; reasons: string[] };

/**
 * People to meet for your opening, or why there are none. "no_location" and "closed" are not
 * "nobody here": the page says so differently, and an empty "ok" is recorded as zero supply.
 */
export type CandidateView = { state: "ok" | "no_location" | "closed" | "unavailable"; people: Candidate[] };

export async function openingCandidates(viewer: Viewer, postId: number, opening: Opening): Promise<CandidateView> {
  const { data, error } = await viewer.supabase.rpc("opening_candidates", { p_post: postId, p_limit: 5 });
  if (error) return { state: "unavailable", people: [] };
  type Row = { profile_id: string | null; miles: number | null; reciprocal: boolean | null; shared_days: string[] | null; shared_artists: number | null; state: string };
  const rows = (data ?? []) as Row[];
  const special = rows.find((r) => r.state !== "ok");
  if (special) return { state: special.state as CandidateView["state"], people: [] };
  const people = await getMusicians(viewer, rows.map((r) => r.profile_id!));
  const offered = opening.offeredRole ? nounFor(opening.offeredRole) : undefined;
  return {
    state: "ok",
    people: rows.flatMap((r) => {
      const person = people.find((p) => p.id === r.profile_id);
      if (!person) return [];
      return [{ person, reasons: reasonsFor({ reciprocal: Boolean(r.reciprocal), sharedDays: r.shared_days ?? [], sharedArtists: r.shared_artists ?? 0, miles: r.miles }, offered) }];
    }),
  };
}

/** The role family a profile's main instrument belongs to ("Electric bass" → "Bass"). */
export function roleOf(instrument: string | null | undefined): string | undefined {
  return instrument ? familyOf(instrument)?.id : undefined;
}

export type MyClip = { id: number; url: string; provider: string | null };

/** Your own clips, to pick the one a shared link may play. */
export async function myClips(viewer: Viewer): Promise<MyClip[]> {
  const { data } = await viewer.supabase.from("clips").select("id, url, provider").eq("profile_id", viewer.id).eq("kind", "clip").order("id");
  return (data ?? []) as MyClip[];
}
