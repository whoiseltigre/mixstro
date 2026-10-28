"use client";

import { useCallback, useEffect, useState } from "react";
import { parseClip } from "@/lib/clips";
import { createClient } from "@/lib/supabase/client";

export type Level = "learning" | "solid" | "pro";
export type MusicSource = "apple_music" | "spotify" | "manual";

export type Artist = { id: string; name: string; image?: string };

export type Draft = {
  firstName: string;
  username: string;
  birthday: string; // YYYY-MM-DD
  avatarUrl?: string;
  instruments: string[];
  mainInstrument?: string;
  level?: Level;
  genres: string[];
  musicSource?: MusicSource;
  influences: Artist[];
  goals: string[];
  commitment: number; // index into COMMITMENT
  neighborhood: string;
  radiusMi: number;
  playDays: string[];
  clips: { kind: "clip" | "band"; value: string }[]; // clip = YouTube/TikTok URL
};

export const EMPTY_DRAFT: Draft = {
  firstName: "",
  username: "",
  birthday: "",
  instruments: [],
  genres: [],
  influences: [],
  goals: [],
  commitment: 1,
  neighborhood: "",
  radiusMi: 25,
  playDays: [],
  clips: [],
};

/** The numbered steps; sign-in and verify come before, "done" after. */
export const STEPS = ["basics", "instruments", "music", "influences", "goals", "location", "sound"] as const;
export type Step = (typeof STEPS)[number];

export const INSTRUMENTS = ["Guitar", "Bass", "Drums", "Keys", "Vocals", "Producer", "Songwriter", "DJ", "Strings", "Horns"];
export const GENRES = ["Indie", "Rock", "Neo-soul", "Funk", "Jazz", "Hip-hop", "R&B", "Folk", "Electronic", "Punk", "Metal", "Country", "Pop", "Latin"];
export const GOALS = [
  { id: "join_band", title: "Join a band", sub: "Fill a spot in an existing group" },
  { id: "start_project", title: "Start a project", sub: "Find people to build something new" },
  { id: "paid_work", title: "Paid and session work", sub: "Gigs, studio days, tours" },
  { id: "jam", title: "Jam and co-write", sub: "Low stakes, just play" },
];
export const COMMITMENT = ["Just for fun", "Weekly", "Gigging", "Touring"];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KEY = "mixstro:onboarding";

function read(): Draft {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

/** Onboarding answers, persisted to localStorage so a reload or a quit resumes where you left off. */
export function useDraft() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(read());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private mode: keep going in memory.
      }
      return next;
    });
  }, []);

  return { draft, update, ready };
}

export function isAdult(birthday: string) {
  if (!birthday) return false;
  const born = new Date(birthday + "T00:00:00");
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return born <= cutoff;
}

export function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Writes the finished profile to Supabase. Demo mode (no env vars) just keeps the local draft. */
export async function saveProfile(draft: Draft): Promise<{ error?: string }> {
  const supabase = createClient();
  if (!supabase) return {};
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save your profile." };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: draft.firstName.trim(),
    username: draft.username.replace(/^@/, "").trim().toLowerCase(),
    birthday: draft.birthday,
    // TODO: upload the photo to Supabase Storage; local previews are data URLs and are not stored.
    avatar_url: draft.avatarUrl?.startsWith("http") ? draft.avatarUrl : null,
    instruments: draft.instruments,
    main_instrument: draft.mainInstrument ?? draft.instruments[0] ?? null,
    level: draft.level ?? null,
    genres: draft.genres,
    music_source: draft.musicSource ?? null,
    goals: draft.goals,
    commitment: draft.commitment,
    neighborhood: draft.neighborhood.trim() || null,
    radius_mi: draft.radiusMi,
    play_days: draft.playDays,
    onboarded_at: new Date().toISOString(),
  });
  if (error) return { error: error.code === "23505" ? "That username is taken." : error.message };

  await supabase.from("influences").delete().eq("profile_id", user.id);
  if (draft.influences.length) {
    const { error: infErr } = await supabase.from("influences").insert(
      draft.influences.map((a, rank) => ({
        profile_id: user.id,
        artist_id: a.id,
        artist_name: a.name,
        image_url: a.image ?? null,
        source: draft.musicSource ?? "manual",
        rank,
      })),
    );
    if (infErr) return { error: infErr.message };
  }

  if (draft.clips.length) {
    await supabase.from("clips").delete().eq("profile_id", user.id);
    await supabase.from("clips").insert(
      draft.clips.map((c) => ({ profile_id: user.id, kind: c.kind, provider: c.kind === "clip" ? parseClip(c.value)?.provider : null, url: c.value })),
    );
  }
  return {};
}

export function stepNav(step: Step) {
  const i = STEPS.indexOf(step);
  return {
    number: i + 1,
    total: STEPS.length,
    back: i === 0 ? "/" : `/onboarding/${STEPS[i - 1]}`,
    next: i === STEPS.length - 1 ? "/onboarding/done" : `/onboarding/${STEPS[i + 1]}`,
  };
}
