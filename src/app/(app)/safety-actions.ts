"use server";

import { after } from "next/server";
import { deleteAccountNow } from "@/lib/account-deletion";
import { notifySafety } from "@/lib/notify";
import { getViewer } from "@/lib/people";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tells the Mixstro team about a block or report you just filed. */
export async function alertSafetyTeam(kind: "block" | "report", reportedId: string) {
  const viewer = await getViewer();
  if (!viewer || !UUID.test(reportedId) || (kind !== "block" && kind !== "report")) return;
  // notifySafety checks the block or report row exists before sending anything.
  after(() => notifySafety(kind, viewer.id, reportedId));
}

/**
 * Deletes your account and everything in it, on the server (see src/lib/account-deletion.ts).
 * Needs a live session: an expired one is asked to sign in again rather than told it worked.
 */
export async function deleteMyAccount(): Promise<{ error?: string; signIn?: boolean }> {
  const viewer = await getViewer();
  if (!viewer) return { signIn: true, error: "Your session ended. Sign in again, then delete your account." };
  const result = await deleteAccountNow(viewer.id);
  if (!result.done) {
    return { error: "We couldn't finish deleting your account. Try again in a minute. If it still fails, we'll finish it for you within the hour." };
  }
  return {};
}
