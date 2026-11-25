/**
 * The chat's own sends, between tapping Send and the database confirming them. Each send has
 * a client id that stays the same across retries; the stored message carries the same id, so
 * the optimistic copy, the action's answer and the realtime refresh all meet on one identity.
 */
export type OutboxItem = {
  clientId: string;
  body: string | null;
  /** Local object URL for a voice note recorded on this phone. */
  voiceUrl?: string | null;
  voiceSeconds?: number | null;
  createdAt: string;
  status: "sending" | "failed";
  /** Set once the server confirmed it, before the stored copy arrives in the list. */
  storedId?: number;
  /** Error to show beside a failed send. */
  error?: string;
};

type Stored = { id: number; clientId?: string | null };

/** Sends still to show: anything the stored list doesn't include yet, by client id or stored id. */
export function pendingNotIn(outbox: OutboxItem[], stored: Stored[]): OutboxItem[] {
  const ids = new Set(stored.map((m) => m.id));
  const clientIds = new Set(stored.flatMap((m) => (m.clientId ? [m.clientId] : [])));
  return outbox.filter((o) => !clientIds.has(o.clientId) && !(o.storedId !== undefined && ids.has(o.storedId)));
}

/** Marks one send confirmed or failed, leaving every other pending send as it was. */
export function settle(outbox: OutboxItem[], clientId: string, result: { storedId?: number; error?: string }): OutboxItem[] {
  return outbox.map((o) =>
    o.clientId !== clientId ? o : result.error ? { ...o, status: "failed", error: result.error } : { ...o, storedId: result.storedId, status: "sending", error: undefined },
  );
}

/** Merges older pages and refreshed newest pages into one list, one copy per message id, oldest first. */
export function mergeById<T extends { id: number; createdAt: string }>(...lists: T[][]): T[] {
  const byId = new Map<number, T>();
  for (const list of lists) for (const m of list) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}
