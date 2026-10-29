"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/people";

/**
 * Connect, pass and send. Each action re-checks who you are; row-level security in
 * the database is the real guard (you can only create connections from yourself,
 * answer ones sent to you, and message inside an accepted connection).
 */

type Pair = { id: number; from_id: string; to_id: string; status: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function pairWith(otherId: string) {
  const viewer = await getViewer();
  if (viewer && !UUID.test(otherId)) return null; // a sample musician
  if (!viewer) return null;
  const { data } = await viewer.supabase
    .from("connections")
    .select("id, from_id, to_id, status")
    .or(`and(from_id.eq.${viewer.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${viewer.id})`);
  const rows = (data ?? []) as Pair[];
  return { viewer, outgoing: rows.find((r) => r.from_id === viewer.id), incoming: rows.find((r) => r.to_id === viewer.id) };
}

/** Say you'd like to play together. If they already asked you, this opens the conversation. */
export async function connect(otherId: string, username: string) {
  const pair = await pairWith(otherId);
  if (!pair) redirect(`/connected/${username}`); // demo mode

  const { viewer, outgoing, incoming } = pair;
  if (incoming?.status === "pending") {
    await viewer.supabase.from("connections").update({ status: "accepted" }).eq("id", incoming.id);
    revalidatePath("/", "layout");
    redirect(`/connected/${username}`);
  }
  if (!outgoing) await viewer.supabase.from("connections").insert({ from_id: viewer.id, to_id: otherId });
  revalidatePath("/", "layout");
  return { sent: true };
}

/** Not the right fit. They drop out of your Today, and a request they sent is closed. */
export async function pass(otherId: string) {
  const pair = await pairWith(otherId);
  if (!pair) return;
  const { viewer, outgoing, incoming } = pair;
  if (incoming?.status === "pending") await viewer.supabase.from("connections").update({ status: "passed" }).eq("id", incoming.id);
  else if (!outgoing) await viewer.supabase.from("connections").insert({ from_id: viewer.id, to_id: otherId, status: "passed" });
  revalidatePath("/discover");
}

export async function sendMessage(connectionId: number, body: string) {
  const text = body.trim().slice(0, 4000);
  if (!text) return { error: "Write something first." };
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  const { error } = await viewer.supabase.from("messages").insert({ connection_id: connectionId, sender_id: viewer.id, body: text });
  if (error) return { error: "That didn't send. Try again." };
  revalidatePath("/messages");
  return {};
}
