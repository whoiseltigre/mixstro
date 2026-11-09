import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./supabase/config";
import { wants, type Prefs } from "./notification-types";
import { pushEnabled, sendPush } from "./push";

/**
 * Sends notifications: email through Resend (mail.mixstro.com) and web push (src/lib/push.ts).
 *
 * Needs two server-only env vars: RESEND_API_KEY, and SUPABASE_SERVICE_ROLE_KEY to look
 * up the recipient's email address and settings (people can't read each other's emails).
 * Without them this quietly does nothing, so local dev and demo mode keep working.
 *
 * Push needs the VAPID keys too; each channel works on its own if the other isn't set up.
 *
 * Every send checks the recipient's notification settings and a per-type throttle per channel,
 * and never throws: a failed email must never fail the action that triggered it.
 */

const APP_URL = (process.env.APP_URL || "https://app.mixstro.com").replace(/\/$/, "");
const FROM = process.env.NOTIFY_FROM || "Mixstro <no-reply@mail.mixstro.com>";

export type NotifyType = "connect" | "message" | "jam" | "board" | "alerts";

/** The pieces an email is built from, top to bottom inside the card (see the "Mixstro emails" design). */
export type Block =
  /** Who it's from: photo (or initial), name, and what they play and where. */
  | { kind: "who"; photo: string | null; name: string; line: string }
  | { kind: "badge"; text: string }
  | { kind: "headline"; text: string }
  | { kind: "text"; text: string }
  | { kind: "fine"; text: string }
  /** Shared influences. */
  | { kind: "chips"; items: string[] }
  /** Their message, as a chat bubble. */
  | { kind: "bubble"; text: string }
  | { kind: "voice"; seconds: number | null }
  | { kind: "jam"; startsAt: string; place: string; note?: string | null }
  /** A Board post, as a small outlined card. */
  | { kind: "post"; label: string; title: string; line: string }
  | { kind: "band"; name: string; line: string };

export type Email = {
  /** Which setting governs it (Settings > Notifications). */
  type: NotifyType;
  /** Throttle key, e.g. a connection id, so one chat sends at most one email per window. */
  ref?: string;
  /** Skip if we already sent this type+ref within this many minutes. */
  throttleMinutes?: number;
  subject: string;
  /** The grey line inboxes show after the subject. */
  preheader: string;
  blocks: Block[];
  /** One main button, and optionally a quiet text link for the other answer. */
  cta: { label: string; path: string };
  alt?: { label: string; path: string };
  attachments?: { filename: string; content: string; content_type?: string }[];
  /** The phone notification. Defaults to the subject and preheader, opening the main button's page. */
  push?: { title?: string; body?: string };
};

let admin: SupabaseClient | null | undefined;
export function adminClient() {
  if (admin !== undefined) return admin;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin = key && SUPABASE_URL ? createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return admin;
}

export const emailEnabled = () => Boolean(adminClient() && (process.env.RESEND_API_KEY || pushEnabled()));

