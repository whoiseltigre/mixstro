import { MUSICIANS, THREADS, findMusician, type Musician } from "./mock";
import { COMMITMENT, type Artist } from "./onboarding";
import { createClient } from "./supabase/server";

/**
 * Server-side reads for Today, profiles, search and Messages. With Supabase configured
 * these come from the database (row-level security decides what you can see); in demo
 * mode they fall back to the sample musicians in mock.ts.
 */

const LOOKING_FOR: Record<string, string> = {
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
 */
function withSamples(people: Musician[], size: number) {
  return [...people, ...MUSICIANS].slice(0, size);
}

const SAMPLE_THREADS = (): Thread[] =>
  THREADS.map((t) => ({ username: t.with, person: findMusician(t.with)!, preview: t.preview, at: t.time, mine: !t.unread }));

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
  play_days: string[];
  last_active_at: string;
  verified_at: string | null;
  onboarded_at: string | null;
};

type InfluenceRow = { profile_id: string; artist_id: string; artist_name: string; image_url: string | null; rank: number };

export type ConnectionRow = { id: number; from_id: string; to_id: string; status: "pending" | "accepted" | "passed"; created_at: string };

export type Viewer = {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  id: string;
  profile: ProfileRow | null;
  influences: Artist[];
};

const PROFILE_COLUMNS =
  "id, first_name, username, avatar_url, instruments, main_instrument, genres, goals, commitment, neighborhood, play_days, last_active_at, verified_at, onboarded_at";

/** The signed-in musician, or null in demo mode or when signed out. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: influences }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle<ProfileRow>(),
    supabase.from("influences").select("profile_id, artist_id, artist_name, image_url, rank").eq("profile_id", user.id).order("rank"),
  ]);
  return { supabase, id: user.id, profile, influences: ((influences ?? []) as InfluenceRow[]).map(toArtist) };
}

const toArtist = (r: InfluenceRow): Artist => ({ id: r.artist_id, name: r.artist_name, image: r.image_url ?? undefined });

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
    bands: [],
  };
}

async function hydrate(viewer: Viewer, rows: ProfileRow[]): Promise<Musician[]> {
  if (!rows.length) return [];
  const { data } = await viewer.supabase
    .from("influences")
    .select("profile_id, artist_id, artist_name, image_url, rank")
    .in("profile_id", rows.map((r) => r.id));
  return rows.map((r) => toMusician(r, (data ?? []) as InfluenceRow[], viewer));
}

/** Every connection row you're part of, in either direction. */
async function myConnections(viewer: Viewer): Promise<ConnectionRow[]> {
  const { data } = await viewer.supabase
    .from("connections")
    .select("id, from_id, to_id, status, created_at")
    .or(`from_id.eq.${viewer.id},to_id.eq.${viewer.id}`);
  return (data ?? []) as ConnectionRow[];
}

export type Today = {
  people: Musician[];
  /** Ids of people who already said they want to play with you. */
  incoming: string[];
  demo: boolean;
};

/**
 * Today: up to five musicians you haven't connected with or passed on. People who
 * already reached out to you come first, then the most shared influences.
 */
export async function getToday(): Promise<Today> {
  const viewer = await getViewer();
  if (!viewer) return { people: MUSICIANS, incoming: [], demo: true };

  const connections = await myConnections(viewer);
  const incoming = connections.filter((c) => c.to_id === viewer.id && c.status === "pending").map((c) => c.from_id);
  const exclude = new Set(connections.flatMap((c) => [c.from_id, c.to_id]).filter((id) => !incoming.includes(id)));
  exclude.add(viewer.id);

  // discoverable_profiles: onboarded and active in the last 60 days; RLS hides blocked pairs.
  const { data } = await viewer.supabase
    .from("discoverable_profiles")
    .select(PROFILE_COLUMNS)
    .order("last_active_at", { ascending: false })
    .limit(200);
  const candidates = ((data ?? []) as ProfileRow[]).filter((r) => !exclude.has(r.id));
  const [people, { data: clips }] = await Promise.all([
    hydrate(viewer, candidates),
    viewer.supabase.from("clips").select("profile_id").eq("kind", "clip").in("profile_id", candidates.map((r) => r.id)),
  ]);
  // Hearing someone first matters, so profiles with a clip get a boost.
  const hasClip = new Set((clips ?? []).map((c) => c.profile_id as string));
  const score = (m: Musician) => m.shared.length + (hasClip.has(m.id) ? 2 : 0) + (m.sameCommitment ? 1 : 0);
  people.sort((a, b) => Number(incoming.includes(b.id)) - Number(incoming.includes(a.id)) || score(b) - score(a));
  return { people: withSamples(people, TODAY_SIZE), incoming, demo: false };
}

