import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

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

/** Returns true if at least one device accepted it. */
export async function sendPush(db: SupabaseClient, recipientId: string, msg: PushMessage): Promise<boolean> {
  const k = await vapidKeys(db);
  if (!k) return false;
  const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("profile_id", recipientId);
  const subs = (data ?? []) as { id: number; endpoint: string; p256dh: string; auth: string }[];
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
