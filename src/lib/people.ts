import { cache } from "react";
import { expandRoles, fillsRole } from "./instruments";
import { MUSICIANS, THREADS, findMusician, type Musician } from "./mock";
import { COMMITMENT, type Artist } from "./onboarding";
import { catalogPhoto } from "./artists";
import { distancesFromMe, ensureLocation } from "./geo";
import { getJams, pendingCheckins, type Jam } from "./jams";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { messagePreview } from "./clip-reply";
import type { ClipProvider } from "./clips";
import { replyHabit, type ReplyStats } from "./reply-habits";

/**
 * Server-side reads for Today, profiles, search and Messages. With Supabase configured
 * these come from the database (row-level security decides what you can see); in demo
 * mode they fall back to the sample musicians in mock.ts.
 */

export const LOOKING_FOR: Record<string, string> = {
  showcase: "Sharing their music",
  join_band: "Looking to join a band",
  start_project: "Building a band",
  paid_work: "Open to paid and session work",
  jam: "Up for jams and co-writing",
};

const TODAY_SIZE = 5;

/**
 * While Mixstro is small, sample musicians fill out Today, search and Messages so the app
 * feels lived in. They're marked `sample` and their Connect and chat stay in demo mode.
 * Set NEXT_PUBLIC_SAMPLE_PEOPLE=off (and redeploy) to show signed-in people only real musicians.
 */
export const SHOW_SAMPLES = process.env.NEXT_PUBLIC_SAMPLE_PEOPLE !== "off";
const SAMPLES = (viewer?: Viewer): Musician[] => (SHOW_SAMPLES ? MUSICIANS.map((m) => asSampleFor(m, viewer)) : []);

/**
 * Sample people are written for Los Angeles and for one taste. Shown to a real musician they
 * must not pretend otherwise: no distance (they're not 3 mi from someone in Austin), the city
 * named, and "you both love" only for influences you actually picked.
 */
export function asSampleFor(m: Musician, viewer?: Viewer | null): Musician {
  if (!viewer) return m;
  const mine = new Map(viewer.influences.map((a) => [a.id, a]));
  return {
    ...m,
    distanceMi: undefined,
    neighborhood: `${m.neighborhood}, LA`,
    shared: m.influences.filter((a) => mine.has(a.id)).map((a) => ({ ...a, image: a.image ?? mine.get(a.id)?.image })),
    sameCommitment: false,
    sharedDays: [],
  };
}

/** Once this many real musicians show up for you, sample people step aside in search and Messages. */
export const ENOUGH_REAL = 20;
const ENOUGH_REAL_CHATS = 3;

function withSamples(people: Musician[], size: number, viewer: Viewer) {
  return [...people, ...SAMPLES(viewer)].slice(0, size);
}

/**
 * Sample chats. Signed out (the demo) they show the full flow; for a real musician they never
 * claim a reply is waiting on you or that you sent something you didn't.
 */
const SAMPLE_THREADS = (viewer?: Viewer): Thread[] =>
  SHOW_SAMPLES
    ? THREADS.map((t) => ({
        username: t.with,
        person: asSampleFor(findMusician(t.with)!, viewer),
        preview: t.preview,
        at: t.time,
        mine: viewer ? false : !t.unread,
        yourTurn: viewer ? false : t.unread,
      }))
    : [];

type ProfileRow = {
  id: string;
  first_name: string;
  username: string;
  avatar_url: string | null;
  instruments: string[];
  main_instrument: string | null;
  genres: string[];
  goals: string[];
  commitment: number;
  neighborhood: string | null;
  radius_mi: number;
  play_days: string[];
  last_active_at: string;
  verified_at: string | null;
  onboarded_at: string | null;
};

type InfluenceRow = { profile_id: string; artist_id: string; artist_name: string; image_url: string | null; rank: number };

export type ConnectionRow = {
  id: number;
  from_id: string;
  to_id: string;
  status: "pending" | "accepted" | "passed" | "declined";
  created_at: string;
  /** The short note sent with the Connect. */
  note?: string | null;
};

