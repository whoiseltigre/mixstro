import { adminClient } from "./notify";

/**
 * Deleting an account, on the server, in an order that can always be finished:
 *
 * 1. Record the request (public.account_deletions), so an interrupted run is picked up again
 *    by the 15-minute reminder job (resumeDeletions below).
 * 2. Remove every stored file, a page at a time: clips, photos, voice notes in DMs and bands,
 *    and the other person's voice notes in chats with them (those chats go too).
 * 3. Hand files that stay (band photos) over to no one, so Auth can delete the account.
 * 4. Delete the account in Auth. The profile and everything under it cascades.
 * 5. Mark the request complete.
 *
 * Every step is safe to repeat, so retrying after any failure just carries on.
 */

export type DeletionResult = { done: true } | { done: false; error: string };

const PAGE = 500;
const CHUNK = 100;
const MAX_ROUNDS = 40;

export async function deleteAccountNow(uid: string): Promise<DeletionResult> {
  const db = adminClient();
  if (!db) return { done: false, error: "deletion is not set up on this server" };

  const { data: row, error: readErr } = await db.from("account_deletions").select("completed_at, attempts").eq("profile_id", uid).maybeSingle();
  if (readErr) return { done: false, error: readErr.message };
  if (row?.completed_at) return { done: true };
  const { error: recErr } = await db
    .from("account_deletions")
    .upsert({ profile_id: uid, attempts: (row?.attempts ?? 0) + 1, last_error: null }, { onConflict: "profile_id" });
  if (recErr) return { done: false, error: recErr.message };

  const fail = async (step: string, message: string): Promise<DeletionResult> => {
    await db.from("account_deletions").update({ last_error: `${step}: ${message}`.slice(0, 500) }).eq("profile_id", uid);
    console.error("account deletion:", step, message);
    return { done: false, error: message };
  };

  try {
    for (let round = 0; ; round++) {
      if (round >= MAX_ROUNDS) return fail("files", "more files than one run can remove; the next run continues");
      const { data, error } = await db.rpc("account_files", { p_uid: uid, p_limit: PAGE });
      if (error) return fail("list files", error.message);
      const files = (data ?? []) as { bucket_id: string; name: string }[];
      if (!files.length) break;
      const byBucket = new Map<string, string[]>();
      for (const f of files) byBucket.set(f.bucket_id, [...(byBucket.get(f.bucket_id) ?? []), f.name]);
      for (const [bucket, names] of byBucket) {
        for (let i = 0; i < names.length; i += CHUNK) {
          const { error: rmErr } = await db.storage.from(bucket).remove(names.slice(i, i + CHUNK));
          if (rmErr) return fail(`remove ${bucket}`, rmErr.message);
        }
      }
    }

    const { error: relErr } = await db.rpc("release_account_files", { p_uid: uid });
    if (relErr) return fail("release files", relErr.message);

    const { error: authErr } = await db.auth.admin.deleteUser(uid);
    // Already gone (a run that stopped right after this step) counts as done.
    if (authErr && !/not.?found/i.test(authErr.message)) return fail("delete account", authErr.message);

    await db.from("account_deletions").update({ completed_at: new Date().toISOString(), last_error: null }).eq("profile_id", uid);
    return { done: true };
  } catch (e) {
    return fail("unexpected", e instanceof Error ? e.message : String(e));
  }
}

/** Finishes deletions that stopped partway (called by the reminder job). */
export async function resumeDeletions(): Promise<number> {
  const db = adminClient();
  if (!db) return 0;
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data } = await db
    .from("account_deletions")
    .select("profile_id")
    .is("completed_at", null)
    .lt("requested_at", since)
    .lt("attempts", 20)
    .order("requested_at")
    .limit(5);
  let done = 0;
  for (const r of (data ?? []) as { profile_id: string }[]) if ((await deleteAccountNow(r.profile_id)).done) done++;
  return done;
}
