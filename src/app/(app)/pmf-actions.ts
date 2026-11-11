"use server";

import { getViewer } from "@/lib/people";

/** The few things we count that no other table records. Never throws. */
export async function logEvent(name: "shared_profile" | "get_started_opened" | "get_started_dismissed", props: Record<string, string> = {}) {
  try {
    const viewer = await getViewer();
    if (!viewer) return;
    await viewer.supabase.from("events").insert({ profile_id: viewer.id, name, props });
  } catch {
    // Counting is never worth an error on screen.
  }
}

/** "Send feedback" in Settings. Shows up on Pulse. */
export async function sendFeedback(body: string) {
  const text = body.trim().slice(0, 2000);
  if (text.length < 2) return { error: "Write a few words first." };
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  const { error } = await viewer.supabase.from("feedback").insert({ profile_id: viewer.id, kind: "note", body: text });
  return error ? { error: "That didn't send. Try again." } : {};
}

/** Whether the one-time 14-day survey should show. */
export async function surveyDue() {
  const viewer = await getViewer();
  if (!viewer) return false;
  const { data } = await viewer.supabase.rpc("pmf_survey_due");
  return data === true;
}

/** "How would you feel if you could no longer use Mixstro?" plus what they'd use instead. */
export async function answerSurvey(disappointment: "very" | "somewhat" | "not", instead: string) {
  if (!["very", "somewhat", "not"].includes(disappointment)) return { error: "Pick one." };
  const viewer = await getViewer();
  if (!viewer) return { error: "You're signed out." };
  const { error } = await viewer.supabase
    .from("feedback")
    .insert({ profile_id: viewer.id, kind: "pmf_survey", disappointment, instead: instead.trim().slice(0, 280) || null });
  // Already answered (unique per person) counts as done.
  return error && error.code !== "23505" ? { error: "That didn't save. Try again." } : {};
}