/** Everyone you can search, most recently active first. */
export async function getSearchable(): Promise<Musician[]> {
  const viewer = await getViewer();
  if (!viewer) return MUSICIANS;
  const { data } = await viewer.supabase
    .from("discoverable_profiles")
    .select(PROFILE_COLUMNS)
    .neq("id", viewer.id)
    .order("last_active_at", { ascending: false })
    .limit(200);
  return [...(await hydrate(viewer, (data ?? []) as ProfileRow[])), ...MUSICIANS];
}

export type ProfileView = { person: Musician; connection: ConnectionRow | null; viewerId: string | null; viewerPhoto: string | null };

/** One musician by username, plus where you stand with them. */
export async function getProfile(username: string): Promise<ProfileView | null> {
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
    const sample = findMusician(username);
    return sample ? { person: sample, connection: null, viewerId: viewer.id, viewerPhoto: viewer.profile?.avatar_url ?? null } : null;
  }
  const [person] = await hydrate(viewer, [data]);
  const connection = (await myConnections(viewer)).find((c) => c.from_id === data.id || c.to_id === data.id) ?? null;
  return { person, connection, viewerId: viewer.id, viewerPhoto: viewer.profile?.avatar_url ?? null };
}

/** `at` is an ISO timestamp, or preformatted text for sample threads. */
export type Thread = { username: string; person: Musician; preview: string; at: string; mine: boolean };

/** Your accepted connections, newest conversation first. */
export async function getThreads(): Promise<{ threads: Thread[]; demo: boolean }> {
  const viewer = await getViewer();
  if (!viewer) {
    return { demo: true, threads: SAMPLE_THREADS() };
  }
  const accepted = (await myConnections(viewer)).filter((c) => c.status === "accepted");
  if (!accepted.length) return { threads: SAMPLE_THREADS(), demo: false };

  const otherIds = accepted.map((c) => (c.from_id === viewer.id ? c.to_id : c.from_id));
  const [{ data: rows }, { data: messages }] = await Promise.all([
    viewer.supabase.from("profiles").select(PROFILE_COLUMNS).in("id", otherIds),
    viewer.supabase
      .from("messages")
      .select("connection_id, sender_id, body, voice_url, created_at")
      .in("connection_id", accepted.map((c) => c.id))
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const people = await hydrate(viewer, (rows ?? []) as ProfileRow[]);
  const threads = accepted.flatMap((c) => {
    const person = people.find((p) => p.id === (c.from_id === viewer.id ? c.to_id : c.from_id));
    if (!person) return [];
    const last = (messages ?? []).find((m) => m.connection_id === c.id);
    const at = last?.created_at ?? c.created_at;
    return [
      {
        username: person.username,
        person,
        preview: last ? (last.body ?? "Voice note") : `You're connected. Say hi to ${person.name}.`,
        at,
        mine: last?.sender_id === viewer.id,
      },
    ];
  });
  threads.sort((a, b) => b.at.localeCompare(a.at));
  return { threads: [...threads, ...SAMPLE_THREADS()], demo: false };
}

export type ChatMessage = { id: number; mine: boolean; body: string | null; voiceUrl: string | null; createdAt: string };

export type ChatView =
  | { kind: "demo"; person: Musician }
  | { kind: "live"; person: Musician; connectionId: number; messages: ChatMessage[] }
  | { kind: "not-connected"; person: Musician; connection: ConnectionRow | null; viewerId: string };

/** The conversation with one musician. Messages only exist inside an accepted connection. */
export async function getChat(username: string): Promise<ChatView | null> {
  const view = await getProfile(username);
  if (!view) return null;
  if (!view.viewerId || view.person.sample) return { kind: "demo", person: view.person };
  if (view.connection?.status !== "accepted") {
    return { kind: "not-connected", person: view.person, connection: view.connection, viewerId: view.viewerId };
  }
  const supabase = (await createClient())!;
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, voice_url, created_at")
    .eq("connection_id", view.connection.id)
    .order("created_at")
    .limit(500);
  return {
    kind: "live",
    person: view.person,
    connectionId: view.connection.id,
    messages: (data ?? []).map((m) => ({ id: m.id, mine: m.sender_id === view.viewerId, body: m.body, voiceUrl: m.voice_url, createdAt: m.created_at })),
  };
}
