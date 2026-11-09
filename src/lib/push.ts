import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

/**
 * Sends web push to every device a person turned notifications on for.
 *
 * Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (server only). Without them this
 * quietly does nothing, like the email side. Subscriptions the push service says are gone
 * (404/410: uninstalled app, revoked permission) are deleted so we stop trying.
 */

export type PushMessage = {
  title: string;
  body: string;
  /** Path inside the app to open on tap, e.g. /messages/12. */
  url: string;
  /** Same tag replaces the earlier notification instead of stacking (e.g. one per chat). */
  tag?: string;
  /** Small photo shown with the notification, if any. */
  icon?: string | null;
};

let configured: boolean | undefined;
export function pushEnabled() {
  if (configured !== undefined) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@mixstro.com", pub!, priv!);
  return configured;
}

type Sub = { id: number; endpoint: string; p256dh: string; auth: string };

/** Returns true if at least one device accepted it. */
export async function sendPush(db: SupabaseClient, recipientId: string, msg: PushMessage): Promise<boolean> {
  if (!pushEnabled()) return false;
  const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("profile_id", recipientId);
  const subs = (data ?? []) as Sub[];
  if (!subs.length) return false;
  const payload = JSON.stringify({ ...msg, icon: msg.icon ?? undefined });
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, timeout: 8000 });
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
