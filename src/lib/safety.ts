"use client";

import { createClient } from "@/lib/supabase/client";

/** Block, report and delete account (#11). Demo mode keeps blocks locally. */

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

async function profileId(username: string) {
  const s = await signedIn();
  if (!s) return null;
  const { data } = await s.supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  return data ? { ...s, id: data.id as string } : null;
}

export async function blockUser(username: string): Promise<{ error?: string }> {
  const s = await profileId(username);
  if (!s) {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(BLOCKS_KEY) ?? "[]");
      localStorage.setItem(BLOCKS_KEY, JSON.stringify([...new Set([...list, username])]));
    } catch {
      // Private mode: nothing to keep in demo.
    }
    return {};
  }
  const { error } = await s.supabase.from("blocks").upsert({ blocker_id: s.user.id, blocked_id: s.id });
  return error ? { error: error.message } : {};
}

export async function reportUser(username: string, reason: ReportReason, details: string): Promise<{ error?: string }> {
  const s = await profileId(username);
  if (!s) return {};
  const { error } = await s.supabase
    .from("reports")
    .insert({ reporter_id: s.user.id, reported_id: s.id, reason, details: details.trim() || null });
  return error ? { error: error.message } : {};
}

/** Removes uploaded clips, then the account itself; the profile and everything under it cascades. */
export async function deleteAccount(): Promise<{ error?: string }> {
  const s = await signedIn();
  if (!s) {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("mixstro:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // Nothing stored.
    }
    return {};
  }
  const { data: files } = await s.supabase.storage.from("clips").list(s.user.id);
  if (files?.length) await s.supabase.storage.from("clips").remove(files.map((f) => `${s.user.id}/${f.name}`));
  const { error } = await s.supabase.rpc("delete_my_account");
  if (error) return { error: error.message };
  await s.supabase.auth.signOut();
  try {
    localStorage.removeItem("mixstro:onboarding");
  } catch {
    // Nothing stored.
  }
  return {};
}
