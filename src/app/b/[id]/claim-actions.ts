"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";

/** Claim pilot actions on a band page. Errors come back as words, never thrown. */

const ID = /^\d{1,18}$/;
type Result = { error?: string; code?: string; claimId?: string };

export async function startClaim(band: string, seat?: string): Promise<Result> {
  if (!ID.test(band) || (seat && !ID.test(seat))) return { error: "That link isn't right." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  const { data, error } = await viewer.supabase.rpc("start_claim", { p_band: Number(band), p_seat: seat ? Number(seat) : null });
  if (error) {
    const m = error.message;
    if (m.includes("finish your profile")) return { error: "Finish your profile first, then come back." };
    if (m.includes("already in this band")) return { error: "You're already in this band." };
    if (m.includes("spot is taken")) return { error: "Someone already claimed that spot." };
    if (m.includes("3 claims")) return { error: "You have 3 claims waiting already. We'll get to them soon." };
    return { error: "That didn't work. Try again." };
  }
  const c = data as { id: number; code: string };
  revalidatePath(`/b/${band}`);
  return { code: c.code, claimId: String(c.id) };
}

export async function submitProof(band: string, claimId: string, url: string): Promise<Result> {
  if (!ID.test(band) || !ID.test(claimId)) return { error: "That link isn't right." };
  const link = url.trim();
  if (!/^https?:\/\/\S+$/.test(link) || link.length > 500) return { error: "Paste the full link, starting with https://" };
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  const { error } = await viewer.supabase.rpc("submit_claim_proof", { p_claim: Number(claimId), p_proof_url: link });
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath(`/b/${band}`);
  return {};
}

/** "Remove this page". Works signed out, so a band can ask without joining. */
export async function requestRemoval(band: string, contact: string, reason: string): Promise<Result> {
  if (!ID.test(band)) return { error: "That link isn't right." };
  const supabase = await createClient();
  if (!supabase) return { error: "That didn't send. Try again." };
  const { error } = await supabase.rpc("request_band_removal", {
    p_band: Number(band),
    p_contact: contact.trim().slice(0, 200) || null,
    p_reason: reason.trim().slice(0, 1000) || null,
  });
  return error ? { error: "That didn't send. Try again." } : {};
}
