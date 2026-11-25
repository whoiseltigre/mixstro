import { headers } from "next/headers";
import { adminClient } from "./supabase/admin";

/**
 * Guards for public endpoints (band name votes, music lookups): read at most N bytes of a
 * body before parsing it, name the caller, and spend per-caller and global budgets.
 */

/** The request body as text, or null once it passes `max` bytes (whatever Content-Length claims). */
export async function readLimited(req: Request, max: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** JSON body within `max` bytes: `undefined` when too large, `null` when it isn't JSON. */
export async function readJson(req: Request, max: number): Promise<unknown | null | undefined> {
  const text = await readLimited(req, max);
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The caller's address as the CDN saw it (first X-Forwarded-For hop). */
export async function callerIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

export type Budget = { key: string; limit: number; windowSeconds: number };

/**
 * Spends one hit from each budget; false when any is used up. If the limiter itself can't be
 * reached it lets the request through (the database's own global brakes still apply) and logs
 * it, so an outage of the limiter never takes the feature down with it.
 */
export async function withinBudget(budgets: Budget[]): Promise<boolean> {
  const db = adminClient();
  if (!db) return true;
  try {
    const results = await Promise.all(
      budgets.map((b) => db.rpc("rate_hit", { p_key: b.key, p_limit: b.limit, p_window_seconds: b.windowSeconds })),
    );
    for (const r of results) if (r.error) throw r.error;
    return results.every((r) => r.data === true);
  } catch (e) {
    console.warn("[rate-limit] limiter unavailable, allowing request", e instanceof Error ? e.message : e);
    return true;
  }
}

/**
 * One shared answer for identical lookups: concurrent callers wait on the same promise,
 * successes are kept for `okMs`, confirmed misses (null / empty) for `missMs`, and errors
 * aren't kept at all so the next call retries.
 */
export function memoLookup<T>(okMs: number, missMs: number, max = 500) {
  const done = new Map<string, { at: number; value: T; miss: boolean }>();
  const inflight = new Map<string, Promise<T>>();
  return async (key: string, run: () => Promise<T>, isMiss: (v: T) => boolean = (v) => v == null): Promise<T> => {
    const hit = done.get(key);
    if (hit && Date.now() - hit.at < (hit.miss ? missMs : okMs)) return hit.value;
    const pending = inflight.get(key);
    if (pending) return pending;
    const p = run()
      .then((value) => {
        if (done.size >= max) done.delete(done.keys().next().value as string);
        done.set(key, { at: Date.now(), value, miss: isMiss(value) });
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };
}
