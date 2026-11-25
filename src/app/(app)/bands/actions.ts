"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getViewer } from "@/lib/people";
import { notifyBandMessage, notifyBandNote } from "@/lib/notify";
import { spotTitle, type BandStatus } from "@/lib/band-page";

/**
 * Running a band: editing its page, shows, open spots, the band chat and notes from
 * outside. Row-level security and the database functions are the real guard: only
 * current members can change anything.
 */

type Result = { error?: string };

const bandId = (id: string) => (/^\d{1,18}$/.test(id) ? Number(id) : null);
const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;
const SIGNED_OUT = { error: "You're signed out. Sign in again." };
const DEMO = { error: "This is a sample band. Sign in to run your own." };

function refresh(id: number) {
  revalidatePath(`/b/${id}`);
  revalidatePath(`/bands/${id}`);
}

export type BandDetails = { bio: string; city: string; genres: string[]; status: BandStatus; photoUrl: string | null };

export async function saveBandDetails(id: string, d: BandDetails): Promise<Result> {
  const n = bandId(id);
  if (n === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const { error } = await viewer.supabase.rpc("update_band", {
    p_band: n,
    p_bio: d.bio.trim().slice(0, 600),
    p_city: clean(d.city, 80),
    p_genres: d.genres.map((g) => g.trim()).filter(Boolean).slice(0, 5),
    p_status: d.status,
    p_photo_url: d.photoUrl,
  });
  if (error) return { error: error.message.includes("bad photo") ? "That photo didn't upload. Try another." : "That didn't save. Try again." };
  refresh(n);
  return {};
}

export type ShowInput = { date: string; time: string; venue: string; city: string; ticketUrl: string; withText: string; withBands: string[] };

export async function addShow(id: string, s: ShowInput): Promise<Result> {
  const n = bandId(id);
  if (n === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return { error: "Pick the date." };
  const venue = clean(s.venue, 80);
  if (!venue || venue.length < 2) return { error: "Say where you're playing." };
  let ticket = clean(s.ticketUrl, 500);
  if (ticket && !/^https?:\/\//i.test(ticket)) ticket = `https://${ticket}`;
  if (ticket) {
    try {
      new URL(ticket);
    } catch {
      return { error: "That ticket link doesn't look right." };
    }
  }
  const { data, error } = await viewer.supabase
    .from("band_shows")
    .insert({ band_id: n, added_by: viewer.id, show_date: s.date, show_time: clean(s.time, 20), venue, city: clean(s.city, 80), ticket_url: ticket, with_text: clean(s.withText, 120) })
    .select("id")
    .single();
  if (error || !data) return { error: "That show didn't save. Try again." };
  const tags = [...new Set(s.withBands.map(bandId).filter((b): b is number => b !== null && b !== n))].slice(0, 6);
  if (tags.length) await viewer.supabase.from("band_show_bands").insert(tags.map((b) => ({ show_id: data.id, band_id: b })));
  refresh(n);
  return {};
}

export async function removeShow(id: string, showId: string): Promise<Result> {
  const n = bandId(id);
  const s = bandId(showId);
  if (n === null || s === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const { error } = await viewer.supabase.from("band_shows").delete().eq("id", s).eq("band_id", n);
  if (error) return { error: "That didn't work. Try again." };
  refresh(n);
  return {};
}

/** Another band tagged you on their show: yes, we played that one (or no, take it off). */
export async function answerBill(id: string, showId: string, yes: boolean): Promise<Result> {
  const n = bandId(id);
  const s = bandId(showId);
  if (n === null || s === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const { error } = yes
    ? await viewer.supabase.rpc("confirm_shared_bill", { p_show: s, p_band: n })
    : await viewer.supabase.from("band_show_bands").delete().eq("show_id", s).eq("band_id", n);
  if (error) return { error: "That didn't work. Try again." };
  refresh(n);
  return {};
}

/** Bands to tag on a show, by name. */
export async function findBands(q: string): Promise<{ id: string; name: string }[]> {
  const viewer = await getViewer();
  const term = q.replace(/[^\p{L}\p{N} .'&-]/gu, "").trim().slice(0, 40);
  if (!viewer || term.length < 2) return [];
  const { data } = await viewer.supabase.from("bands").select("id, name").ilike("name", `%${term}%`).limit(8);
  return ((data ?? []) as { id: number; name: string }[]).map((b) => ({ id: String(b.id), name: b.name }));
}

export type SpotInput = { role: string; details: string; paid: boolean; pay: string };

/** An open spot: a Board post for the band, shown on its page, the Board and Search. */
export async function postSpot(id: string, s: SpotInput): Promise<Result> {
  const n = bandId(id);
  if (n === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const role = clean(s.role, 60);
  if (!role) return { error: "Say who you're looking for." };
  const { data: band } = await viewer.supabase.from("bands").select("name, city").eq("id", n).maybeSingle<{ name: string; city: string | null }>();
  if (!band) return { error: "That band isn't here anymore." };
  const { error } = await viewer.supabase.from("board_posts").insert({
    author_id: viewer.id,
    band_id: n,
    kind: "band_seeking",
    title: `${band.name}: ${spotTitle(role).replace(/^Looking/, "looking")}`.slice(0, 80),
    role,
    details: s.details.trim().slice(0, 1000) || null,
    neighborhood: band.city ?? viewer.profile?.neighborhood ?? null,
    paid: Boolean(s.paid),
    pay: s.paid ? clean(s.pay, 40) : null,
  });
  if (error) return { error: "That didn't post. Try again." };
  refresh(n);
  revalidatePath("/board");
  return {};
}

export async function closeSpot(id: string, postId: string): Promise<Result> {
  const n = bandId(id);
  const p = bandId(postId);
  if (n === null || p === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const { error } = await viewer.supabase.from("board_posts").update({ closed_at: new Date().toISOString() }).eq("id", p).eq("band_id", n);
  if (error) return { error: "That didn't close. Try again." };
  refresh(n);
  revalidatePath("/board");
  return {};
}

/**
 * `clientId`: the phone's id for this send, the same on a retry. The database keeps one row per
 * band, sender and send id, so a retry after a lost answer doesn't post twice.
 */
export async function sendBandMessage(id: string, body: string, clientId?: string): Promise<Result> {
  const n = bandId(id);
  if (n === null) return DEMO;
  const text = body.trim().slice(0, 4000);
  if (!text) return { error: "Write something first." };
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const client_id = clientId && /^[0-9a-f-]{36}$/i.test(clientId) ? clientId : undefined;
  const row = { band_id: n, sender_id: viewer.id, kind: "text", body: text };
  let { error } = await viewer.supabase.from("band_messages").insert(client_id ? { ...row, client_id } : row);
  if (error?.code === "23505" && client_id) return {}; // landed on an earlier try
  if (error && client_id && (error.code === "42703" || error.code === "PGRST204")) ({ error } = await viewer.supabase.from("band_messages").insert(row));
  if (error) return { error: "That didn't send. Try again." };
  after(() => notifyBandMessage(n, viewer.id, text));
  revalidatePath("/messages", "layout");
  return {};
}

/** A voice note already uploaded to voice/band-<id>/<you>/…; this posts it to the band chat. */
export async function sendBandVoice(id: string, path: string, seconds: number): Promise<Result> {
  const n = bandId(id);
  if (n === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!path.startsWith(`band-${n}/${viewer.id}/`) || path.includes("..")) return { error: "That didn't send. Try again." };
  const voice_seconds = Math.min(120, Math.max(1, Math.round(seconds)));
  const { error } = await viewer.supabase.from("band_messages").insert({ band_id: n, sender_id: viewer.id, kind: "voice", voice_url: path, voice_seconds });
  if (error) return { error: "That didn't send. Try again." };
  after(() => notifyBandMessage(n, viewer.id, null, voice_seconds));
  revalidatePath("/messages", "layout");
  return {};
}

const NOTE_ERRORS: Record<string, string> = {
  "one note a day": "You already wrote to this band today. They'll see it in their chat.",
  "too many notes today": "That's a lot of notes for one day. Try again tomorrow.",
  "you are in this band": "You're in this band. Use the band chat.",
  "not available": "You can't write to this band.",
};

/** "Message the band" from someone outside it. */
export async function sendBandNote(id: string, note: string): Promise<Result> {
  const n = bandId(id);
  if (n === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to write to the band." };
  const text = note.trim().slice(0, 500);
  if (text.length < 2) return { error: "Write a few words first." };
  const { error } = await viewer.supabase.rpc("send_band_note", { p_band: n, p_body: text });
  if (error) {
    const known = Object.keys(NOTE_ERRORS).find((k) => error.message.includes(k));
    return { error: known ? NOTE_ERRORS[known] : "That didn't send. Try again." };
  }
  after(() => notifyBandNote(n, viewer.id, text));
  return {};
}

/** Give one of your current projects its band page and Your band. Returns the band id. */
export async function startBand(projectId: string): Promise<{ id?: string; error?: string }> {
  const p = bandId(projectId);
  if (p === null) return DEMO;
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const { data, error } = await viewer.supabase.rpc("start_band", { p_project: p });
  if (error || data == null) return { error: "That didn't work. Try again." };
  revalidatePath("/me");
  return { id: String(data) };
}

/** Opening the band chat marks it read. Called by the chat itself, not its loader, so prefetching the page never clears unread counts. */
export async function markBandRead(id: string): Promise<void> {
  const n = bandId(id);
  if (n === null) return;
  const viewer = await getViewer();
  if (!viewer) return;
  await viewer.supabase.rpc("mark_band_read", { p_band: n });
}
