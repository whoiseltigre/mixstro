"use server";

import { adminClient } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

/** Sends a test push to your own devices, so you can see it working. */
export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return { ok: false, error: "You're signed out." };
  const db = adminClient();
  if (!db) return { ok: false, error: "Push isn't set up on the server yet." };
  const ok = await sendPush(db, user.id, { title: "Mixstro", body: "Push works. You'll hear about Connects, messages and jams here.", url: "/settings/notifications", tag: "test" });
  return ok ? { ok } : { ok, error: "No device took it. Turn push on above first, then try again." };
}
