"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyConnect, notifyConnectBack, notifyJamAccepted, notifyJamInvite, notifyMessage } from "@/lib/notify";
import { boundClipAt, messagePreview } from "@/lib/clip-reply";
import { dispatchMessageNotification } from "@/lib/notification-intents";
import { getOlderMessages, getViewer, withMusic } from "@/lib/people";

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
  if (message?.includes("too many waiting")) return { error: "You have 5 Connects waiting for an answer. Once one is answered or closes (after a week), you can send more." };
  if (message?.includes("daily limit")) return { error: "That's the most Connects for today. Try again tomorrow." };
  if (message?.includes("verified only")) return { error: "They only take Connects from verified musicians. Link Google in Settings to get verified." };
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

/** What a send returns: the stored message as the database has it, or why it failed. */
export type SendResult = { error: string; message?: undefined } | { error?: undefined; message: { id: number; clientId: string | null; createdAt: string } };

const isMissingColumn = (e: { code?: string; message?: string } | null) => Boolean(e && (e.code === "42703" || e.code === "PGRST204" || /client_id/.test(e.message ?? "")));

/**
 * Stores one message. `clientId` is made by the phone for this send and stays the same when it
 * retries, so a retry after a lost answer returns the message that already landed instead of
 * adding a second one (the database enforces one row per conversation, sender and send id).
 */
async function storeMessage(
  viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>,
  row: { connection_id: number; body?: string; voice_url?: string; voice_seconds?: number; clip_id?: number; clip_at?: number | null },
  clientId: string | undefined,
): Promise<SendResult> {
  const client_id = clientId && UUID.test(clientId) ? clientId : null;
  const insert = (withId: boolean) =>
    viewer.supabase
      .from("messages")
      .insert({ ...row, sender_id: viewer.id, ...(withId && client_id ? { client_id } : {}) })
      .select("id, created_at")
      .single<{ id: number; created_at: string }>();
  let { data, error } = await insert(true);
  if (error?.code === "23505" && client_id) {
    // Already landed on an earlier try: hand back that message.
    const { data: landed } = await viewer.supabase
      .from("messages")
      .select("id, created_at")
      .eq("connection_id", row.connection_id)
      .eq("sender_id", viewer.id)
      .eq("client_id", client_id)
      .maybeSingle<{ id: number; created_at: string }>();
    if (landed) return { message: { id: landed.id, clientId: client_id, createdAt: landed.created_at } };
  }
  // Before the database has clip replies, say so plainly rather than "try again".
  if (row.clip_id && error && (error.code === "42703" || error.code === "PGRST204") && /clip/.test(error.message ?? "")) return { error: "Clip replies aren't switched on yet." };
  // Before the database has send ids (older schema), store it the old way.
  if (isMissingColumn(error)) ({ data, error } = await insert(false));
  // The database refuses a clip that isn't yours or theirs, is gone, or a moment past its end.
  if (error?.code === "23514" && row.clip_id) return { error: "That clip isn't available anymore." };
  if (error || !data) return { error: "That didn't send. Try again." };
  const id = data.id;
  const preview = row.body ?? (row.clip_id ? messagePreview({ body: null, clipAt: row.clip_at }) : null);
  after(async () => {
    if (!(await dispatchMessageNotification(id).catch(() => false))) await notifyMessage(row.connection_id, viewer.id, preview, row.voice_seconds ?? null);
  });
  return { message: { id, clientId: client_id, createdAt: data.created_at } };
}

/** Send a text. Signed-out or expired sessions never get a success back. */
export async function sendMessage(connectionId: number, body: string, clientId?: string): Promise<SendResult> {
  const text = body.trim().slice(0, 4000);
  if (!text) return { error: "Write something first." };
  if (!Number.isSafeInteger(connectionId)) return { error: "That didn't send. Try again." };
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out. Sign in again to send." };
  return storeMessage(viewer, { connection_id: connectionId, body: text }, clientId);
}

/**
 * Reply with a clip (theirs or yours), optionally at a moment and with a note. The send id
 * covers the whole message, attachment included, so a retry can't double it.
 */
export async function sendClipReply(connectionId: number, clipId: number, at: number | null, body: string, clientId?: string): Promise<SendResult> {
  if (!Number.isSafeInteger(connectionId) || !Number.isSafeInteger(clipId)) return { error: "That didn't send. Try again." };
  const clip_at = boundClipAt(at);
  if (clip_at === "invalid") return { error: "Pick a moment inside the clip." };
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out. Sign in again to send." };
  const text = body.trim().slice(0, 4000);
  return storeMessage(viewer, { connection_id: connectionId, clip_id: clipId, clip_at, ...(text ? { body: text } : {}) }, clientId);
}

/** A voice note already uploaded to voice/<connection>/<you>/…; this posts it to the chat. */
export async function sendVoice(connectionId: number, path: string, seconds: number, clientId?: string): Promise<SendResult> {
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out. Sign in again to send." };
  if (!Number.isInteger(connectionId) || !path.startsWith(`${connectionId}/${viewer.id}/`) || path.includes("..")) return { error: "That didn't send. Try again." };
  const voice_seconds = Math.min(120, Math.max(1, Math.round(seconds)));
  return storeMessage(viewer, { connection_id: connectionId, voice_url: path, voice_seconds }, clientId);
}

/** Older messages in a chat, before a cursor (the oldest message on screen). */
export async function olderMessages(username: string, before: { id: number; createdAt: string }) {
  if (!Number.isSafeInteger(before.id) || Number.isNaN(Date.parse(before.createdAt))) return { messages: [], more: false };
  return getOlderMessages(username, before);
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
    // Replacing the old invite and proposing the new one happen together, or not at all.
    const { error } = await viewer.supabase.rpc("reschedule_jam", {
      p_replaces: replacesId,
      p_starts_at: when.toISOString(),
      p_place: where,
      p_note: note.trim().slice(0, 280) || null,
    });
    if (!error) {
      after(() => notifyJamInvite(connectionId, viewer.id, when.toISOString(), where, true, note.trim().slice(0, 280) || null));
      revalidatePath("/messages", "layout");
      return {};
    }
    if (error.code !== "PGRST202" && error.code !== "42883") return { error: "That invite was already answered." };
    // Older database without reschedule_jam: the previous two-step way.
    const { error: upErr } = await viewer.supabase.from("jams").update({ status: "replaced" }).eq("id", replacesId).eq("connection_id", connectionId);
    if (upErr) return { error: "That invite was already answered." };
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
  // You're connected either way. The opening line gets a second try with the same send id (so
  // it can never land twice); if both fail, the chat opens empty rather than pretending it sent.
  const client_id = crypto.randomUUID();
  const line = { connection_id: id, sender_id: viewer.id, body: QUICK[kind] };
  for (let attempt = 0; attempt < 2; attempt++) {
    let { error: sendErr } = await viewer.supabase.from("messages").insert({ ...line, client_id });
    if (isMissingColumn(sendErr)) ({ error: sendErr } = await viewer.supabase.from("messages").insert(line));
    if (!sendErr || sendErr.code === "23505") break;
    if (attempt === 1) console.error("quick reply: opening line didn't send", sendErr.message);
  }
  after(() => notifyConnectBack(viewer.id, otherId));
  revalidatePath("/", "layout");
  redirect(`/messages/${username}`);
}