/** A Connect nobody answered within a week quietly closes for both people (#3). */
export const isExpired = (createdAt: string) => Date.now() - new Date(createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;

export type Viewer = {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  id: string;
  profile: ProfileRow | null;
  influences: Artist[];
};

const PROFILE_COLUMNS =
  "id, first_name, username, avatar_url, instruments, main_instrument, genres, goals, commitment, neighborhood, radius_mi, play_days, last_active_at, verified_at, onboarded_at";

/** The signed-in musician, or null in demo mode or when signed out. */
// cache(): one lookup per request, however many loaders on the page ask (Today asks twice).
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  // Verified locally from the session token (see middleware); every query below is still checked by RLS.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims.sub ? { id: claims.claims.sub } : null;
  if (!user) return null;
  const [{ data: profile }, { data: influences }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle<ProfileRow>(),
    supabase.from("influences").select("profile_id, artist_id, artist_name, image_url, rank").eq("profile_id", user.id).order("rank"),
  ]);
  return { supabase, id: user.id, profile, influences: ((influences ?? []) as InfluenceRow[]).map(toArtist) };
});

// Influences picked while artist search was down were saved without a photo; fill in the ones we know.
const toArtist = (r: InfluenceRow): Artist => ({ id: r.artist_id, name: r.artist_name, image: r.image_url ?? catalogPhoto(r.artist_id) });

function toMusician(row: ProfileRow, influences: InfluenceRow[], viewer: Viewer): Musician {
  const mine = new Set(viewer.influences.map((a) => a.id));
  const theirs = influences.filter((i) => i.profile_id === row.id).sort((a, b) => a.rank - b.rank).map(toArtist);
  const instrument = row.main_instrument ?? row.instruments[0] ?? "Musician";
  return {
    id: row.id,
    username: row.username,
    name: row.first_name,
    instrument,
    genres: row.genres.slice(0, 2).join(", ") || "Open to anything",
    neighborhood: row.neighborhood ?? "Nearby",
    photo: row.avatar_url,
    photoAlt: `${row.first_name}'s photo`,
    influences: theirs,
    shared: theirs.filter((a) => mine.has(a.id)),
    commitment: COMMITMENT[row.commitment] ?? "Just for fun",
    sameCommitment: viewer.profile ? viewer.profile.commitment === row.commitment : false,
    sharedDays: row.play_days.filter((d) => viewer.profile?.play_days.includes(d)),
    lastActiveAt: row.last_active_at,
    verified: Boolean(row.verified_at),
    lookingFor: LOOKING_FOR[row.goals[0]] ?? "Open to collaborating",
    instruments: row.instruments,
    genreList: row.genres,
    goals: row.goals,
    bands: [],
  };
}

async function hydrate(viewer: Viewer, rows: ProfileRow[]): Promise<Musician[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [{ data }, miles, remote, habits] = await Promise.all([
    viewer.supabase.from("influences").select("profile_id, artist_id, artist_name, image_url, rank").in("profile_id", ids),
    distancesFromMe(viewer.supabase, ids),
    openToRemote(viewer.supabase, ids),
    replyHabits(viewer.supabase, ids),
  ]);
  return rows.map((r) => {
    const habit = habits.get(r.id) ?? { slow: false };
    return {
      ...toMusician(r, (data ?? []) as InfluenceRow[], viewer),
      distanceMi: miles.get(r.id),
      remote: remote.has(r.id),
      replyLabel: habit.label,
      slowToReply: habit.slow,
    };
  });
}

/** Who has "Remote collabs" in their Open to. Read on its own so a database without open_to still works. */
async function openToRemote(supabase: Viewer["supabase"], ids: string[]): Promise<Set<string>> {
  const { data, error } = await supabase.from("profiles").select("id").in("id", ids).contains("open_to", ["remote"]);
  return error ? new Set() : new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
}

/** Reply habits by profile id (public.reply_stats). Empty before that function exists. */
async function replyHabits(supabase: Viewer["supabase"], ids: string[]) {
  const { data, error } = await supabase.rpc("reply_stats", { p_ids: ids.slice(0, 200) });
  const out = new Map<string, ReturnType<typeof replyHabit>>();
  if (error) return out;
  for (const r of (data ?? []) as { profile_id: string; asked: number; answered: number; median_hours: number | string | null }[]) {
    const stats: ReplyStats = { asked: r.asked, answered: r.answered, medianHours: r.median_hours === null ? null : Number(r.median_hours) };
    out.set(r.profile_id, replyHabit(stats));
  }
  return out;
}

/** Is the viewer open to remote collabs themselves? null when the database doesn't have Open to yet. */
async function viewerIsRemote(viewer: Viewer): Promise<boolean | null> {
  const { data, error } = await viewer.supabase.from("profiles").select("open_to").eq("id", viewer.id).maybeSingle<{ open_to: string[] | null }>();
  return error ? null : Boolean(data?.open_to?.includes("remote"));
}

