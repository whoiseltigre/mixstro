import { MUSICIANS, THREADS, findMusician, type Musician } from "./mock";
import { COMMITMENT, type Artist } from "./onboarding";
import { distancesFromMe, ensureLocation } from "./geo";
import { getJams, pendingCheckins, type Jam } from "./jams";
import { createClient } from "./supabase/server";

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
const SAMPLES = (): Musician[] => (SHOW_SAMPLES ? MUSICIANS : []);

function withSamples(people: Musician[], size: number) {
  return [...people, ...SAMPLES()].slice(0, size);
}

const SAMPLE_THREADS = (): Thread[] =>
  SHOW_SAMPLES ? THREADS.map((t) => ({ username: t.with, person: findMusician(t.with)!, preview: t.preview, at: t.time, mine: !t.unread, yourTurn: t.unread })) : [];

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

export type ConnectionRow = { id: number; from_id: string; to_id: string; status: "pending" | "accepted" | "passed" | "declined"; created_at: string };

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
    instruments: row.instruments,
    genreList: row.genres,
    goals: row.goals,
    bands: [],
  };
}

async function hydrate(viewer: Viewer, rows: ProfileRow[]): Promise<Musician[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [{ data }, miles] = await Promise.all([
    viewer.supabase.from("influences").select("profile_id, artist_id, artist_name, image_url, rank").in("profile_id", ids),
    distancesFromMe(viewer.supabase, ids),
  ]);
  return rows.map((r) => ({ ...toMusician(r, (data ?? []) as InfluenceRow[], viewer), distanceMi: miles.get(r.id) }));
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

/** People within your radius. Anyone without a known distance yet stays in. */
const withinRadius = (viewer: Viewer) => (m: Musician) => m.distanceMi === undefined || m.distanceMi <= (viewer.profile?.radius_mi ?? 25);

/** Every connection row you're part of, in either direction. */
async function myConnections(viewer: Viewer): Promise<ConnectionRow[]> {
  const { data } = await viewer.supabase
    .from("connections")
    .select("id, from_id, to_id, status, created_at")
    .or(`from_id.eq.${viewer.id},to_id.eq.${viewer.id}`);
  return (data ?? []) as ConnectionRow[];
}

/** Past this many chats waiting on you, Today pauses until you answer some (#4). */
export const YOUR_TURN_LIMIT = 8;

/** How many accepted conversations end with a message from the other person. */
async function yourTurnCount(viewer: Viewer, connections: ConnectionRow[]) {
  const accepted = connections.filter((c) => c.status === "accepted").map((c) => c.id);
  if (accepted.length < YOUR_TURN_LIMIT) return 0;
  const { data } = await viewer.supabase
    .from("messages")
    .select("connection_id, sender_id")
    .in("connection_id", accepted)
    .order("created_at", { ascending: false })
    .limit(1000);
  const last = new Map<number, string>();
  for (const m of (data ?? []) as { connection_id: number; sender_id: string }[]) if (!last.has(m.connection_id)) last.set(m.connection_id, m.sender_id);
  return [...last.values()].filter((sender) => sender !== viewer.id).length;
}

export type Today = {
  /** Chats waiting on you; Today pauses at YOUR_TURN_LIMIT. */
  yourTurn: number;
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
  if (!viewer) return { people: MUSICIANS, incoming: [], demo: true, yourTurn: 0 };

  const [connections] = await Promise.all([myConnections(viewer), locate(viewer)]);
  const incoming = connections.filter((c) => c.to_id === viewer.id && c.status === "pending" && !isExpired(c.created_at)).map((c) => c.from_id);
  const exclude = new Set(connections.flatMap((c) => [c.from_id, c.to_id]).filter((id) => !incoming.includes(id)));
  exclude.add(viewer.id);

  // discoverable_profiles: onboarded and active in the last 60 days; RLS hides blocked pairs.
  const { data } = await viewer.supabase
    .from("discoverable_profiles")
    .select(PROFILE_COLUMNS)
    .order("last_active_at", { ascending: false })
    .limit(200);
  const candidates = ((data ?? []) as ProfileRow[]).filter((r) => !exclude.has(r.id));
  const [nearby, { data: clips }] = await Promise.all([
    hydrate(viewer, candidates),
    viewer.supabase.from("clips").select("profile_id").eq("kind", "clip").in("profile_id", candidates.map((r) => r.id)),
  ]);
  // Hearing someone first matters, so profiles with a clip get a boost.
  const hasClip = new Set((clips ?? []).map((c) => c.profile_id as string));
  // Someone who already asked to play with you shows up even if they're a bit further out.
  const people = nearby.filter((m) => incoming.includes(m.id) || withinRadius(viewer)(m));
  const score = (m: Musician) => m.shared.length + (hasClip.has(m.id) ? 2 : 0) + (m.sameCommitment ? 1 : 0);
  // Ties go to whoever is closer.
  const near = (m: Musician) => m.distanceMi ?? Infinity;
  people.sort((a, b) => Number(incoming.includes(b.id)) - Number(incoming.includes(a.id)) || score(b) - score(a) || near(a) - near(b));
  return { people: withSamples(people, TODAY_SIZE), incoming, demo: false, yourTurn: await yourTurnCount(viewer, connections) };
}

/** Everyone you can search, most recently active first. */
export async function getSearchable(): Promise<Musician[]> {
  const viewer = await getViewer();
  if (!viewer) return MUSICIANS;
  await locate(viewer);
  const { data } = await viewer.supabase
    .from("discoverable_profiles")
    .select(PROFILE_COLUMNS)
    .neq("id", viewer.id)
    .order("last_active_at", { ascending: false })
    .limit(200);
  return [...(await hydrate(viewer, (data ?? []) as ProfileRow[])), ...SAMPLES()];
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
    const sample = SHOW_SAMPLES ? findMusician(username) : undefined;
    return sample ? { person: sample, connection: null, viewerId: viewer.id, viewerPhoto: viewer.profile?.avatar_url ?? null } : null;
  }
  const [person] = await hydrate(viewer, [data]);
  const connection = (await myConnections(viewer)).find((c) => c.from_id === data.id || c.to_id === data.id) ?? null;
  return { person, connection, viewerId: viewer.id, viewerPhoto: viewer.profile?.avatar_url ?? null };
}

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
  const [people, checkins] = await Promise.all([
    hydrate(viewer, (rows ?? []) as ProfileRow[]),
    pendingCheckins(viewer.supabase, accepted.map((c) => c.id), viewer.id),
  ]);
  const threads = accepted.flatMap((c) => {
    const person = people.find((p) => p.id === (c.from_id === viewer.id ? c.to_id : c.from_id));
    if (!person) return [];
    const last = (messages ?? []).find((m) => m.connection_id === c.id);
    const at = last?.created_at ?? c.created_at;
    return [
      {
        username: person.username,
        person,
        preview: checkins.has(c.id)
          ? `Did you end up playing with ${person.name}?`
          : last
            ? (last.body ?? "Voice note")
            : `You're connected. Say hi to ${person.name}.`,
        at,
        mine: checkins.has(c.id) ? false : last?.sender_id === viewer.id,
        checkin: checkins.has(c.id),
        yourTurn: checkins.has(c.id) || (Boolean(last) && last!.sender_id !== viewer.id),
      },
    ];
  });
  threads.sort((a, b) => b.at.localeCompare(a.at));
  return { threads: [...threads, ...SAMPLE_THREADS()], demo: false };
}