export async function notify(recipientId: string, email: Email): Promise<void> {
  try {
    const db = adminClient();
    if (!db) return;
    const key = process.env.RESEND_API_KEY;
    const { data: prefsRow } = await db.from("notification_prefs").select("prefs").eq("profile_id", recipientId).maybeSingle();
    const prefs = ((prefsRow?.prefs as Prefs) ?? {}) as Prefs;
    const ref = email.ref ?? "";

    const recentlySent = async (channel: "email" | "push") => {
      if (!email.throttleMinutes) return false;
      const since = new Date(Date.now() - email.throttleMinutes * 60_000).toISOString();
      const { count } = await db
        .from("notification_log")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", recipientId)
        .eq("type", email.type)
        .eq("ref", ref)
        .eq("channel", channel)
        .gte("sent_at", since);
      return Boolean(count);
    };
    const log = (channel: "email" | "push") => db.from("notification_log").insert({ recipient_id: recipientId, type: email.type, ref, channel });

    const sendPushSide = async () => {
      if (!pushEnabled() || !wants(prefs, email.type, "push") || (await recentlySent("push"))) return;
      const who = email.blocks.find((b) => b.kind === "who");
      const ok = await sendPush(db, recipientId, {
        title: email.push?.title ?? email.subject,
        body: email.push?.body ?? email.preheader,
        url: email.cta.path,
        tag: `${email.type}:${ref}`,
        icon: who?.kind === "who" ? who.photo : null,
      });
      if (ok) await log("push");
    };

    const sendEmailSide = async () => {
      if (!key || !wants(prefs, email.type, "email") || (await recentlySent("email"))) return;
      const { data: user } = await db.auth.admin.getUserById(recipientId);
      const to = user?.user?.email;
      if (!to) return;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to,
          subject: email.subject,
          html: render(email),
          text: plain(email),
          ...(email.attachments ? { attachments: email.attachments } : {}),
          headers: { "List-Unsubscribe": `<${APP_URL}/settings/notifications>` },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) await log("email");
      else console.error("notify: Resend", res.status, await res.text().catch(() => ""));
    };

    await Promise.all([sendPushSide().catch((e) => console.error("notify push:", e)), sendEmailSide().catch((e) => console.error("notify email:", e))]);
  } catch (e) {
    console.error("notify:", e);
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- The look: dark card, color stripe, Inter Tight headlines (approved 2026-11-08) ---------- */

const C = { ink: "#0F0D0B", stage: "#1A1816", riser: "#26231F", paper: "#F5F1EC", smoke: "#A8A49E", dim: "#6F6B66", tungsten: "#FFB245", line: "#34302C" };
const BODY = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "'Inter Tight','Helvetica Neue',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
const TZ = "America/Los_Angeles";

const part = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("en-US", { ...o, timeZone: TZ });
const clock = (iso: string) => `${part(iso, { hour: "numeric", minute: "2-digit" })} PT`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** One row inside the card. Every block is its own table row so Outlook and Gmail keep the spacing. */
function block(b: Block): string {
  const row = (inner: string, pad = "0 28px 16px") => `<tr><td style="padding:${pad};font-family:${BODY};">${inner}</td></tr>`;
  switch (b.kind) {
    case "who": {
      const pic = b.photo
        ? `<img src="${esc(b.photo)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border-radius:26px;object-fit:cover;border:0;">`
        : `<div style="width:52px;height:52px;border-radius:26px;background:#3A2E22;color:${C.paper};font-family:${DISPLAY};font-weight:800;font-size:22px;line-height:52px;text-align:center;">${esc(b.name.slice(0, 1).toUpperCase())}</div>`;
      return row(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="52" style="width:52px;">${pic}</td><td style="padding-left:12px;font-family:${BODY};"><div style="font-size:15px;font-weight:600;color:${C.paper};">${esc(b.name)}</div><div style="font-size:13px;color:${C.smoke};padding-top:2px;">${esc(b.line)}</div></td></tr></table>`,
        "0 28px 18px",
      );
    }
    case "badge":
      return row(`<span style="display:inline-block;font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;background:#173332;color:#67E2DA;">${esc(b.text)}</span>`, "0 28px 12px");
    case "headline":
      return row(`<h1 style="margin:0;font-family:${DISPLAY};font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.01em;color:${C.paper};">${esc(b.text)}</h1>`, "0 28px 12px");
    case "text":
      return row(`<p style="margin:0;font-size:15px;line-height:1.55;color:${C.smoke};">${esc(b.text)}</p>`);
    case "fine":
      return row(`<p style="margin:0;font-size:13px;line-height:1.5;color:${C.dim};">${esc(b.text)}</p>`);
    case "chips":
      return row(
        b.items
          .map((t) => `<span style="display:inline-block;margin:0 6px 6px 0;font-size:12px;padding:5px 10px;border-radius:999px;background:#33281A;color:#FFD08A;">${esc(t)}</span>`)
          .join(""),
        "0 28px 10px",
      );
    case "bubble":
      return row(`<div style="background:${C.riser};border-radius:18px 18px 18px 6px;padding:12px 14px;font-size:15px;line-height:1.5;color:${C.paper};">${esc(b.text)}</div>`);
    case "voice":
      return row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.riser};border-radius:18px;"><tr><td width="26" style="padding:10px 0 10px 14px;width:26px;"><div style="width:26px;height:26px;border-radius:13px;background:${C.tungsten};color:${C.ink};font-size:11px;line-height:26px;text-align:center;">&#9654;</div></td><td style="padding:10px 14px 10px 10px;font-family:${BODY};font-size:14px;color:${C.paper};">Voice note${b.seconds ? `<span style="color:${C.smoke};"> &middot; ${mmss(b.seconds)}</span>` : ""}</td></tr></table>`,
      );
    case "jam": {
      const month = part(b.startsAt, { month: "short" }).toUpperCase();
      const day = part(b.startsAt, { day: "numeric" });
      const wd = part(b.startsAt, { weekday: "short" }).toUpperCase();
      const note = b.note ? `<div style="font-size:13px;color:${C.smoke};font-style:italic;padding-top:2px;">&ldquo;${esc(b.note)}&rdquo;</div>` : "";
      return row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.riser};border-radius:18px;"><tr>
<td width="58" style="padding:12px 0 12px 12px;width:58px;" valign="middle"><table role="presentation" width="58" cellpadding="0" cellspacing="0" border="0" style="background:${C.ink};border-radius:12px;"><tr><td align="center" style="padding:6px 0;font-family:${BODY};"><div style="font-size:10px;letter-spacing:0.1em;color:${C.tungsten};">${month}</div><div style="font-family:${DISPLAY};font-weight:800;font-size:24px;line-height:1.1;color:${C.paper};">${day}</div><div style="font-size:10px;letter-spacing:0.1em;color:${C.tungsten};">${wd}</div></td></tr></table></td>
<td style="padding:12px 14px;font-family:${BODY};" valign="middle"><div style="font-size:15px;font-weight:600;color:${C.paper};">${clock(b.startsAt)}</div><div style="font-size:13px;color:${C.smoke};padding-top:2px;">${esc(b.place)}</div>${note}</td>
</tr></table>`,
      );
    }
    case "post":
      return row(
        `<div style="border:1px solid ${C.line};border-radius:16px;padding:12px 14px;"><div style="font-size:11px;letter-spacing:0.1em;color:${C.dim};text-transform:uppercase;">${esc(b.label)}</div><div style="font-size:15px;font-weight:600;color:${C.paper};padding-top:2px;">${esc(b.title)}</div>${b.line ? `<div style="font-size:13px;color:${C.smoke};padding-top:2px;">${esc(b.line)}</div>` : ""}</div>`,
      );
    case "band":
      return row(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="76" style="width:76px;"><div style="width:76px;height:76px;border-radius:16px;background:#3A2E22;background-image:linear-gradient(140deg,#6B4A2A,#1A1816);color:${C.paper};font-family:${DISPLAY};font-weight:800;font-size:30px;line-height:76px;text-align:center;">${esc(b.name.slice(0, 1).toUpperCase())}</div></td><td style="padding-left:14px;font-family:${BODY};"><div style="font-size:12px;color:${C.smoke};">${esc(b.line)}</div><div style="font-family:${DISPLAY};font-weight:800;font-size:22px;line-height:1.2;color:${C.paper};">${esc(b.name)}</div></td></tr></table>`,
        "0 28px 18px",
      );
  }
}

function render(e: Email) {
  const alt = e.alt ? `<td style="padding-left:18px;font-family:${BODY};"><a href="${APP_URL}${e.alt.path}" style="color:${C.smoke};font-size:14px;text-decoration:underline;">${esc(e.alt.label)}</a></td>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(e.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@800&family=Geist:wght@400;600&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${C.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(e.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ink};"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td align="center" style="padding:0 0 22px;"><img src="${APP_URL}/email/mixstro-lockup.png" width="122" height="24" alt="mixstro" style="display:block;border:0;width:122px;height:24px;"></td></tr>
<tr><td style="background:${C.stage};border-radius:22px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:${C.tungsten};background-image:linear-gradient(90deg,#F7BF77,#FFB245 30%,#FFACBA 60%,#B5C5FF 80%,#67E2DA);">&nbsp;</td></tr>
<tr><td height="26" style="height:26px;line-height:26px;font-size:0;">&nbsp;</td></tr>
${e.blocks.map(block).join("\n")}
<tr><td style="padding:8px 28px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:${C.paper};border-radius:999px;"><a href="${APP_URL}${e.cta.path}" style="display:inline-block;padding:13px 22px;font-family:${BODY};font-size:15px;font-weight:600;color:${C.ink};text-decoration:none;border-radius:999px;">${esc(e.cta.label)}</a></td>${alt}
</tr></table></td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 8px 0;font-family:${BODY};font-size:12px;line-height:1.6;color:${C.dim};">
You're getting this because of your Mixstro notification settings.<br><a href="${APP_URL}/settings/notifications" style="color:${C.smoke};">Change what we email you</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** The plain-text part, for clients that don't show HTML (and for spam filters). */
function plain(e: Email) {
  const lines = e.blocks.map((b) => {
    switch (b.kind) {
      case "who":
        return `${b.name} (${b.line})`;
      case "chips":
        return b.items.join(", ");
      case "bubble":
        return `“${b.text}”`;
      case "voice":
        return `Voice note${b.seconds ? ` (${mmss(b.seconds)})` : ""}`;
      case "jam":
        return `${part(b.startsAt, { weekday: "long", month: "short", day: "numeric" })}, ${clock(b.startsAt)} at ${b.place}${b.note ? `\n“${b.note}”` : ""}`;
      case "post":
        return `${b.label}: ${b.title}${b.line ? ` (${b.line})` : ""}`;
      case "band":
        return `${b.name} (${b.line})`;
      default:
        return b.text;
    }
  });
  const alt = e.alt ? `\n${e.alt.label}: ${APP_URL}${e.alt.path}` : "";
  return `${lines.join("\n\n")}\n\n${e.cta.label}: ${APP_URL}${e.cta.path}${alt}\n\nChange what we email you: ${APP_URL}/settings/notifications`;
}

/* ---------- Events: what each action tells the other person ---------- */

type Person = { id: string; first_name: string; username: string; main_instrument: string | null; instruments: string[]; neighborhood: string | null; avatar_url: string | null };

async function people(ids: string[]) {
  const db = adminClient();
  if (!db) return new Map<string, Person>();
  const { data } = await db.from("profiles").select("id, first_name, username, main_instrument, instruments, neighborhood, avatar_url").in("id", ids);
  return new Map(((data ?? []) as Person[]).map((p) => [p.id, p]));
}

const plays = (p: Person) => (p.main_instrument ?? p.instruments?.[0] ?? "musician").toLowerCase();

/** "Bass, guitar · Echo Park" */
function line(p: Person) {
  const inst = [p.main_instrument, ...(p.instruments ?? [])].filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i).slice(0, 2);
  const what = inst.length ? inst.map((x, i) => (i ? x.toLowerCase() : x[0].toUpperCase() + x.slice(1))).join(", ") : "Musician";
  return [what, p.neighborhood].filter(Boolean).join(" · ");
}

const who = (p: Person): Block => ({ kind: "who", photo: p.avatar_url?.startsWith("https://") ? p.avatar_url : null, name: p.first_name, line: line(p) });

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

/** Influences two people share, in the sender's order. */
async function sharedInfluences(a: string, b: string) {
  const { data } = await adminClient()!.from("influences").select("profile_id, artist_id, artist_name, rank").in("profile_id", [a, b]).order("rank");
  const rows = (data ?? []) as { profile_id: string; artist_id: string; artist_name: string }[];
  const theirs = new Set(rows.filter((r) => r.profile_id === b).map((r) => r.artist_id));
  return rows.filter((r) => r.profile_id === a && theirs.has(r.artist_id)).map((r) => r.artist_name);
}

/** Someone sent you a Connect. */
export async function notifyConnect(fromId: string, toId: string) {
  if (!emailEnabled()) return;
  const [map, shared] = await Promise.all([people([fromId]), sharedInfluences(fromId, toId)]);
  const from = map.get(fromId);
  if (!from) return;
  const n = shared.length;
  await notify(toId, {
    type: "connect",
    ref: fromId,
    throttleMinutes: 60 * 24 * 7,
    subject: `${from.first_name} wants to play with you`,
    preheader: n ? `${line(from)}. You both love ${shared[0]}.` : `${line(from)}. Have a listen and answer with one tap.`,
    blocks: [
      who(from),
      { kind: "headline", text: `${from.first_name} wants to play with you` },
      { kind: "text", text: n ? `${from.first_name} sent you a Connect, and you share ${n} influence${n === 1 ? "" : "s"}.` : `${from.first_name} sent you a Connect. Have a listen and answer with one tap.` },
      ...(n ? [{ kind: "chips" as const, items: [...shared.slice(0, 3), ...(n > 3 ? [`+${n - 3}`] : [])] }] : []),
    ],
    cta: { label: `See ${from.first_name}'s music`, path: `/m/${from.username}` },
    alt: { label: "Not the right fit", path: `/m/${from.username}` },
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
    subject: `${from.first_name} said yes`,
    preheader: "You're connected. Say hi, send a clip, or plan a jam.",
    blocks: [
      who(from),
      { kind: "headline", text: `You and ${from.first_name} are connected` },
      { kind: "text", text: "Most good bands start with one message. Say hi, send a clip, or plan a jam." },
    ],
    cta: { label: "Open the chat", path: `/messages/${from.username}` },
  });
}

