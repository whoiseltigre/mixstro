import { getBandPage, sampleBands, type BandPage } from "./band-page";
import { SHOW_SAMPLES, getViewer } from "./people";

/**
 * The member side of bands: Your band (/bands/<id>), the band chat (/messages/b/<id>),
 * your bands in Messages, and every band for Search. Demo mode shows Night Shift as if
 * you were Eli, so the screens can be seen without an account.
 */

export type MyBand = {
  id: string;
  name: string;
  photo?: string;
  members: number;
  unread: number;
  /** "Maya: soundcheck at 7?", or what the band's last update was. */
  preview: string;
  at?: string;
};

type MyBandRow = {
  band_id: number;
  name: string;
  photo_url: string | null;
  members: number;
  unread: number;
  last_kind: string | null;
  last_body: string | null;
  last_sender: string | null;
  last_mine: boolean | null;
  last_at: string | null;
};

function previewOf(r: Pick<MyBandRow, "last_kind" | "last_body" | "last_sender" | "last_mine">) {
  const who = r.last_mine ? "You" : (r.last_sender ?? "Someone");
  switch (r.last_kind) {
    case "text":
      return `${who}: ${r.last_body ?? ""}`;
    case "voice":
      return `${who}: Voice note`;
    case "note":
      return `${who} wrote to the band`;
    case "spot_reply":
      return `${who} asked about ${r.last_body ?? "your open spot"}`;
    case "show":
      return `New show: ${r.last_body ?? ""}`;
    case "joined":
      return `${who} confirmed their spot`;
    default:
      return "Say hi to the band";
  }
}

const DEMO_MINE: MyBand = { id: "night-shift", name: "Night Shift", photo: "/photos/rock-red.jpg", members: 2, unread: 2, preview: "Maya: Love it. Soundcheck at 7?", at: new Date(Date.now() - 12 * 60_000).toISOString() };

/** Bands you play in now, newest chat first. */
export async function getMyBands(): Promise<MyBand[]> {
  const viewer = await getViewer();
  if (!viewer) return SHOW_SAMPLES ? [DEMO_MINE] : [];
  const { data, error } = await viewer.supabase.rpc("my_bands");
  if (error || !data) return [];
  return (data as MyBandRow[]).map((r) => ({
    id: String(r.band_id),
    name: r.name,
    photo: r.photo_url ?? undefined,
    members: r.members,
    unread: r.unread,
    preview: previewOf(r),
    at: r.last_at ?? undefined,
  }));
}

export type BillToConfirm = { showId: string; fromBand: string; fromName: string; date: string; venue: string };

export type BandHub = {
  band: BandPage;
  /** Your project in the band, for "Invite a bandmate". */
  projectId: string | null;
  bills: BillToConfirm[];
  chat: MyBand | null;
  demo: boolean;
};

/** Your band, for members only. Null when you're not in it (or it doesn't exist). */
export async function getBandHub(id: string): Promise<BandHub | null> {
  const viewer = await getViewer();
  if (!viewer) {
    const band = sampleBands().find((b) => b.id === id);
    if (!band || id !== "night-shift") return null;
    return {
      band: { ...band, isMember: true },
      projectId: null,
      bills: [{ showId: "x", fromBand: "low-tide-trio", fromName: "Low Tide Trio", date: band.shows[1]?.date ?? band.shows[0].date, venue: "Zebulon" }],
      chat: DEMO_MINE,
      demo: true,
    };
  }
  const band = await getBandPage(id);
  if (!band || !band.isMember) return null;
  const n = Number(id);
  const [{ data: mine }, { data: bills }, myBands] = await Promise.all([
    viewer.supabase.from("band_members").select("project_id").eq("band_id", n).eq("profile_id", viewer.id).maybeSingle<{ project_id: number }>(),
    viewer.supabase.rpc("band_bills_to_confirm", { p_band: n }),
    getMyBands(),
  ]);
  type Bill = { show_id: number; from_band: number; from_name: string; show_date: string; venue: string };
  return {
    band,
    projectId: mine ? String(mine.project_id) : null,
    bills: ((bills ?? []) as Bill[]).map((b) => ({ showId: String(b.show_id), fromBand: String(b.from_band), fromName: b.from_name, date: b.show_date, venue: b.venue })),
    chat: myBands.find((b) => b.id === id) ?? null,
    demo: false,
  };
}

