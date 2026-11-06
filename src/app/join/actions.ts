"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getViewer } from "@/lib/people";

const TOKEN = /^[0-9a-f]{32}$/;

/** Confirm your spot: the band joins your profile, with everyone who confirmed. */
export async function confirmSpot(token: string, role: string): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  if (!TOKEN.test(token)) return { error: "This link isn't right. Ask your bandmate for a new one." };
  const { error } = await viewer.supabase.rpc("accept_band_invite", { p_token: token, p_role: role.trim().slice(0, 80) || null });
  if (error) {
    if (error.message.includes("someone else")) return { error: "This invite was sent to someone else." };
    if (error.message.includes("no longer open")) return { error: "This link was already used. Ask your bandmate for a new one." };
    return { error: "That didn't work. Try again." };
  }
  (await cookies()).delete("mx_join");
  revalidatePath("/me", "layout");
  redirect("/me?band=confirmed");
}

export async function declineSpot(token: string) {
  const viewer = await getViewer();
  if (viewer && TOKEN.test(token)) await viewer.supabase.rpc("decline_band_invite", { p_token: token });
  (await cookies()).delete("mx_join");
  redirect("/me");
}