/** A new message or voice note. At most one email per chat every 30 minutes. */
export async function notifyMessage(connectionId: number, senderId: string, preview: string | null, voiceSeconds: number | null = null) {
  if (!emailEnabled()) return;
  const x = await across(connectionId, senderId);
  if (!x) return;
  const text = preview ? (preview.length > 280 ? `${preview.slice(0, 277)}…` : preview) : null;
  const short = text && text.length > 48 ? `${text.slice(0, 46).trimEnd()}…` : text;
  await notify(x.otherId, {
    type: "message",
    ref: String(connectionId),
    throttleMinutes: 30,
    subject: short ? `${x.from.first_name}: “${short}”` : `${x.from.first_name} sent you a voice note`,
    preheader: "Reply on Mixstro.",
    blocks: [who(x.from), text ? { kind: "bubble", text } : { kind: "voice", seconds: voiceSeconds }],
    cta: { label: "Reply", path: `/messages/${x.from.username}` },
    push: { title: x.from.first_name, body: text ?? (voiceSeconds ? `Voice note · ${mmss(voiceSeconds)}` : "Voice note") },
  });
}

const short = (iso: string) => `${part(iso, { weekday: "short" })} ${part(iso, { hour: "numeric", minute: "2-digit" })}`;

/** A jam invite (or a new time for one). */
export async function notifyJamInvite(connectionId: number, senderId: string, startsAt: string, place: string, newTime: boolean, note: string | null = null) {
  if (!emailEnabled()) return;
  const x = await across(connectionId, senderId);
  if (!x) return;
  const name = x.from.first_name;
  await notify(x.otherId, {
    type: "jam",
    subject: newTime ? `${name} suggested another time · ${short(startsAt)}` : `Jam with ${name} · ${short(startsAt)}`,
    preheader: `${place}. I'm in, or suggest a time.`,
    blocks: [who(x.from), { kind: "headline", text: newTime ? `${name} suggested another time` : `${name} wants to jam` }, { kind: "jam", startsAt, place, note }],
    cta: { label: "I'm in", path: `/messages/${x.from.username}` },
    alt: { label: "Suggest a time", path: `/messages/${x.from.username}` },
  });
}

