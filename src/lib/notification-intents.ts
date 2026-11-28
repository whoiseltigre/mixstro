import { messagePreview } from "./clip-reply";
import { adminClient, notifyMessage, notifyOpening } from "./notify";

/**
 * Message notifications from durable intents (migration 20261125010000). The database writes
 * one intent per message and recipient in the same transaction as the message; the app sends
 * it right after the send and records the outcome; the 15-minute job drains anything left
 * (a server that stopped mid-send, a provider outage). Claims use SKIP LOCKED, so two workers
 * never send the same intent.
 */

type Intent = { id: number; event_key: string; recipient_id: string; payload: { kind?: string; message_id?: number; connection_id?: number; sender_id?: string; post_id?: number; author_id?: string; miles?: number } };

async function deliver(intent: Intent): Promise<"sent" | "skipped"> {
  const db = adminClient()!;
  const p = intent.payload;
  if (p.kind === "opening" && p.post_id && p.author_id) {
    await notifyOpening(intent.recipient_id, p.post_id, p.author_id, p.miles ?? 0);
    return "sent";
  }
  if (p.kind !== "message" || !p.message_id) return "skipped";
  // Eligibility is checked right before sending: the message must still exist and be readable
  // in an accepted, unblocked conversation (notifyMessage re-checks the pair and preferences).
  // "*" so it reads the same before and after the clip columns exist.
  const { data: m } = await db.from("messages").select("*").eq("id", p.message_id).maybeSingle<{
    id: number;
    connection_id: number;
    sender_id: string;
    body: string | null;
    voice_url: string | null;
    voice_seconds: number | null;
    clip_at?: number | null;
  }>();
  if (!m) return "skipped";
  const preview = m.body ?? (m.voice_url ? null : messagePreview({ body: null, clipAt: m.clip_at ?? null }));
  await notifyMessage(m.connection_id, m.sender_id, preview, m.voice_seconds);
  return "sent";
}

async function run(intents: Intent[]) {
  const db = adminClient()!;
  let sent = 0;
  for (const i of intents) {
    try {
      const outcome = await deliver(i);
      await db.rpc("finish_notification_intent", { p_id: i.id, p_status: outcome });
      if (outcome === "sent") sent++;
    } catch (e) {
      await db.rpc("finish_notification_intent", { p_id: i.id, p_status: "failed", p_error: e instanceof Error ? e.message : String(e) });
    }
  }
  return sent;
}

/**
 * Sends the notification for one message now. Returns false when intents aren't available
 * (the SQL hasn't run yet), so the caller can fall back to sending directly.
 */
export async function dispatchMessageNotification(messageId: number): Promise<boolean> {
  const db = adminClient();
  if (!db) return true;
  const { data, error } = await db.rpc("claim_notification_intents", { p_limit: 5, p_key: `message:${messageId}` });
  if (error) return false;
  await run((data ?? []) as Intent[]);
  return true;
}

/** Drains due intents in pages, within a time budget. Called by the reminder job. */
export async function drainNotificationIntents(budgetMs = 30_000): Promise<{ sent: number; health?: unknown }> {
  const db = adminClient();
  if (!db) return { sent: 0 };
  const started = Date.now();
  let sent = 0;
  while (Date.now() - started < budgetMs) {
    const { data, error } = await db.rpc("claim_notification_intents", { p_limit: 50 });
    if (error || !data?.length) break;
    sent += await run(data as Intent[]);
  }
  const { data: health } = await db.rpc("notification_intent_health");
  return { sent, health };
}
