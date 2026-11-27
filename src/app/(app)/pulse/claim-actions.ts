"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/people";

/** Pulse: approve or reject band claims, act on removal requests. The database checks you're a Pulse viewer. */

const ID = /^\d{1,18}$/;

export async function decideClaim(id: string, approve: boolean): Promise<{ error?: string }> {
  if (!ID.test(id)) return { error: "Bad id." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Signed out." };
  const { error } = await viewer.supabase.rpc("decide_claim", { p_claim: Number(id), p_approve: approve });
  if (error) return { error: error.message.includes("taken") ? "Someone else already has that spot." : "That didn't work. Try again." };
  revalidatePath("/pulse");
  return {};
}

export async function resolveRemoval(id: string, remove: boolean): Promise<{ error?: string }> {
  if (!ID.test(id)) return { error: "Bad id." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Signed out." };
  const { error } = await viewer.supabase.rpc("resolve_band_removal", { p_request: Number(id), p_remove: remove });
  if (error) return { error: "That didn't work. Try again." };
  revalidatePath("/pulse");
  return {};
}
