"use client";

import { useCallback, useEffect, useState } from "react";
import { parseClip } from "@/lib/clips";
import { saveMyLocation } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/client";
import { pruneOldPhotos, uploadPhoto } from "@/lib/photo";
import { ROLE_IDS } from "@/lib/instruments";

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
  /** Instruments you typed in yourself ("Erhu"), and the family tile you added them under. */
  customFamily?: Record<string, string>;
  level?: Level;
  genres: string[];
  musicSource?: MusicSource;
  influences: Artist[];
  /** Signing up just for yourself, or for you and your band (picked on the first screen). */
  signupAs?: "solo" | "band";
  /** Your band, from the band step or "This is my band" in search. Saved as a current project, which is its band page. */
  band?: { name: string; since: number; role?: string; link?: string; tracks?: { title: string; url: string; thumb?: string }[]; photo?: string };
  goals: string[];
  commitment: number; // index into COMMITMENT
  neighborhood: string;
  /** From "Use my location", rounded; dropped when you type a neighborhood instead. */
  point?: { lat: number; lng: number };
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

/**
 * The numbered signup steps, kept short so signing up takes about two minutes: who's joining (just
 * you, or you and your band), you and where you are, what you play, your band (band signups only),
 * your influences. Sign-in comes before, "done" after. What you're here for, tracks and more
 * projects are added afterwards from "Finish your profile".
 */
export const STEPS = ["who", "basics", "play", "band", "influences"] as const;
export type Step = (typeof STEPS)[number];
/** Screens you reach from your profile, outside the numbered steps. */
export type ProfileScreen = "why" | "sound";

/** Each screen's stage-spill color, so every screen feels like its own moment. */
export const STEP_GLOW: Record<Step | ProfileScreen | "where", string> = {
  who: "#FFB245",
  band: "#FFACBA",
  basics: "#FFB245",
  play: "#FF8A6B",
  why: "#F7BF77",
  where: "#FFACBA",
  influences: "#C9B6FF",
  sound: "#FFACBA",
};

