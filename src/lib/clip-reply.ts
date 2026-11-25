/**
 * Clip replies: a chat message that points at a clip (yours or theirs) and, optionally, a
 * moment in it. The database checks the clip belongs to someone in the chat and that the moment
 * is inside it when its length is known (migration 20261125040000).
 */

/** Longest moment we accept when a clip's length is unknown: six hours, same as the database. */
export const MAX_CLIP_AT = 21600;

/** "1:23", "12:05", "1:02:03". */
export function clipTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Reads "83", "1:23" or "1:02:03" into seconds. Empty means no moment; anything else is invalid. */
export function parseClipTime(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{1,5}(:\d{1,2}){0,2}$/.test(t)) return "invalid";
  const parts = t.split(":").map(Number);
  if (parts.slice(1).some((p) => p > 59)) return "invalid";
  const s = parts.reduce((acc, p) => acc * 60 + p, 0);
  return s > MAX_CLIP_AT ? "invalid" : s;
}

/** A moment the server will accept: a whole number of seconds inside the clip, or none. */
export function boundClipAt(at: unknown, duration?: number | null): number | null | "invalid" {
  if (at === null || at === undefined) return null;
  if (typeof at !== "number" || !Number.isInteger(at) || at < 0 || at > MAX_CLIP_AT) return "invalid";
  if (duration && at > duration) return "invalid";
  return at;
}

/** The one-line summary for the inbox, emails and push when a message has no text. */
export function messagePreview(m: { body: string | null; voice_url?: string | null; voiceSeconds?: number | null; clipAt?: number | null; clip?: boolean }) {
  if (m.body) return m.body;
  if (m.voice_url || m.voiceSeconds) return "Voice note";
  // A message with no text and no voice note is a clip reply (the database allows nothing else).
  return m.clipAt != null ? `Sent a clip at ${clipTime(m.clipAt)}` : "Sent a clip";
}
