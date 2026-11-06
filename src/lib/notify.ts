import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./supabase/config";
import { wants, type Prefs } from "./notification-types";

/**
 * Sends the email side of notifications through Resend (mail.mixstro.com).
 *
 * Needs two server-only env vars: RESEND_API_KEY, and SUPABASE_SERVICE_ROLE_KEY to look
 * up the recipient's email address and settings (people can't read each other's emails).
 * Without them this quietly does nothing, so local dev and demo mode keep working.
 *
 * Every send checks the recipient's notification settings and a per-type throttle,
 * and never throws: a failed email must never fail the action that triggered it.
 */

const APP_URL = (process.env.APP_URL || "https://app.mixstro.com").replace(/\/$/, "");
const FROM = process.env.NOTIFY_FROM || "Mixstro <no-reply@mail.mixstro.com>";

export type NotifyType = "connect" | "message" | "jam" | "board" | "alerts";

export type Email = {
  /** Which setting governs it (Settings > Notifications). */
  type: NotifyType;
  /** Throttle key, e.g. a connection id, so one chat sends at most one email per window. */
  ref?: string;
  /** Skip if we already sent this type+ref within this many minutes. */
  throttleMinutes?: number;
  subject: string;
  /** One short line above the button. */
  headline: string;
  body: string;
  cta: { label: string; path: string };
};

let admin: SupabaseClient | null | undefined;
function adminClient() {
  if (admin !== undefined) return admin;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin = key && SUPABASE_URL ? createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return admin;
}

export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && adminClient());

export async function notify(recipientId: string, email: Email): Promise<void> {
  try {
    const db = adminClient();
    const key = process.env.RESEND_API_KEY;
    if (!db || !key) return;

    const [{ data: prefsRow }, { data: user }] = await Promise.all([
      db.from("notification_prefs").select("prefs").eq("profile_id", recipientId).maybeSingle(),
      db.auth.admin.getUserById(recipientId),
    ]);
    if (!wants(((prefsRow?.prefs as Prefs) ?? {}) as Prefs, email.type, "email")) return;
    const to = user?.user?.email;
    if (!to) return;

    const ref = email.ref ?? "";
    if (email.throttleMinutes) {
      const since = new Date(Date.now() - email.throttleMinutes * 60_000).toISOString();
      const { count } = await db
        .from("notification_log")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", recipientId)
        .eq("type", email.type)
        .eq("ref", ref)
        .eq("channel", "email")
        .gte("sent_at", since);
      if (count) return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: email.subject,
        html: render(email),
        text: `${email.headline}\n\n${email.body}\n\n${email.cta.label}: ${APP_URL}${email.cta.path}\n\nChange what we email you: ${APP_URL}/settings/notifications`,
        headers: { "List-Unsubscribe": `<${APP_URL}/settings/notifications>` },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) await db.from("notification_log").insert({ recipient_id: recipientId, type: email.type, ref, channel: "email" });
    else console.error("notify: Resend", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("notify:", e);
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The same dark, Tungsten-striped card as the sign-in code email. */
function render(e: Email) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(e.subject)}</title></head>
<body style="margin:0;padding:0;background:#0F0D0B;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(e.body)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0F0D0B;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td align="center" style="padding:0 0 28px;"><img src="${APP_URL}/email/mixstro-lockup.png" width="161" height="32" alt="mixstro" style="display:block;border:0;width:161px;height:32px;"></td></tr>
<tr><td style="background:#1A1816;border-radius:24px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:#FFB245;background-image:linear-gradient(90deg,#F7BF77,#FFB245 30%,#FFACBA 60%,#B5C5FF 80%,#67E2DA);">&nbsp;</td></tr>
<tr><td style="padding:32px 32px 8px;font-family:${font};">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:700;color:#F5F1EC;">${esc(e.headline)}</h1>
<p style="margin:0;font-size:16px;line-height:1.55;color:#A8A49E;">${esc(e.body)}</p>
</td></tr>
<tr><td style="padding:24px 32px 32px;font-family:${font};">
<a href="${APP_URL}${e.cta.path}" style="display:inline-block;background:#F5F1EC;color:#0F0D0B;font-size:16px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:999px;">${esc(e.cta.label)}</a>
</td></tr></table></td></tr>
<tr><td align="center" style="padding:24px 8px 0;font-family:${font};font-size:12px;line-height:1.6;color:#6F6B66;">
You're getting this because of your Mixstro notification settings.<br><a href="${APP_URL}/settings/notifications" style="color:#A8A49E;">Change what we email you</a>
</td></tr></table></td></tr></table></body></html>`;
}

/* ---------- Events: what each action tells the other person ---------- */

type Person = { id: string; first_name: string; username: string; main_instrument: string | null; instruments: string[] };

async function people(ids: string[]) {
  const db = adminClient();
  if (!db) return new Map<string, Person>();
  const { data } = await db.from("profiles").select("id, first_name, username, main_instrument, instruments").in("id", ids);
  return new Map(((data ?? []) as Person[]).map((p) => [p.id, p]));
}

const plays = (p: Person) => (p.main_instrument ?? p.instruments?.[0] ?? "musician").toLowerCase();

/** The other person in a connection, and who's sending. */
async function across(connectionId: number, senderId: string) {
  const db = adminClient();
  if (!db) return null;
  const { data } = await db.from("connections").select("from_id, to_id").eq("id", connectionId).maybeSingle<{ from_id: string; to_id: string }>();
  if (!data) return null;
  const otherId = data.from_id === senderId ? data.to_id : data.from_id;
  const map = await people([senderId, otherId]);
  const from = map.get(senderId);
  return from ? { from, otherId } : null;
}

/** Someone sent you a Connect. */
export async function notifyConnect(fromId: string, toId: string) {
  if (!emailEnabled()) return;
  const from = (await people([fromId])).get(fromId);
  if (!from) return;
  await notify(toId, {
    type: "connect",
    ref: fromId,
    throttleMinutes: 60 * 24 * 7,
    subject: `${from.first_name} wants to play with you`,
    headline: `${from.first_name} wants to play with you`,
    body: `${from.first_name} (${plays(from)}) sent you a Connect on Mixstro. Have a listen and answer with one tap.`,
    cta: { label: `See ${from.first_name}'s music`, path: `/m/${from.username}` },
  });
}