/** A calendar file for an accepted jam (two hours, Pacific time shown by the calendar itself). */
function ics(jamId: number, startsAt: string, place: string, title: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(startsAt);
  const txt = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mixstro//Jams//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:jam-${jamId}@mixstro.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + 2 * 3600_000))}`,
    `SUMMARY:${txt(title)}`,
    `LOCATION:${txt(place)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** They said yes to your jam. */
export async function notifyJamAccepted(jamId: number, accepterId: string) {
  if (!emailEnabled()) return;
  const db = adminClient();
  const { data: jam } = await db!.from("jams").select("connection_id, starts_at, place").eq("id", jamId).maybeSingle<{ connection_id: number; starts_at: string; place: string }>();
  if (!jam) return;
  const x = await across(jam.connection_id, accepterId);
  if (!x) return;
  const name = x.from.first_name;
  await notify(x.otherId, {
    type: "jam",
    subject: `It's on: jam with ${name} ${part(jam.starts_at, { weekday: "long" })}`,
    preheader: `${short(jam.starts_at)} · ${jam.place}. The calendar invite is attached.`,
    blocks: [
      { kind: "badge", text: "It's on" },
      { kind: "headline", text: `You're jamming with ${name}` },
      { kind: "jam", startsAt: jam.starts_at, place: jam.place },
      { kind: "text", text: "We'll ask you both afterwards how it went. Only you two see the answers." },
      { kind: "fine", text: "Open the attached invite to add it to your calendar." },
    ],
    cta: { label: "Open the chat", path: `/messages/${x.from.username}` },
    attachments: [{ filename: "jam.ics", content: Buffer.from(ics(jamId, jam.starts_at, jam.place, `Jam with ${name}`)).toString("base64"), content_type: "text/calendar" }],
  });
}