/** Musicians by profile id, in the order given, with shared influences and distance. */
export async function getMusicians(viewer: Viewer, ids: string[]): Promise<Musician[]> {
  if (!ids.length) return [];
  const { data } = await viewer.supabase.from("profiles").select(PROFILE_COLUMNS).in("id", ids);
  const people = await hydrate(viewer, (data ?? []) as ProfileRow[]);
  return ids.flatMap((id) => people.find((m) => m.id === id) ?? []);
}

/** Fills in your own point first (once per neighborhood) so distances to everyone else work. */
export async function locate(viewer: Viewer) {
  if (viewer.profile) await ensureLocation(viewer.supabase, viewer.id, viewer.profile.neighborhood).catch(() => {});
}

/**
 * Who has music to hear: a clip, or a track on one of their projects. Music-first
 * ranking puts people with a photo and music ahead; empty profiles go last, never hidden.
 */
export async function withMusic(supabase: Viewer["supabase"], ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const [{ data: clips }, { data: tracks }] = await Promise.all([
    supabase.from("clips").select("profile_id").eq("kind", "clip").in("profile_id", ids),
    supabase.from("project_tracks").select("profile_id").in("profile_id", ids),
  ]);
  return new Set([...(clips ?? []), ...(tracks ?? [])].map((r) => r.profile_id as string));
}

/** 0: photo and music. 1: one of the two. 2: neither. Lower ranks first. */
export const profileTier = (m: Musician, music: Set<string>) => (m.photo ? 0 : 1) + (music.has(m.id) ? 0 : 1);

/** People within your radius. Anyone without a known distance yet stays in. */
const withinRadius = (viewer: Viewer) => (m: Musician) => m.distanceMi === undefined || m.distanceMi <= (viewer.profile?.radius_mi ?? 25);

/** Every connection row you're part of, in either direction. */
export async function myConnections(viewer: Viewer): Promise<ConnectionRow[]> {
  const { data } = await viewer.supabase
    .from("connections")
    .select("id, from_id, to_id, status, created_at, note")
    .or(`from_id.eq.${viewer.id},to_id.eq.${viewer.id}`);
  return (data ?? []) as ConnectionRow[];
}

/** Past this many chats waiting on you, Today pauses until you answer some (#4). */
export const YOUR_TURN_LIMIT = 8;

type Latest = { connection_id: number; sender_id: string; body: string | null; voice_url: string | null; created_at: string };

/**
 * The newest message in each conversation, however busy the others are (latest_messages, one
 * row per thread). Before that function exists it falls back to the old capped scan.
 */
async function latestPerThread(viewer: Viewer, connectionIds: number[]): Promise<Latest[]> {
  if (!connectionIds.length) return [];
  const { data, error } = await viewer.supabase.rpc("latest_messages", { p_connections: connectionIds });
  if (!error) return (data ?? []) as Latest[];
  const { data: rows } = await viewer.supabase
    .from("messages")
    .select("connection_id, sender_id, body, voice_url, created_at")
    .in("connection_id", connectionIds)
    .order("created_at", { ascending: false })
    .limit(1000);
  const seen = new Set<number>();
  return ((rows ?? []) as Latest[]).filter((m) => !seen.has(m.connection_id) && Boolean(seen.add(m.connection_id)));
}

/** How many accepted conversations end with a message from the other person. */
async function yourTurnCount(viewer: Viewer, connections: ConnectionRow[]) {
  const accepted = connections.filter((c) => c.status === "accepted").map((c) => c.id);
  if (accepted.length < YOUR_TURN_LIMIT) return 0;
  const latest = await latestPerThread(viewer, accepted);
  const last = new Map<number, string>(latest.map((m) => [m.connection_id, m.sender_id]));
  return [...last.values()].filter((sender) => sender !== viewer.id).length;
}

export type Today = {
  /** Chats waiting on you; Today pauses at YOUR_TURN_LIMIT. */
  yourTurn: number;
  people: Musician[];
  /** Ids of people who already said they want to play with you. */
  incoming: string[];
  /** The note each of them sent, by their id. */
  notes?: Record<string, string>;
  demo: boolean;
  /** How busy your area is, for the "you're one of the first here" card. Signed-in only. */
  area?: Area;
  /** Musicians open to remote collabs, at any distance (not already in the deck). */
  remote?: Musician[];
  /** Whether you're open to remote collabs yourself (offers the switch when not); null before the database has Open to. */
  youRemote?: boolean | null;
};

