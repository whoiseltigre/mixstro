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
  adultConfirmedAt?: string; // ISO time the "I'm 18 or older" box was ticked
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

/** The numbered steps, one question each; sign-in comes before, "done" after. Influences and the rest are added later from the profile. */
export const STEPS = ["basics", "play", "why", "where", "sound"] as const;
export type Step = (typeof STEPS)[number];

/** Each step's stage-spill color, so every screen feels like its own moment. */
export const STEP_GLOW: Record<Step, string> = {
  basics: "#FFB245",
  play: "#B5C5FF",
  why: "#67E2DA",
  where: "#FFACBA",
  sound: "#F7BF77",
};

export const INSTRUMENTS = ["Guitar", "Bass", "Drums", "Keys", "Vocals", "Producer", "Songwriter", "DJ", "Strings", "Horns"];
export const GENRES = ["Indie", "Rock", "Neo-soul", "Funk", "Jazz", "Hip-hop", "R&B", "Folk", "Electronic", "Punk", "Metal", "Country", "Pop", "Latin"];
export const GOALS = [
  { id: "showcase", title: "Show off my music", sub: "Old recordings, new releases, the whole journey" },
  { id: "start_project", title: "Start or rebuild a band", sub: "Find new members or replace one" },
  { id: "join_band", title: "Join a band", sub: "Fill a spot in an existing group" },
  { id: "paid_work", title: "Gigs and paid work", sub: "Shows, studio days, tours" },
  { id: "jam", title: "Network and jam", sub: "Meet local musicians, co-write, just play" },
];
/** The three reasons from the welcome screen, each grouping the goals we store. */
export const REASONS = [
  { id: "showcase", title: "Show off my music", sub: "Your whole journey, old songs included", color: "#FFB245", goals: [{ id: "showcase", label: "" }] },
  {
    id: "bandmates",
    title: "Find bandmates",
    sub: "Start a band, replace a member, or join one",
    color: "#B5C5FF",
    goals: [
      { id: "start_project", label: "Start or rebuild a band" },
      { id: "join_band", label: "Join a band" },
    ],
  },
  {
    id: "network",
    title: "Gigs and networking",
    sub: "Shows, studio days, other musicians",
    color: "#67E2DA",
    goals: [
      { id: "paid_work", label: "Gigs and paid work" },
      { id: "jam", label: "Meet and jam" },
    ],
  },
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

/** Remembers the sign-in screen's 18+ checkbox so it carries through the Google or email round trip. */
export function confirmAdult(on: boolean) {
  try {
    const draft = read();
    localStorage.setItem(KEY, JSON.stringify({ ...draft, adultConfirmedAt: on ? new Date().toISOString() : undefined }));
  } catch {
    // Private mode: onboarding asks again.
  }
}

export function adultConfirmed() {
  return Boolean(read().adultConfirmedAt);
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
    adult_confirmed_at: draft.adultConfirmedAt,
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
