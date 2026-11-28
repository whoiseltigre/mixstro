"use client";

import { alertSafetyTeam, deleteMyAccount } from "@/app/(app)/safety-actions";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Block, report and delete account (#11). Only demo mode (no Supabase set up at all) keeps
 * blocks on the device; with real accounts every failure is reported, never shown as done.
 */

export const REPORT_REASONS = [
  { id: "fake", label: "Fake profile or impersonation" },
  { id: "harassment", label: "Harassment or threats" },
  { id: "spam", label: "Spam or scams" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

const BLOCKS_KEY = "mixstro:blocks";

async function signedIn() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

const SIGNED_OUT = "Your session ended. Sign in again and try once more.";
const OFFLINE = "That didn't go through. Check your connection and try again.";

/** The signed-in person and the profile behind a username, or why not. */
async function target(username: string): Promise<{ error: string } | { s: NonNullable<Awaited<ReturnType<typeof signedIn>>>; id: string }> {
  const s = await signedIn().catch(() => null);
  if (!s) return { error: SIGNED_OUT };
  const { data, error } = await s.supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error) return { error: OFFLINE };
  if (!data) return { error: "We couldn't find that profile. They may have deleted their account." };
  return { s, id: data.id as string };
}

export async function blockUser(username: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(BLOCKS_KEY) ?? "[]");
      localStorage.setItem(BLOCKS_KEY, JSON.stringify([...new Set([...list, username])]));
    } catch {
      // Private mode: nothing to keep in demo.
    }
    return {};
  }
  const t = await target(username);
  if ("error" in t) return t;
  const { error } = await t.s.supabase.from("blocks").upsert({ blocker_id: t.s.user.id, blocked_id: t.id });
  if (error) return { error: OFFLINE };
  alertSafetyTeam("block", t.id).catch(() => {});
  return {};
}

export async function reportUser(username: string, reason: ReportReason, details: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) return {};
  const t = await target(username);
  if ("error" in t) return t;
  const { error } = await t.s.supabase
    .from("reports")
    .insert({ reporter_id: t.s.user.id, reported_id: t.id, reason, details: details.trim() || null });
  if (error) return { error: OFFLINE };
  alertSafetyTeam("report", t.id).catch(() => {});
  return {};
}

/** Clears everything Mixstro keeps in this browser. */
function clearDevice() {
  clearAppCache();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("mixstro:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Nothing stored.
  }
}

/**
 * Deletes the account on the server (files, voice notes, then the account itself), then
 * signs out here and clears this device. Only reports success once the server says it's done.
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    clearDevice();
    return {};
  }
  let result: Awaited<ReturnType<typeof deleteMyAccount>>;
  try {
    result = await deleteMyAccount();
  } catch {
    return { error: OFFLINE };
  }
  if (result.error) return { error: result.error };
  try {
    const { disablePush } = await import("@/lib/push-client");
    await disablePush();
  } catch {
    // Push was never on here.
  }
  await createClient()?.auth.signOut({ scope: "local" }).catch(() => {});
  clearDevice();
  return {};
}

/** The iPhone app keeps copies of screens for fast launches (public/sw.js): drop them. */
function clearAppCache() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "mixstro:clear-cache" });
  } catch {
    // No service worker here.
  }
}

/**
 * Signs out on this device: stops push here (so the next person on this phone or computer
 * doesn't get your notifications), ends the session and clears what's kept in the browser.
 */
export async function signOut(): Promise<{ error?: string }> {
  clearAppCache();
  try {
    const { disablePush } = await import("@/lib/push-client");
    await disablePush();
  } catch {
    // Push was never on here.
  }
  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: error.message };
  }
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("mixstro:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Nothing stored.
  }
  return {};
}