/**
 * While few real musicians are near you, Home says so plainly instead of leaning on samples:
 * you're early, invite people, we'll ping you when a player you need joins, and here are the
 * nearest real musicians even if they're past your radius.
 */
export type Area = {
  /** "Kyle", from your neighborhood. */
  place: string | null;
  radius: number;
  /** Real musicians with a known distance inside your radius. */
  nearby: number;
  /** The closest real musicians outside your radius, nearest first. */
  further: Musician[];
  /** Roles you get alerts for ("Drums", "Bass"); empty when alerts are off. */
  alertRoles: string[];
};

/** Below this many real musicians nearby, Home shows the early-area card. */
export const EARLY_AREA = 3;

/**
 * Who Today chooses from. People who asked to play with you are fetched by id, on their own,
 * so a busy market can never push them out. Everyone else comes from local_candidates, which
 * keeps only discoverable, unblocked, not-yet-known people inside your radius BEFORE taking a
 * limit (200 newer accounts in another city can't crowd out your neighbors). Before that
 * function exists, the older "200 most recent anywhere" read is used.
 */
async function todayCandidates(viewer: Viewer, exclude: Set<string>, incoming: string[]): Promise<ProfileRow[]> {
  const [{ data: asked }, local] = await Promise.all([
    incoming.length ? viewer.supabase.from("discoverable_profiles").select(PROFILE_COLUMNS).in("id", incoming) : Promise.resolve({ data: [] }),
    viewer.supabase.rpc("local_candidates", { p_limit: 60 }),
  ]);
  let organic: ProfileRow[];
  if (!local.error) {
    const ids = ((local.data ?? []) as { profile_id: string }[]).map((r) => r.profile_id).filter((id) => !exclude.has(id));
    const { data } = ids.length ? await viewer.supabase.from("discoverable_profiles").select(PROFILE_COLUMNS).in("id", ids) : { data: [] };
    organic = (data ?? []) as ProfileRow[];
    // Few people local yet: add recent people further out, for the early-area card's "nearest
    // musicians past your radius" (they're still filtered by radius for the deck itself).
    if (organic.length < EARLY_AREA) {
      const { data: recent } = await viewer.supabase.from("discoverable_profiles").select(PROFILE_COLUMNS).order("last_active_at", { ascending: false }).limit(60);
      organic = [...organic, ...((recent ?? []) as ProfileRow[]).filter((r) => !exclude.has(r.id))];
    }
  } else {
    // discoverable_profiles: onboarded and active in the last 30 days; RLS hides blocked pairs.
    const { data } = await viewer.supabase.from("discoverable_profiles").select(PROFILE_COLUMNS).order("last_active_at", { ascending: false }).limit(200);
    organic = ((data ?? []) as ProfileRow[]).filter((r) => !exclude.has(r.id));
  }
  const seen = new Set<string>();
  return [...((asked ?? []) as ProfileRow[]), ...organic].filter((r) => r.id !== viewer.id && !seen.has(r.id) && Boolean(seen.add(r.id)));
}

/**
 * Today: up to five musicians you haven't connected with or passed on. People who
 * already reached out to you come first, then the most shared influences.
 */