const KIND: Record<string, string> = { band_seeking: "Band seeking", session: "Session", collab: "Collab" };

/** Someone answered your Board post. */
export async function notifyBoardReply(postId: number, fromId: string, authorId: string, note: string | null) {
  if (!emailEnabled()) return;
  const db = adminClient();
  const [{ data: post }, map] = await Promise.all([
    db!.from("board_posts").select("title, kind, neighborhood, paid, pay").eq("id", postId).maybeSingle<{ title: string; kind: string; neighborhood: string | null; paid: boolean; pay: string | null }>(),
    people([fromId]),
  ]);
  const from = map.get(fromId);
  if (!post || !from) return;
  await notify(authorId, {
    type: "board",
    ref: String(postId),
    throttleMinutes: 60,
    subject: `${from.first_name} answered “${post.title}”`,
    preheader: line(from),
    blocks: [
      { kind: "post", label: `Your post · ${KIND[post.kind] ?? "Board"}`, title: post.title, line: [post.neighborhood, post.paid ? post.pay || "Paid" : null].filter(Boolean).join(" · ") },
      who(from),
      note ? { kind: "bubble", text: note } : { kind: "text", text: `${from.first_name} (${plays(from)}) answered with their profile.` },
    ],
    cta: { label: `See ${from.first_name}'s music`, path: `/m/${from.username}` },
    alt: { label: "All answers", path: `/board/${postId}` },
  });
}