export type BandChatMessage = {
  id: number;
  kind: "text" | "voice" | "note" | "spot_reply" | "show" | "joined";
  mine: boolean;
  sender?: { username: string; name: string; photo: string | null; instrument: string };
  body: string | null;
  voiceUrl: string | null;
  voiceSeconds?: number | null;
  refId?: number | null;
  createdAt: string;
};

export type BandChat = {
  band: { id: string; name: string; photo?: string };
  members: { username: string; name: string; photo: string | null }[];
  messages: BandChatMessage[];
  /** The next show, pinned at the top. */
  nextShow?: { date: string; time?: string; venue: string };
  demo: boolean;
};

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

/** The band chat, for current members. Opening it marks it read. */
export async function getBandChat(id: string): Promise<BandChat | null> {
  const viewer = await getViewer();
  if (!viewer) {
    if (id !== "night-shift") return null;
    const band = sampleBands()[0];
    const maya = { username: "maya", name: "Maya", photo: "/photos/bass-blue.jpg", instrument: "Bass" };
    const rafa = { username: "jonah", name: "Rafa", photo: "/photos/acoustic-amber.jpg", instrument: "Drums" };
    return {
      band: { id, name: band.name, photo: band.photo },
      members: [{ username: "maya", name: "Maya", photo: maya.photo }],
      nextShow: band.shows[0],
      demo: true,
      messages: [
        { id: 1, kind: "show", mine: false, body: "The Echo", voiceUrl: null, createdAt: ago(60 * 26) },
        { id: 2, kind: "text", mine: true, body: "New ending for Low Ceilings, tell me if it's too long", voiceUrl: null, createdAt: ago(60 * 3) },
        { id: 4, kind: "text", mine: false, sender: maya, body: "Love it. Soundcheck at 7?", voiceUrl: null, createdAt: ago(40) },
        { id: 5, kind: "text", mine: true, body: "7 works. Still need a drummer for December though", voiceUrl: null, createdAt: ago(30) },
        { id: 6, kind: "spot_reply", mine: false, sender: rafa, body: "Drums", voiceUrl: null, refId: null, createdAt: ago(12) },
      ],
    };
  }
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  const { data: isMember } = await viewer.supabase.rpc("is_band_member", { p_band: n });
  if (!isMember) return null;
  const [{ data: band }, { data: rows }, { data: memberRows }, { data: shows }] = await Promise.all([
    viewer.supabase.from("bands").select("id, name, photo_url").eq("id", n).maybeSingle<{ id: number; name: string; photo_url: string | null }>(),
    viewer.supabase.from("band_messages").select("id, kind, sender_id, body, voice_url, voice_seconds, ref_id, created_at").eq("band_id", n).order("created_at", { ascending: false }).limit(300),
    viewer.supabase.from("band_members").select("profile_id, projects(end_year)").eq("band_id", n),
    viewer.supabase.from("band_shows").select("show_date, show_time, venue").eq("band_id", n).gte("show_date", new Date().toISOString().slice(0, 10)).order("show_date").limit(1),
    viewer.supabase.rpc("mark_band_read", { p_band: n }),
  ]);
  if (!band) return null;
  type Msg = { id: number; kind: BandChatMessage["kind"]; sender_id: string | null; body: string | null; voice_url: string | null; voice_seconds: number | null; ref_id: number | null; created_at: string };
  const list = ((rows ?? []) as Msg[]).reverse();
  const current = ((memberRows ?? []) as unknown as { profile_id: string; projects: { end_year: number | null } | null }[])
    .filter((m) => m.projects?.end_year === null)
    .map((m) => m.profile_id);
  const ids = [...new Set([...current, ...list.flatMap((m) => (m.sender_id ? [m.sender_id] : []))])];
  const { data: people } = await viewer.supabase.from("profiles").select("id, username, first_name, avatar_url, main_instrument, instruments").in("id", ids);
  type P = { id: string; username: string; first_name: string; avatar_url: string | null; main_instrument: string | null; instruments: string[] };
  const byId = new Map(((people ?? []) as P[]).map((p) => [p.id, p]));
  const paths = list.flatMap((m) => (m.voice_url ? [m.voice_url] : []));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: links } = await viewer.supabase.storage.from("voice").createSignedUrls(paths, 60 * 60 * 6);
    for (const l of links ?? []) if (l.path && l.signedUrl) signed.set(l.path, l.signedUrl);
  }
  const show = (shows ?? [])[0] as { show_date: string; show_time: string | null; venue: string } | undefined;
  return {
    band: { id, name: band.name, photo: band.photo_url ?? undefined },
    members: current.filter((p) => p !== viewer.id).flatMap((p) => {
      const r = byId.get(p);
      return r ? [{ username: r.username, name: r.first_name, photo: r.avatar_url }] : [];
    }),
    nextShow: show ? { date: show.show_date, time: show.show_time ?? undefined, venue: show.venue } : undefined,
    demo: false,
    messages: list.map((m) => {
      const s = m.sender_id ? byId.get(m.sender_id) : undefined;
      return {
        id: m.id,
        kind: m.kind,
        mine: m.sender_id === viewer.id,
        sender: s ? { username: s.username, name: s.first_name, photo: s.avatar_url, instrument: s.main_instrument ?? s.instruments[0] ?? "Musician" } : undefined,
        body: m.body,
        voiceUrl: m.voice_url ? (signed.get(m.voice_url) ?? null) : null,
        voiceSeconds: m.voice_seconds,
        refId: m.ref_id,
        createdAt: m.created_at,
      };
    }),
  };
}