export async function getToday(): Promise<Today> {
  const viewer = await getViewer();
  if (!viewer) return { people: MUSICIANS, incoming: [], demo: true, yourTurn: 0 };

  const [connections] = await Promise.all([myConnections(viewer), locate(viewer)]);
  const incoming = connections.filter((c) => c.to_id === viewer.id && c.status === "pending" && !isExpired(c.created_at)).map((c) => c.from_id);
  const exclude = new Set(connections.flatMap((c) => [c.from_id, c.to_id]).filter((id) => !incoming.includes(id)));
  exclude.add(viewer.id);

  // Only needs the connections, so it runs alongside the rest instead of after it.
  const yourTurn = yourTurnCount(viewer, connections);
  const alertRoles = getAlertRoles(viewer).catch(() => ({ roles: [] as string[], picked: false }));
  const youRemote = viewerIsRemote(viewer).catch(() => null);
  const remoteRows = remoteCandidates(viewer, exclude);
  const candidates = await todayCandidates(viewer, exclude, incoming);
  const [nearby, music] = await Promise.all([
    hydrate(viewer, candidates),
    withMusic(viewer.supabase, candidates.map((r) => r.id)),
  ]);
  // Someone who already asked to play with you shows up even if they're a bit further out.
  const people = nearby.filter((m) => incoming.includes(m.id) || withinRadius(viewer)(m));
  const score = (m: Musician) => m.shared.length + (m.sameCommitment ? 1 : 0);
  // Ties go to whoever is closer.
  const near = (m: Musician) => m.distanceMi ?? Infinity;
  // Music first: people with a photo and something to hear lead, empty profiles go last.
  people.sort(
    (a, b) =>
      Number(incoming.includes(b.id)) - Number(incoming.includes(a.id)) ||
      profileTier(a, music) - profileTier(b, music) ||
      // People who leave most Connects unanswered go after everyone who replies.
      Number(Boolean(a.slowToReply)) - Number(Boolean(b.slowToReply)) ||
      score(b) - score(a) ||
      near(a) - near(b),
  );
  const notes = Object.fromEntries(connections.filter((c) => incoming.includes(c.from_id) && c.note).map((c) => [c.from_id, c.note as string]));
  const radius = viewer.profile?.radius_mi ?? 25;
  const area: Area = {
    place: viewer.profile?.neighborhood?.split(",")[0]?.trim() || null,
    radius,
    nearby: nearby.filter((m) => m.distanceMi !== undefined && m.distanceMi <= radius).length,
    further: nearby
      .filter((m) => m.distanceMi !== undefined && m.distanceMi > radius)
      .sort((a, b) => a.distanceMi! - b.distanceMi!)
      .slice(0, 8),
    alertRoles: (await alertRoles).roles,
  };
  const deck = withSamples(people, TODAY_SIZE, viewer);
  const inDeck = new Set(deck.map((m) => m.id));
  const remote = await hydrate(viewer, (await remoteRows).filter((r) => !inDeck.has(r.id)));
  const remoteMusic = await withMusic(viewer.supabase, remote.map((m) => m.id));
  remote.sort((a, b) => profileTier(a, remoteMusic) - profileTier(b, remoteMusic) || Number(Boolean(a.slowToReply)) - Number(Boolean(b.slowToReply)) || score(b) - score(a));
  return { people: deck, incoming, notes, demo: false, yourTurn: await yourTurn, area, remote: remote.slice(0, 6), youRemote: await youRemote };
}

/** People open to remote collabs, anywhere (public.remote_candidates). Empty before it exists. */
async function remoteCandidates(viewer: Viewer, exclude: Set<string>): Promise<ProfileRow[]> {
  const { data, error } = await viewer.supabase.rpc("remote_candidates", { p_limit: 30 });
  if (error) return [];
  const ids = ((data ?? []) as { profile_id: string }[]).map((r) => r.profile_id).filter((id) => !exclude.has(id));
  if (!ids.length) return [];
  const { data: rows } = await viewer.supabase.from("discoverable_profiles").select(PROFILE_COLUMNS).in("id", ids);
  return (rows ?? []) as ProfileRow[];
}

/** Everyone you can search: photo and music first, then most recently active. */
export async function getSearchable(): Promise<Musician[]> {
  const viewer = await getViewer();
  if (!viewer) return MUSICIANS;
  // Saving your location and fetching the list don't depend on each other; distances need both.
  const [{ data }] = await Promise.all([
    viewer.supabase.from("discoverable_profiles").select(PROFILE_COLUMNS).neq("id", viewer.id).order("last_active_at", { ascending: false }).limit(200),
    locate(viewer),
  ]);
  const rows = (data ?? []) as ProfileRow[];
  const [real, music] = await Promise.all([hydrate(viewer, rows), withMusic(viewer.supabase, rows.map((r) => r.id))]);
  // Stable sort keeps "most recently active" within each tier; people who rarely reply go last in theirs.
  real.sort((a, b) => profileTier(a, music) - profileTier(b, music) || Number(Boolean(a.slowToReply)) - Number(Boolean(b.slowToReply)));
  return real.length >= ENOUGH_REAL ? real : [...real, ...SAMPLES(viewer)];
}

export type ProfileView = { person: Musician; connection: ConnectionRow | null; viewerId: string | null; viewerPhoto: string | null };