/** Someone tagged you as a bandmate: confirm your spot. */
export async function notifyBandInvite(fromId: string, toId: string, token: string) {
  if (!emailEnabled()) return;
  const db = adminClient()!;
  const [{ data: inv }, map] = await Promise.all([
    db.from("band_invites").select("band_id, bands(name)").eq("token", token).maybeSingle<{ band_id: number; bands: { name: string } | null }>(),
    people([fromId]),
  ]);
  const from = map.get(fromId);
  const band = inv?.bands?.name;
  if (!from || !band || !inv) return;
  const { data: members } = await db.from("band_members").select("profile_id, projects(start_year, end_year)").eq("band_id", inv.band_id);
  const rows = (members ?? []) as unknown as { profile_id: string; projects: { start_year: number; end_year: number | null } | null }[];
  const yrs = rows.find((m) => m.profile_id === fromId)?.projects;
  const years = yrs ? (yrs.end_year == null ? `${yrs.start_year} to now` : yrs.end_year === yrs.start_year ? String(yrs.start_year) : `${yrs.start_year} to ${yrs.end_year}`) : null;
  const count = rows.length ? `${rows.length} member${rows.length === 1 ? "" : "s"}` : null;
  await notify(toId, {
    type: "connect",
    ref: `band:${token}`,
    throttleMinutes: 60 * 24 * 30,
    subject: `${from.first_name} added you to ${band}`,
    preheader: "Confirm your spot and it shows on your profile too.",
    blocks: [
      { kind: "band", name: band, line: [years, count].filter(Boolean).join(" · ") || "Band" },
      { kind: "headline", text: `${from.first_name} added you to ${band}` },
      { kind: "text", text: "Confirm your spot and the band shows on your profile too, with everyone who played in it." },
    ],
    cta: { label: "Confirm your spot", path: `/join/${token}` },
    alt: { label: "I wasn't in this band", path: `/join/${token}` },
  });
}