/** Instrument families, which are also the roles you can look for. The exact instruments live in lib/instruments. */
export const INSTRUMENTS = ROLE_IDS;
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
    color: "#FF8A6B",
    goals: [
      { id: "start_project", label: "Start or rebuild a band" },
      { id: "join_band", label: "Join a band" },
    ],
  },
  {
    id: "network",
    title: "Gigs and networking",
    sub: "Shows, studio days, other musicians",
    color: "#C9B6FF",
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

  /** A patch, or a function of the latest draft for updates that land after an await. */
  const update = useCallback((patch: Partial<Draft> | ((prev: Draft) => Partial<Draft>)) => {
    setDraft((prev) => {
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
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

/**
 * If someone's music page (or invite) brought you here, note it once on your profile
 * (profiles.invited_by), for the first-100-users numbers. Never overwrites.
 */
async function creditInvite(supabase: NonNullable<ReturnType<typeof createClient>>, userId: string) {
  const raw = document.cookie.split("; ").find((c) => c.startsWith("mx_ref="))?.slice(7);
  if (!raw) return;
  const [username, source] = decodeURIComponent(raw).split(":");
  document.cookie = "mx_ref=; Max-Age=0; path=/";
  const { data } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle<{ id: string }>();
  if (!data || data.id === userId) return;
  await supabase
    .from("profiles")
    .update({ invited_by: data.id, invite_source: ["page", "share", "tag", "invite"].includes(source) ? source : "page" })
    .eq("id", userId)
    .is("invited_by", null);
}

/** Changes just your photo (from your profile), without re-saving everything else. */
export async function savePhoto(dataUrl: string): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { url: dataUrl }; // demo mode keeps the local preview
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };
  const url = await uploadPhoto(supabase, user.id, dataUrl).catch(() => null);
  if (!url) return { error: "Your photo didn't upload. Try again." };
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: "Your photo didn't save. Try again." };
  pruneOldPhotos(supabase, user.id, url).catch(() => {});
  return { url };
}

/** Swap the local preview for the uploaded URL, so the next save doesn't upload it again. */
function rememberPhoto(url: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), avatarUrl: url }));
  } catch {
    // Private mode: harmless, the next save just uploads again.
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

  // A newly picked photo is a local data URL until it's uploaded here.
  let avatarUrl = draft.avatarUrl?.startsWith("http") ? draft.avatarUrl : null;
  const newPhoto = draft.avatarUrl?.startsWith("data:image/");
  if (newPhoto) {
    avatarUrl = await uploadPhoto(supabase, user.id, draft.avatarUrl!).catch(() => null);
    if (!avatarUrl) return { error: "Your photo didn't upload. Try again, or pick a smaller one." };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: draft.firstName.trim(),
    username: draft.username.replace(/^@/, "").trim().toLowerCase(),
    adult_confirmed_at: draft.adultConfirmedAt,
    avatar_url: avatarUrl,
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
  if (newPhoto && avatarUrl) {
    rememberPhoto(avatarUrl);
    pruneOldPhotos(supabase, user.id, avatarUrl).catch(() => {});
  }

  await creditInvite(supabase, user.id).catch(() => {});

  // Distances are a nice-to-have: a failure here never fails the save.
  await saveMyLocation(draft.neighborhood, draft.point).catch(() => {});

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

  // Your band becomes a current project on your profile, which is also its band page (/b/<id>).
  if (draft.band?.name.trim()) {
    const name = draft.band.name.trim().slice(0, 80);
    const { data: existing } = await supabase.from("projects").select("id").eq("profile_id", user.id).ilike("name", name).limit(1);
    let projectId = existing?.[0]?.id as number | undefined;
    if (!projectId) {
      const { data: row } = await supabase
        .from("projects")
        .insert({ profile_id: user.id, name, start_year: draft.band.since, role: draft.band.role?.trim() || draft.mainInstrument || null })
        .select("id")
        .single<{ id: number }>();
      projectId = row?.id;
      // Songs confirmed with "Is this you?", then any pasted link.
      const tracks = [...(draft.band.tracks ?? []), ...(draft.band.link ? [{ url: draft.band.link, title: undefined, thumb: undefined }] : [])]
        .map((t) => ({ t, clip: parseClip(t.url) }))
        .filter((x) => x.clip && x.clip.provider !== "upload")
        .slice(0, 6);
      if (projectId && tracks.length) {
        await supabase.from("project_tracks").insert(
          tracks.map(({ t, clip }, rank) => ({ project_id: projectId, profile_id: user.id, provider: clip!.provider, url: clip!.url, title: t.title ?? null, thumb_url: t.thumb ?? null, rank })),
        );
      }
    }
    if (projectId) rememberBand(projectId);
  }

  if (draft.clips.length) {
    await supabase.from("clips").delete().eq("profile_id", user.id);
    await supabase.from("clips").insert(
      draft.clips.map((c) => ({ profile_id: user.id, kind: c.kind, provider: c.kind === "clip" ? parseClip(c.value)?.provider : null, url: c.value })),
    );
  }
  return {};
}

/** The steps for this signup: the band step only when you're signing up with your band. */
export function stepsFor(draft: Pick<Draft, "signupAs">) {
  return STEPS.filter((s) => s !== "band" || draft.signupAs === "band");
}

export function stepNav(step: Step, draft: Pick<Draft, "signupAs"> = {}) {
  const steps = stepsFor(draft);
  const i = Math.max(0, steps.indexOf(step));
  return {
    number: i + 1,
    total: steps.length,
    back: i === 0 ? "/" : `/onboarding/${steps[i - 1]}`,
    next: i === steps.length - 1 ? "/onboarding/done" : `/onboarding/${steps[i + 1]}`,
  };
}

/** The band page made at signup, so "done" can link to it. */
function rememberBand(id: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), bandPageId: id }));
  } catch {}
}

export function savedBandPageId(): number | undefined {
  return (read() as Draft & { bandPageId?: number }).bandPageId;
}