/** One musician by username, plus where you stand with them. */
/** Cached per request, so the page and its title share one lookup. */
export const getProfile = cache(async (username: string): Promise<ProfileView | null> => {
  const viewer = await getViewer();
  if (!viewer) {
    const person = findMusician(username);
    return person ? { person, connection: null, viewerId: null, viewerPhoto: "/photos/you-ibanez.jpg" } : null;
  }
  const { data } = await viewer.supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle<ProfileRow>();
  if (!data) {
    const sample = SHOW_SAMPLES ? findMusician(username) : undefined;
    return sample ? { person: asSampleFor(sample, viewer), connection: null, viewerId: viewer.id, viewerPhoto: viewer.profile?.avatar_url ?? null } : null;
  }
  const [[person], connections] = await Promise.all([hydrate(viewer, [data]), myConnections(viewer)]);
  const connection = connections.find((c) => c.from_id === data.id || c.to_id === data.id) ?? null;
  return { person, connection, viewerId: viewer.id, viewerPhoto: viewer.profile?.avatar_url ?? null };
});

/** `at` is an ISO timestamp, or preformatted text for sample threads. */
/** `yourTurn`: they wrote last (or a "Did you jam?" is waiting), so it's in your private Your turn tray (#4). */
export type Thread = { username: string; person: Musician; preview: string; at: string; mine: boolean; checkin?: boolean; yourTurn?: boolean };

/** Your accepted connections, newest conversation first. */
export async function getThreads(): Promise<{ threads: Thread[]; demo: boolean }> {
  const viewer = await getViewer();
  if (!viewer) {
    return { demo: true, threads: SAMPLE_THREADS() };
  }
  const accepted = (await myConnections(viewer)).filter((c) => c.status === "accepted");
  if (!accepted.length) return { threads: SAMPLE_THREADS(viewer), demo: false };

  const otherIds = accepted.map((c) => (c.from_id === viewer.id ? c.to_id : c.from_id));
  const [{ data: rows }, messages] = await Promise.all([
    viewer.supabase.from("profiles").select(PROFILE_COLUMNS).in("id", otherIds),
    latestPerThread(viewer, accepted.map((c) => c.id)),
  ]);
  const [people, checkins] = await Promise.all([
    hydrate(viewer, (rows ?? []) as ProfileRow[]),
    pendingCheckins(viewer.supabase, accepted.map((c) => c.id), viewer.id),
  ]);
  const threads = accepted.flatMap((c) => {
    const person = people.find((p) => p.id === (c.from_id === viewer.id ? c.to_id : c.from_id));
    if (!person) return [];
    const last = messages.find((m) => m.connection_id === c.id);
    const at = last?.created_at ?? c.created_at;
    return [
      {
        username: person.username,
        person,
        preview: checkins.has(c.id)
          ? `Did you end up playing with ${person.name}?`
          : last
            ? messagePreview(last)
            : `You're connected. Say hi to ${person.name}.`,
        at,
        mine: checkins.has(c.id) ? false : last?.sender_id === viewer.id,
        checkin: checkins.has(c.id),
        yourTurn: checkins.has(c.id) || (Boolean(last) && last!.sender_id !== viewer.id),
      },
    ];
  });
  threads.sort((a, b) => b.at.localeCompare(a.at));
  return { threads: threads.length >= ENOUGH_REAL_CHATS ? threads : [...threads, ...SAMPLE_THREADS(viewer)], demo: false };
}

/** `voiceUrl` is a short-lived signed link to the recording in the private "voice" bucket. */
export type ChatMessage = {
  id: number;
  mine: boolean;
  body: string | null;
  voiceUrl: string | null;
  voiceSeconds?: number | null;
  createdAt: string;
  /** The phone's id for the send, so the optimistic copy and the stored one are matched. */
  clientId?: string | null;
  /** A clip this message points at, and the moment in it. */
  clip?: ChatClip | null;
};

/** A clip in a chat. `available` is false once the clip was removed: the reply stays readable. */
export type ChatClip = {
  id: number;
  at: number | null;
  available: boolean;
  url?: string;
  provider?: ClipProvider | null;
  mine?: boolean;
  duration?: number | null;
};

/** A clip you can reply to in this chat: theirs and yours. */
export type ClipOption = { id: number; url: string; provider: ClipProvider | null; mine: boolean; duration: number | null };

/** Messages per page in a chat. The newest page loads first; older pages load on request. */
export const CHAT_PAGE = 150;

export type ChatView =
  | { kind: "demo"; person: Musician }
  | { kind: "live"; person: Musician; connectionId: number; messages: ChatMessage[]; jams: Jam[]; more: boolean; clips: ClipOption[] }
  | { kind: "not-connected"; person: Musician; connection: ConnectionRow | null; viewerId: string };

