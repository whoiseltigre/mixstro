"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyConnect, notifyConnectBack, notifyJamAccepted, notifyJamInvite, notifyMessage } from "@/lib/notify";
import { getViewer, withMusic } from "@/lib/people";

/**
 * Connect, pass and send. Each action re-checks who you are, and the database enforces the
 * rules: Connects, answers and passes go through request_connection / answer_connection /
 * pass_connection (one relationship per pair, only the person asked can say yes), and you can
 * only message inside an accepted connection.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Outcome = { outcome: "sent" | "accepted" | "connected" | "pending" | "declined" | "passed" | "closed"; id?: number };

/** Signed in, and the other person is a real account (sample musicians have other ids). */
async function realPair(otherId: string) {
  const viewer = await getViewer();
  if (!viewer || !UUID.test(otherId)) return null;
  return viewer;
}

/** The database's reasons, in the app's words. */
function connectError(message: string | undefined): { error: string } | { needSong: true } {
  if (message?.includes("add a song")) return { needSong: true };
  if (message?.includes("add a note")) return { error: "Add a short note first." };
  if (message?.includes("sign in")) return { error: "You're signed out. Sign in and try again." };
  if (message?.includes("not available")) return { error: "You can't connect with them right now." };
  return { error: "That didn't send. Try again." };
}

/** Notes on a Connect: a few words at least, a short paragraph at most. */
const NOTE_MAX = 280;

/** Can you send a Connect? You need at least one song (a clip, or a track on a project). */
export async function connectReady(): Promise<{ hasMusic: boolean }> {
  const viewer = await getViewer();
  if (!viewer) return { hasMusic: true }; // demo mode
  return { hasMusic: (await withMusic(viewer.supabase, [viewer.id])).has(viewer.id) };
}

/**
 * Say you'd like to play together, with a short note. If they already asked you, this
 * accepts instead (their note becomes the first message in your chat, yours follows it).
 */
export async function connect(otherId: string, username: string, note?: string) {
  const viewer = await realPair(otherId);
  if (!viewer) redirect(`/connected/${username}`); // demo mode or a sample musician

  const text = (note ?? "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
  const { data, error } = await viewer.supabase.rpc("request_connection", { p_to: otherId, p_note: text || null });
  if (error) return connectError(error.message);
  const { outcome } = data as Outcome;
  if (outcome === "accepted") {
    after(() => notifyConnectBack(viewer.id, otherId));
    revalidatePath("/", "layout");
    redirect(`/connected/${username}`);
  }
  if (outcome === "connected") redirect(`/messages/${username}`);
  if (outcome === "sent") after(() => notifyConnect(viewer.id, otherId, text));
  revalidatePath("/", "layout");
  return { sent: true };
}

/** Not the right fit. They drop out of your Today, and a request they sent is closed kindly. */
export async function pass(otherId: string): Promise<{ error?: string }> {
  const viewer = await realPair(otherId);
  if (!viewer) return {};
  const { error } = await viewer.supabase.rpc("pass_connection", { p_other: otherId });
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/discover");
  return {};
}

/**
 * `retry`: the same text again after a send that looked like it failed. On a weak signal
 * the first one can land even though the answer never came back, so skip it if it did.
 */
export async function sendMessage(connectionId: number, body: string, retry = false) {
  const text = body.trim().slice(0, 4000);
  if (!text) return { error: "Write something first." };
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  if (retry) {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: landed } = await viewer.supabase
      .from("messages")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("sender_id", viewer.id)
      .eq("body", text)
      .gte("created_at", since)
      .limit(1);
    if (landed?.length) {
      revalidatePath("/messages");
      return {};
    }
  }
  const { error } = await viewer.supabase.from("messages").insert({ connection_id: connectionId, sender_id: viewer.id, body: text });
  if (error) return { error: "That didn't send. Try again." };
  after(() => notifyMessage(connectionId, viewer.id, text));
  revalidatePath("/messages");
  return {};
}