/* ---------- Reminders (sent by the scheduled job, src/lib/reminders.ts) ---------- */

/** #4 Your turn: their message has waited 48 hours for an answer. Once per message. */
export async function notifyYourTurn(connectionId: number, messageId: number, senderId: string, preview: string | null) {
  const x = await across(connectionId, senderId);
  if (!x) return;
  const name = x.from.first_name;
  const text = preview ? (preview.length > 140 ? `${preview.slice(0, 137)}…` : preview) : null;
  await notify(x.otherId, {
    type: "message",
    ref: `nudge:${messageId}`,
    throttleMinutes: 60 * 24 * 30,
    subject: `${name} is waiting on your reply`,
    preheader: "A quick answer keeps things moving, even if it's a no.",
    blocks: [
      who(x.from),
      { kind: "headline", text: `Your turn with ${name}` },
      text ? { kind: "bubble", text } : { kind: "voice", seconds: null },
      { kind: "text", text: "A quick answer keeps things moving, even if it's a no. Easy replies are one tap away in the chat." },
    ],
    cta: { label: "Reply", path: `/messages/${x.from.username}` },
    push: { title: `Your turn with ${name}`, body: text ? `“${text}”` : `${name} sent you a voice note 2 days ago.` },
  });
}

/** #12 A musician you're looking for just joined nearby. At most one a day (the job checks). */
export async function notifyRoleAlert(recipientId: string, joinerId: string, role: string, why: string, miles: number) {
  const from = (await people([joinerId])).get(joinerId);
  if (!from) return;
  const where = miles < 1 ? "nearby" : `${Math.round(miles)} mi away`;
  const r = role.toLowerCase();
  const what = r === "drums" ? "drummer" : r === "bass" ? "bassist" : r === "keys" ? "keys player" : r === "vocals" ? "singer" : r === "strings" ? "string player" : r === "horns" ? "horn player" : r;
  const head = `${/^[aeiou]/.test(what) ? "An" : "A"} ${what} ${why} just joined ${where}`;
  await notify(recipientId, {
    type: "alerts",
    ref: `who:${joinerId}`,
    throttleMinutes: 60 * 24 * 30,
    subject: head,
    preheader: `${from.first_name} · ${line(from)}`,
    blocks: [{ kind: "badge", text: "New nearby" }, who(from), { kind: "headline", text: head }],
    cta: { label: `See ${from.first_name}'s music`, path: `/m/${from.username}` },
    alt: { label: "Change these alerts", path: "/settings/notifications" },
  });
}

/** An accepted jam starts in about two hours. Sent to both players. */
export async function notifyJamSoon(jamId: number, recipientId: string, otherId: string, startsAt: string, place: string) {
  const other = (await people([otherId])).get(otherId);
  if (!other) return;
  await notify(recipientId, {
    type: "jam",
    ref: `soon:${jamId}`,
    throttleMinutes: 60 * 24 * 30,
    subject: `Jam with ${other.first_name} at ${clock(startsAt)}`,
    preheader: `${place}. Running late? Let them know in the chat.`,
    blocks: [who(other), { kind: "headline", text: `Jam with ${other.first_name} today` }, { kind: "jam", startsAt, place }],
    cta: { label: "Open the chat", path: `/messages/${other.username}` },
    push: { title: `Jam with ${other.first_name} at ${clock(startsAt)}`, body: place },
  });
}