/** The conversation with one musician. Messages only exist inside an accepted connection. */
export const getChat = cache(async (username: string): Promise<ChatView | null> => {
  const view = await getProfile(username);
  if (!view) return null;
  if (!view.viewerId || view.person.sample) return { kind: "demo", person: view.person };
  if (view.connection?.status !== "accepted") {
    return { kind: "not-connected", person: view.person, connection: view.connection, viewerId: view.viewerId };
  }
  const supabase = (await createClient())!;
  const [page, jams, clips] = await Promise.all([
    chatPage(supabase, view.connection.id, view.viewerId, null),
    getJams(supabase, view.connection.id, view.viewerId),
    chatClipOptions(supabase, view.viewerId, view.person.id),
  ]);
  return { kind: "live", person: view.person, connectionId: view.connection.id, jams, clips, ...page };
});

type ChatRow = {
  id: number;
  sender_id: string;
  body: string | null;
  voice_url: string | null;
  voice_seconds?: number | null;
  created_at: string;
  client_id?: string | null;
  clip_id?: number | null;
  clip_at?: number | null;
};
type ClipRow = { id: number; profile_id: string; url: string; provider: ClipProvider | null; duration_s?: number | null };

/** Your clips and theirs, to reply to. "*" so it loads before duration_s exists. */
async function chatClipOptions(supabase: Viewer["supabase"], viewerId: string, otherId: string): Promise<ClipOption[]> {
  const { data } = await supabase.from("clips").select("*").in("profile_id", [otherId, viewerId]).eq("kind", "clip").order("id", { ascending: false }).limit(40);
  return ((data ?? []) as ClipRow[])
    .map((c) => ({ id: c.id, url: c.url, provider: c.provider, mine: c.profile_id === viewerId, duration: c.duration_s ?? null }))
    .sort((a, b) => Number(a.mine) - Number(b.mine));
}

/**
 * One page of a chat, newest first with the id breaking ties, then flipped to read top to
 * bottom. `before` is the oldest message already on screen; null means the newest page.
 * "*" so it still loads before newer columns (voice_seconds, client_id) exist.
 */
async function chatPage(
  supabase: Viewer["supabase"],
  connectionId: number,
  viewerId: string,
  before: { id: number; createdAt: string } | null,
): Promise<{ messages: ChatMessage[]; more: boolean }> {
  let q = supabase.from("messages").select("*").eq("connection_id", connectionId);
  if (before) q = q.or(`created_at.lt."${before.createdAt}",and(created_at.eq."${before.createdAt}",id.lt.${before.id})`);
  const { data } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(CHAT_PAGE + 1);
  const all = (data ?? []) as ChatRow[];
  const rows = all.slice(0, CHAT_PAGE).reverse();
  const paths = rows.flatMap((m) => (m.voice_url ? [m.voice_url] : []));
  const signed = new Map<string, string>();
  const clipIds = [...new Set(rows.flatMap((m) => (m.clip_id ? [m.clip_id] : [])))];
  const [, clipRows] = await Promise.all([
    paths.length
      ? supabase.storage
          .from("voice")
          .createSignedUrls(paths, 60 * 60 * 6)
          .then(({ data: links }) => {
            for (const l of links ?? []) if (l.path && l.signedUrl) signed.set(l.path, l.signedUrl);
          })
      : null,
    // Read as the viewer: a clip that's gone (or that they can't read) comes back missing and shows as unavailable.
    clipIds.length ? supabase.from("clips").select("*").in("id", clipIds).eq("kind", "clip").then(({ data: c }) => (c ?? []) as ClipRow[]) : ([] as ClipRow[]),
  ]);
  const clipsById = new Map(clipRows.map((c) => [c.id, c]));
  return {
    more: all.length > CHAT_PAGE,
    messages: rows.map((m) => ({
      id: m.id,
      mine: m.sender_id === viewerId,
      body: m.body,
      voiceUrl: m.voice_url ? (signed.get(m.voice_url) ?? null) : null,
      voiceSeconds: m.voice_seconds ?? null,
      createdAt: m.created_at,
      clientId: m.client_id ?? null,
      clip: m.clip_id ? toChatClip(m.clip_id, m.clip_at ?? null, clipsById.get(m.clip_id), viewerId) : null,
    })),
  };
}

function toChatClip(id: number, at: number | null, row: ClipRow | undefined, viewerId: string): ChatClip {
  if (!row) return { id, at, available: false };
  return { id, at, available: true, url: row.url, provider: row.provider, mine: row.profile_id === viewerId, duration: row.duration_s ?? null };
}

