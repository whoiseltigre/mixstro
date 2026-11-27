import { cache } from "react";
import { createClient } from "./supabase/server";

/**
 * Claim pilot: band pages started from public info (MusicBrainz) before anyone in the band is
 * on Mixstro. The lineup comes in as seats; a musician claims the band or their seat by posting
 * a code on the band's official Instagram or website, and a Pulse viewer approves it.
 * Unclaimed pages are noindex, have no photos and stay out of every count. Server only.
 */

export type Seat = { id: string; name: string; role?: string; claimed?: boolean };
export type MyClaim = { id: string; code: string; status: "pending" | "approved" | "rejected"; proofUrl?: string; seatId?: string };

export type UnclaimedBand = {
  id: string;
  name: string;
  city?: string;
  genres: string[];
  instagramUrl?: string;
  websiteUrl?: string;
  mbid?: string;
  seats: Seat[];
  myClaim?: MyClaim;
};

type ClaimRow = { id: number; code: string; status: MyClaim["status"]; proof_url: string | null; seat_id: number | null } | null;
const claim = (c: ClaimRow): MyClaim | undefined =>
  c ? { id: String(c.id), code: c.code, status: c.status, proofUrl: c.proof_url ?? undefined, seatId: c.seat_id ? String(c.seat_id) : undefined } : undefined;

export const getUnclaimedBand = cache(async (raw: string): Promise<UnclaimedBand | null> => {
  const supabase = await createClient();
  // Demo mode (no database): /b/unclaimed shows what an unclaimed page looks like.
  if (!supabase) return raw === "unclaimed" ? SAMPLE_UNCLAIMED : null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const { data, error } = await supabase.rpc("unclaimed_band", { p_id: id });
  if (error || !data) return null;
  const r = data as {
    id: number;
    name: string;
    city: string | null;
    genres: string[] | null;
    instagram_url: string | null;
    website_url: string | null;
    mbid: string | null;
    seats: { id: number; name: string; role: string | null; claimed: boolean }[];
    my_claim: ClaimRow;
  };
  return {
    id: String(r.id),
    name: r.name,
    city: r.city ?? undefined,
    genres: r.genres ?? [],
    instagramUrl: r.instagram_url ?? undefined,
    websiteUrl: r.website_url ?? undefined,
    mbid: r.mbid ?? undefined,
    seats: r.seats.map((s) => ({ id: String(s.id), name: s.name, role: s.role ?? undefined, claimed: s.claimed })),
    myClaim: claim(r.my_claim),
  };
});

/** Lineup names nobody has claimed yet on a claimed band, for "Also in the band". Signed in only. */
export async function getOpenSeats(raw: string): Promise<{ seats: Seat[]; myClaim?: MyClaim }> {
  const id = Number(raw);
  const none = { seats: [] };
  if (!Number.isSafeInteger(id) || id <= 0) return none;
  const supabase = await createClient();
  if (!supabase) return none;
  const { data, error } = await supabase.rpc("band_open_seats", { p_id: id });
  if (error || !data) return none;
  const r = data as { seats: { id: number; name: string; role: string | null }[]; my_claim: ClaimRow };
  return { seats: r.seats.map((s) => ({ id: String(s.id), name: s.name, role: s.role ?? undefined })), myClaim: claim(r.my_claim) };
}

/** "Seat" roles come from MusicBrainz ("lead vocals, guitar"): shown as written. */
export const seatLabel = (s: Seat) => s.role || "In the band";

const SAMPLE_UNCLAIMED: UnclaimedBand = {
  id: "unclaimed",
  name: "Paper Lanterns",
  city: "Indianapolis, IN",
  genres: ["indie rock"],
  instagramUrl: "https://www.instagram.com/",
  seats: [
    { id: "1", name: "Sam Ortiz", role: "vocals, guitar" },
    { id: "2", name: "Jo Park", role: "bass" },
    { id: "3", name: "Riley Chen", role: "drums" },
  ],
};