/** A voice note already uploaded to voice/<connection>/<you>/…; this posts it to the chat. */
export async function sendVoice(connectionId: number, path: string, seconds: number) {
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  if (!Number.isInteger(connectionId) || !path.startsWith(`${connectionId}/${viewer.id}/`) || path.includes("..")) return { error: "That didn't send. Try again." };
  const voice_seconds = Math.min(120, Math.max(1, Math.round(seconds)));
  const { error } = await viewer.supabase.from("messages").insert({ connection_id: connectionId, sender_id: viewer.id, voice_url: path, voice_seconds });
  if (error) return { error: "That didn't send. Try again." };
  after(() => notifyMessage(connectionId, viewer.id, null, voice_seconds));
  revalidatePath("/messages");
  return {};
}

/** #7 Propose a jam. With `replacesId`, this is "Another time" on an invite they sent you. */
export async function proposeJam(connectionId: number, startsAt: string, place: string, note: string, replacesId?: number) {
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  const when = new Date(startsAt);
  if (!Number.isInteger(connectionId) || Number.isNaN(when.getTime())) return { error: "Pick a day and time." };
  if (when.getTime() < Date.now() - 60 * 60 * 1000) return { error: "Pick a time that hasn't happened yet." };
  const where = place.replace(/\s+/g, " ").trim().slice(0, 120);
  if (where.length < 2) return { error: "Say where you'll play." };

  if (replacesId !== undefined) {
    const { error } = await viewer.supabase.from("jams").update({ status: "replaced" }).eq("id", replacesId).eq("connection_id", connectionId);
    if (error) return { error: "That invite was already answered." };
  }
  const { error } = await viewer.supabase.from("jams").insert({
    connection_id: connectionId,
    proposed_by: viewer.id,
    starts_at: when.toISOString(),
    place: where,
    note: note.trim().slice(0, 280) || null,
    replaces_id: replacesId ?? null,
  });
  if (error) return { error: "That invite didn't send. Try again." };
  after(() => notifyJamInvite(connectionId, viewer.id, when.toISOString(), where, replacesId !== undefined, note.trim().slice(0, 280) || null));
  revalidatePath("/messages", "layout");
  return {};
}

/** #7 Answer an invite someone sent you, or cancel your own. */
export async function answerJam(jamId: number, status: "accepted" | "declined" | "cancelled") {
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  if (!Number.isInteger(jamId) || !["accepted", "declined", "cancelled"].includes(status)) return { error: "Try again." };
  const { error } = await viewer.supabase.from("jams").update({ status }).eq("id", jamId);
  if (error) return { error: "That invite was already answered." };
  if (status === "accepted") after(() => notifyJamAccepted(jamId, viewer.id));
  revalidatePath("/messages", "layout");
  return {};
}

/** #8 "Did you end up playing together?" Private until you both answer. */
export async function checkInJam(jamId: number, played: boolean) {
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  if (!Number.isInteger(jamId)) return { error: "Try again." };
  const { error } = await viewer.supabase.from("jam_checkins").insert({ jam_id: jamId, profile_id: viewer.id, played: Boolean(played) });
  if (error && error.code !== "23505") return { error: "That didn't save. Try again." };
  revalidatePath("/messages", "layout");
  return {};
}

const QUICK = { jam: "Down to jam!", clip: "Love it. Send me a clip of what you've been playing?" } as const;

/**
 * #3 One-tap answers to a Connect someone sent you. "Down to jam" and "Send me a clip"
 * accept and open the chat with that line; "Not the right fit" closes it kindly.
 */
export async function quickReply(otherId: string, username: string, kind: "jam" | "clip" | "no") {
  const viewer = await realPair(otherId);
  if (!viewer) return { error: "Try again." };
  const { data, error } = await viewer.supabase.rpc("answer_connection", { p_from: otherId, p_accept: kind !== "no" });
  if (error) return { error: error.message.includes("not available") ? "That Connect isn't open anymore." : "That didn't go through. Try again." };
  const { outcome, id } = data as Outcome;
  if (outcome === "closed" || !id) return { error: "That Connect isn't open anymore." };
  if (kind === "no") {
    revalidatePath("/", "layout");
    return { closed: true };
  }
  await viewer.supabase.from("messages").insert({ connection_id: id, sender_id: viewer.id, body: QUICK[kind] });
  after(() => notifyConnectBack(viewer.id, otherId));
  revalidatePath("/", "layout");
  redirect(`/messages/${username}`);
}