/** Older messages in your chat with someone (Load earlier). Same visibility rules as the chat. */
export async function getOlderMessages(username: string, before: { id: number; createdAt: string }) {
  const view = await getProfile(username);
  if (!view?.viewerId || view.connection?.status !== "accepted") return { messages: [] as ChatMessage[], more: false };
  const supabase = (await createClient())!;
  return chatPage(supabase, view.connection.id, view.viewerId, before);
}

/** Starting or rebuilding a band? Drummers and bassists are the classic hard finds. */
export const DEFAULT_ALERT_ROLES = ["Drums", "Bass"];

/** The roles you want alerts for (#12): what you picked, or a suggestion from your goals. */
export async function getAlertRoles(viewer: Viewer): Promise<{ roles: string[]; picked: boolean }> {
  const { data, error } = await viewer.supabase.from("profiles").select("alert_roles").eq("id", viewer.id).maybeSingle<{ alert_roles: string[] | null }>();
  if (!error && data?.alert_roles) return { roles: data.alert_roles, picked: true };
  return { roles: viewer.profile?.goals.includes("start_project") ? DEFAULT_ALERT_ROLES : [], picked: false };
}

export type RoleAlert = { person: Musician; role: string; why: string };

/**
 * #12 "A drummer into your kind of music just joined 6 mi away." Someone who finished
 * signup in the last 3 days, plays a role you want, is within your radius, shares an
 * influence or genre with you, and isn't already in your Connects.
 */
export async function getRoleAlert(): Promise<RoleAlert | null> {
  const viewer = await getViewer();
  if (!viewer?.profile) return null;
  const { roles } = await getAlertRoles(viewer);
  if (!roles.length) return null;
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data }, connections] = await Promise.all([
    viewer.supabase
      .from("discoverable_profiles")
      .select(PROFILE_COLUMNS)
      .neq("id", viewer.id)
      .gte("onboarded_at", since)
      .overlaps("instruments", expandRoles(roles))
      .order("onboarded_at", { ascending: false })
      .limit(30),
    myConnections(viewer),
  ]);
  const known = new Set(connections.flatMap((c) => [c.from_id, c.to_id]));
  const myGenres = new Set(viewer.profile.genres);
  const rows = ((data ?? []) as ProfileRow[]).filter((r) => !known.has(r.id));
  const people = await hydrate(viewer, rows);
  const radius = viewer.profile.radius_mi ?? 25;
  for (const row of rows) {
    const m = people.find((p) => p.id === row.id);
    if (!m || m.distanceMi === undefined || m.distanceMi > radius) continue;
    const genre = row.genres.find((g) => myGenres.has(g));
    if (!m.shared.length && !genre) continue;
    const role = row.instruments.find((i) => fillsRole(i, roles)) ?? m.instrument;
    const why = m.shared.length ? `into ${m.shared[0].name}` : `into ${genre!.toLowerCase()}`;
    return { person: m, role, why };
  }
  return null;
}

export type Stage = {
  firstName: string;
  username: string;
  photo: string | null;
  headline: string;
  hasPhoto: boolean;
  hasSong: boolean;
  hasProject: boolean;
};

/** What's on your page so far, for Your stage on Home. Null in demo mode or without a profile. */
export async function getStage(): Promise<Stage | null> {
  const viewer = await getViewer();
  const p = viewer?.profile;
  // Demo mode (no database): a sample page, so Home shows Your stage as a new musician sees it.
  if (!viewer && !isSupabaseConfigured) {
    return { firstName: "Sundy", username: "sundy", photo: "/photos/you-ibanez.jpg", headline: "Guitar · Indie · Silver Lake", hasPhoto: true, hasSong: false, hasProject: false };
  }
  if (!viewer || !p) return null;
  const [{ count: clips }, { count: tracks }, { count: projects }] = await Promise.all([
    viewer.supabase.from("clips").select("id", { count: "exact", head: true }).eq("profile_id", viewer.id).eq("kind", "clip"),
    viewer.supabase.from("project_tracks").select("id", { count: "exact", head: true }).eq("profile_id", viewer.id),
    viewer.supabase.from("projects").select("id", { count: "exact", head: true }).eq("profile_id", viewer.id),
  ]);
  const instrument = p.main_instrument ?? p.instruments[0];
  return {
    firstName: p.first_name,
    username: p.username,
    photo: p.avatar_url,
    headline: [instrument, p.genres[0], p.neighborhood?.split(",")[0]].filter(Boolean).join(" · "),
    hasPhoto: Boolean(p.avatar_url),
    hasSong: Boolean(clips || tracks),
    hasProject: Boolean(projects),
  };
}
