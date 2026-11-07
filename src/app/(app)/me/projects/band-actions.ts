"use server";

import { after } from "next/server";
import { getViewer } from "@/lib/people";
import { notifyBandInvite } from "@/lib/notify";
import { requestOrigin } from "@/lib/origin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FRIENDLY: Record<string, string> = {
  "already in the band": "They're already in this band.",
  "too many invites today": "That's a lot of invites for one day. Try again tomorrow.",
  "not available": "You can't add them.",
};

/**
 * Tag a bandmate on one of your projects. With `toId` they get an invite in the app (and
 * an email); without it you get a "Confirm your spot" link to send them yourself.
 */
export async function inviteBandmate(projectId: string, toId?: string): Promise<{ link?: string; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to tag bandmates." };
  if (!/^\d+$/.test(projectId) || (toId && !UUID.test(toId))) return { error: "Save the project first." };
  const { data, error } = await viewer.supabase.rpc("invite_to_band", { p_project: Number(projectId), p_to: toId ?? null });
  if (error || typeof data !== "string") {
    const known = Object.keys(FRIENDLY).find((k) => error?.message.includes(k));
    return { error: known ? FRIENDLY[known] : "That didn't work. Try again." };
  }
  if (toId) after(() => notifyBandInvite(viewer.id, toId, data));
  return { link: `${await requestOrigin()}/join/${data}` };
}

export type Candidate = { id: string; username: string; name: string; photo: string | null; instrument: string };

/** Members to tag, by first name or username. */
export async function findBandmates(q: string): Promise<Candidate[]> {
  const viewer = await getViewer();
  const term = q.replace(/[^\p{L}\p{N}_. -]/gu, "").trim().slice(0, 40);
  if (!viewer || term.length < 2) return [];
  const { data } = await viewer.supabase
    .from("profiles")
    .select("id, username, first_name, avatar_url, main_instrument, instruments")
    .not("onboarded_at", "is", null)
    .neq("id", viewer.id)
    .or(`first_name.ilike.%${term}%,username.ilike.%${term.replace(/ /g, "")}%`)
    .limit(8);
  type R = { id: string; username: string; first_name: string; avatar_url: string | null; main_instrument: string | null; instruments: string[] };
  return ((data ?? []) as R[]).map((r) => ({ id: r.id, username: r.username, name: r.first_name, photo: r.avatar_url, instrument: r.main_instrument ?? r.instruments[0] ?? "Musician" }));
}