export type BandCard = {
  id: string;
  name: string;
  photo?: string;
  city?: string;
  genres: string[];
  status: string;
  members: number;
  openRoles: string[];
  spotId?: string;
  miles?: number;
  sample?: boolean;
};

/** Every band with someone on Mixstro (and the samples while Mixstro is small). */
export async function getBands(): Promise<BandCard[]> {
  const samples: BandCard[] = SHOW_SAMPLES
    ? sampleBands().map((b) => ({
        id: b.id,
        name: b.name,
        photo: b.photo,
        city: b.city,
        genres: b.genres,
        status: b.status,
        members: b.members.filter((m) => m.endYear === undefined).length,
        openRoles: b.spots.flatMap((s) => (s.role ? [s.role] : [])),
        spotId: b.spots[0]?.id,
        miles: b.id === "night-shift" ? 2 : 4,
        sample: true,
      }))
    : [];
  const viewer = await getViewer();
  if (!viewer) return samples;
  // Sample bands are in Los Angeles; for a real musician don't pretend they're a few miles away.
  for (const b of samples) b.miles = undefined;
  const { data, error } = await viewer.supabase.rpc("browse_bands");
  if (error || !data) return samples;
  type R = { band_id: number; name: string; photo_url: string | null; city: string | null; genres: string[]; status: string; members: number; open_roles: string[]; open_spot_id: number | null; miles: number | null };
  const real = (data as R[]).map((r) => ({
    id: String(r.band_id),
    name: r.name,
    photo: r.photo_url ?? undefined,
    city: r.city ?? undefined,
    genres: r.genres ?? [],
    status: r.status,
    members: r.members,
    openRoles: r.open_roles ?? [],
    spotId: r.open_spot_id ? String(r.open_spot_id) : undefined,
    miles: r.miles ?? undefined,
  }));
  return [...real, ...samples];
}