/** They accepted your Connect: the chat is open. */
export async function notifyConnectBack(fromId: string, toId: string) {
  if (!emailEnabled()) return;
  const from = (await people([fromId])).get(fromId);
  if (!from) return;
  await notify(toId, {
    type: "connect",
    ref: `back:${fromId}`,
    throttleMinutes: 60 * 24 * 7,
    subject: `${from.first_name} connected back`,
    headline: `You and ${from.first_name} are connected`,
    body: `${from.first_name} said yes. Say hi, send a clip, or plan a jam.`,
    cta: { label: "Open the chat", path: `/messages/${from.username}` },
  });
}

/** A new message or voice note. At most one email per chat every 30 minutes. */
export async function notifyMessage(connectionId: number, senderId: string, preview: string | null) {
  if (!emailEnabled()) return;
  const x = await across(connectionId, senderId);
  if (!x) return;
  const text = preview ? (preview.length > 140 ? `${preview.slice(0, 137)}…` : preview) : "Sent you a voice note.";
  await notify(x.otherId, {
    type: "message",
    ref: String(connectionId),
    throttleMinutes: 30,
    subject: `New message from ${x.from.first_name}`,
    headline: `${x.from.first_name} wrote to you`,
    body: preview ? `“${text}”` : `${x.from.first_name} sent you a voice note.`,
    cta: { label: "Reply", path: `/messages/${x.from.username}` },
  });
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });

/** A jam invite (or a new time for one). */
export async function notifyJamInvite(connectionId: number, senderId: string, startsAt: string, place: string, newTime: boolean) {
  if (!emailEnabled()) return;
  const x = await across(connectionId, senderId);
  if (!x) return;
  await notify(x.otherId, {
    type: "jam",
    subject: newTime ? `${x.from.first_name} suggested another time` : `${x.from.first_name} invited you to jam`,
    headline: newTime ? `${x.from.first_name} suggested another time` : `${x.from.first_name} wants to jam`,
    body: `${when(startsAt)} (Pacific) at ${place}. Say yes, or suggest another time.`,
    cta: { label: "Answer the invite", path: `/messages/${x.from.username}` },
  });
}

/** They said yes to your jam. */
export async function notifyJamAccepted(jamId: number, accepterId: string) {
  if (!emailEnabled()) return;
  const db = adminClient();
  const { data: jam } = await db!.from("jams").select("connection_id, starts_at, place").eq("id", jamId).maybeSingle<{ connection_id: number; starts_at: string; place: string }>();
  if (!jam) return;
  const x = await across(jam.connection_id, accepterId);
  if (!x) return;
  await notify(x.otherId, {
    type: "jam",
    subject: `${x.from.first_name} is in for the jam`,
    headline: `It's on: you're jamming with ${x.from.first_name}`,
    body: `${when(jam.starts_at)} (Pacific) at ${jam.place}. Add it to your calendar from the chat.`,
    cta: { label: "See the jam", path: `/messages/${x.from.username}` },
  });
}

/** Someone answered your Board post. */
export async function notifyBoardReply(postId: number, fromId: string, authorId: string, note: string | null) {
  if (!emailEnabled()) return;
  const db = adminClient();
  const [{ data: post }, map] = await Promise.all([db!.from("board_posts").select("title").eq("id", postId).maybeSingle<{ title: string }>(), people([fromId])]);
  const from = map.get(fromId);
  if (!post || !from) return;
  await notify(authorId, {
    type: "board",
    ref: String(postId),
    throttleMinutes: 60,
    subject: `${from.first_name} answered “${post.title}”`,
    headline: `${from.first_name} answered your post`,
    body: note ? `On “${post.title}”: “${note}”` : `${from.first_name} (${plays(from)}) answered “${post.title}” with their profile.`,
    cta: { label: "See who answered", path: `/board/${postId}` },
  });
}

/** Someone tagged you as a bandmate: confirm your spot. */
export async function notifyBandInvite(fromId: string, toId: string, token: string) {
  if (!emailEnabled()) return;
  const db = adminClient()!;
  const [{ data: inv }, map] = await Promise.all([
    db.from("band_invites").select("bands(name)").eq("token", token).maybeSingle<{ bands: { name: string } | null }>(),
    people([fromId]),
  ]);
  const from = map.get(fromId);
  const band = inv?.bands?.name;
  if (!from || !band) return;
  await notify(toId, {
    type: "connect",
    ref: `band:${token}`,
    throttleMinutes: 60 * 24 * 30,
    subject: `${from.first_name} added you to ${band}`,
    headline: `${from.first_name} added you to ${band}`,
    body: `Confirm your spot and ${band} shows on your Mixstro profile too, with everyone who played in it.`,
    cta: { label: "Confirm your spot", path: `/join/${token}` },
  });
}
