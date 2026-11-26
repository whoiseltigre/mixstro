"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/people";

/** Turn "Remote collabs" on or off in your Open to, keeping the rest as it is. */
export async function setOpenToRemote(on: boolean): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  const { data, error } = await viewer.supabase.from("profiles").select("open_to").eq("id", viewer.id).maybeSingle<{ open_to: string[] | null }>();
  if (error) return { error: "That isn't available yet. Try again later." };
  const rest = (data?.open_to ?? []).filter((x) => x !== "remote");
  const { error: saveError } = await viewer.supabase.from("profiles").update({ open_to: on ? [...rest, "remote"] : rest }).eq("id", viewer.id);
  if (saveError) return { error: "That didn't save. Try again." };
  revalidatePath("/", "layout");
  return {};
}