/** `voiceUrl` is a short-lived signed link to the recording in the private "voice" bucket. */
export type ChatMessage = { id: number; mine: boolean; body: string | null; voiceUrl: string | null; voiceSeconds?: number | null; createdAt: string };

export type ChatView =
  | { kind: "demo"; person: Musician }
  | { kind: "live"; person: Musician; connectionId: number; messages: ChatMessage[]; jams: Jam[] }
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
  // "*" so the chat still loads before newer columns (voice_seconds) exist.
  const { data } = await supabase.from("messages").select("*").eq("connection_id", view.connection.id).order("created_at").limit(500);
  const jams = await getJams(supabase, view.connection.id, view.viewerId);
  const rows = (data ?? []) as { id: number; sender_id: string; body: string | null; voice_url: string | null; voice_seconds?: number | null; created_at: string }[];
  const paths = rows.flatMap((m) => (m.voice_url ? [m.voice_url] : []));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: links } = await supabase.storage.from("voice").createSignedUrls(paths, 60 * 60 * 6);
    for (const l of links ?? []) if (l.path && l.signedUrl) signed.set(l.path, l.signedUrl);
  }
  return {
    kind: "live",
    person: view.person,
    connectionId: view.connection.id,
    jams,
    messages: rows.map((m) => ({
      id: m.id,
      mine: m.sender_id === view.viewerId,
      body: m.body,
      voiceUrl: m.voice_url ? (signed.get(m.voice_url) ?? null) : null,
      voiceSeconds: m.voice_seconds ?? null,
      createdAt: m.created_at,
    })),
  };
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
      .overlaps("instruments", roles)
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
    const role = row.instruments.find((i) => roles.includes(i)) ?? m.instrument;
    const why = m.shared.length ? `into ${m.shared[0].name}` : `into ${genre!.toLowerCase()}`;
    return { person: m, role, why };
  }
  return null;
}
