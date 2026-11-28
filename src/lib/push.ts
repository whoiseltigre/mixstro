import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { apnsConfigured, sendApns } from "./apns";

/**
 * Sends web push to every device a person turned notifications on for.
 *
 * The push (VAPID) keys need no setup: on first use the server creates a pair and keeps it
 * in public.server_keys, which only the service role can read. NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * and VAPID_PRIVATE_KEY env vars, if set, win instead. Subscriptions the push service says
 * are gone (404/410: uninstalled app, revoked permission) are deleted so we stop trying.
 */

export type PushMessage = {
  title: string;
  body: string;
  /** Path inside the app to open on tap, e.g. /messages/maya. */
  url: string;
  /** Same tag replaces the earlier notification instead of stacking (e.g. one per chat). */
  tag?: string;
  /** Small photo shown with the notification, if any. */
  icon?: string | null;
};

type Keys = { publicKey: string; privateKey: string };
let keys: Promise<Keys | null> | null = null;

/** The app's push keys: from env, else from server_keys, created once if missing. */
export function vapidKeys(db: SupabaseClient): Promise<Keys | null> {
  if (keys) return keys;
  keys = (async () => {
    const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const envPriv = process.env.VAPID_PRIVATE_KEY;
    if (envPub && envPriv) return { publicKey: envPub, privateKey: envPriv };
    const read = async () => {
      const { data, error } = await db.from("server_keys").select("name, value").in("name", ["vapid_public", "vapid_private"]);
      if (error) throw error;
      const m = new Map(((data ?? []) as { name: string; value: string }[]).map((r) => [r.name, r.value]));
      return m.get("vapid_public") && m.get("vapid_private") ? { publicKey: m.get("vapid_public")!, privateKey: m.get("vapid_private")! } : null;
    };
    const found = await read();
    if (found) return found;
    // First run: make a pair. If two servers race, the first insert wins and both read it back.
    const fresh = webpush.generateVAPIDKeys();
    await db.from("server_keys").upsert(
      [
        { name: "vapid_public", value: fresh.publicKey },
        { name: "vapid_private", value: fresh.privateKey },
      ],
      { onConflict: "name", ignoreDuplicates: true },
    );
    return read();
  })().catch((e) => {
    console.error("push: keys", e);
    keys = null; // try again next time (e.g. the table isn't there yet)
    return null;
  });
  return keys;
}

/** The push services browsers use (Google, Mozilla, Apple, Microsoft). Matches the database check. */
const PUSH_HOST = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;

/** Only ever send to a real push service over HTTPS: never a port, a login or any other host. */
export function pushEndpointOk(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && !u.username && !u.password && PUSH_HOST.test(u.hostname) && endpoint.length <= 1024;
  } catch {
    return false;
  }
}

/** Returns true if at least one device accepted it. */
export async function sendPush(db: SupabaseClient, recipientId: string, msg: PushMessage): Promise<boolean> {
  const [web, app] = await Promise.all([sendWebPush(db, recipientId, msg), sendAppPush(db, recipientId, msg)]);
  return web || app;
}

/** The iPhone app's devices (APNs). Off until the APNs key is in env (see apns.ts). */
async function sendAppPush(db: SupabaseClient, recipientId: string, msg: PushMessage): Promise<boolean> {
  if (!apnsConfigured()) return false;
  const { data } = await db.from("native_push_tokens").select("id, token, apns_env").eq("profile_id", recipientId).eq("platform", "ios");
  const tokens = (data ?? []) as { id: number; token: string; apns_env: "sandbox" | "production" }[];
  const results = await Promise.all(
    tokens.map(async (t) => {
      let r = await sendApns(t.token, msg, t.apns_env);
      // Builds run straight from Xcode get sandbox tokens, which production calls bad: try there once.
      if (r === "gone" && t.apns_env === "production") {
        r = await sendApns(t.token, msg, "sandbox");
        if (r === "ok") await db.from("native_push_tokens").update({ apns_env: "sandbox" }).eq("id", t.id);
      }
      if (r === "gone") await db.from("native_push_tokens").delete().eq("id", t.id);
      return r === "ok";
    }),
  );
  return results.some(Boolean);
}

async function sendWebPush(db: SupabaseClient, recipientId: string, msg: PushMessage): Promise<boolean> {
  const k = await vapidKeys(db);
  if (!k) return false;
  const { data } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(10);
  const all = (data ?? []) as { id: number; endpoint: string; p256dh: string; auth: string }[];
  // Checked again here, so a bad row saved before the database check existed is never used.
  const bad = all.filter((s) => !pushEndpointOk(s.endpoint));
  if (bad.length) await db.from("push_subscriptions").delete().in("id", bad.map((s) => s.id));
  const subs = all.filter((s) => pushEndpointOk(s.endpoint));
  if (!subs.length) return false;
  const payload = JSON.stringify({ ...msg, icon: msg.icon ?? undefined });
  const vapidDetails = { subject: process.env.VAPID_SUBJECT || "mailto:hello@mixstro.com", publicKey: k.publicKey, privateKey: k.privateKey };
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, timeout: 8000, vapidDetails });
        return true;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push:", status ?? e);
        return false;
      }
    }),
  );
  return results.some(Boolean);
}
