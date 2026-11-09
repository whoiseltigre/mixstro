import { adminClient, notifyJamSoon, notifyRoleAlert, notifyYourTurn } from "./notify";

/**
 * The scheduled job (every 15 minutes, from Supabase pg_cron → /api/cron/reminders).
 * Each part is safe to run again: notify() skips anything already sent (notification_log).
 */

const HOUR = 3600_000;
/** Same suggestion the app makes when you haven't picked roles but are starting a band (src/lib/people.ts). */
const DEFAULT_ALERT_ROLES = ["Drums", "Bass"];

export async function runReminders() {
  const db = adminClient();
  if (!db) return { skipped: "no service role key" };
  const [yourTurn, jams, alerts] = await Promise.all([
    yourTurnNudges().catch((e) => (console.error("reminders: your turn", e), -1)),
    jamReminders().catch((e) => (console.error("reminders: jams", e), -1)),
    roleAlerts().catch((e) => (console.error("reminders: role alerts", e), -1)),
  ]);
  return { yourTurn, jams, alerts };
}

/** Last message in an accepted chat, from the other person, sent 48 to 72 hours ago and still unanswered. */
async function yourTurnNudges() {
  const db = adminClient()!;
  const now = Date.now();
  const { data: recent } = await db
    .from("messages")
    .select("connection_id")
    .gte("created_at", new Date(now - 72 * HOUR).toISOString())
    .lte("created_at", new Date(now - 48 * HOUR).toISOString())
    .limit(500);
  const ids = [...new Set(((recent ?? []) as { connection_id: number }[]).map((m) => m.connection_id))];
  if (!ids.length) return 0;
  const [{ data: msgs }, { data: conns }] = await Promise.all([
    db.from("messages").select("id, connection_id, sender_id, body, created_at").in("connection_id", ids).gte("created_at", new Date(now - 72 * HOUR).toISOString()).order("created_at", { ascending: false }),
    db.from("connections").select("id").in("id", ids).eq("status", "accepted"),
  ]);
  const accepted = new Set(((conns ?? []) as { id: number }[]).map((c) => c.id));
  const latest = new Map<number, { id: number; sender_id: string; body: string | null; created_at: string }>();
  for (const m of (msgs ?? []) as { id: number; connection_id: number; sender_id: string; body: string | null; created_at: string }[]) {
    if (!latest.has(m.connection_id)) latest.set(m.connection_id, m);
  }
  let sent = 0;
  for (const [connectionId, m] of latest) {
    if (!accepted.has(connectionId)) continue;
    if (Date.parse(m.created_at) > now - 48 * HOUR) continue; // answered, or a newer message since
    await notifyYourTurn(connectionId, m.id, m.sender_id, m.body);
    sent++;
  }
  return sent;
}

/** Accepted jams starting in the next 1h45m to 3h: remind both players. */
async function jamReminders() {
  const db = adminClient()!;
  const now = Date.now();
  const { data } = await db
    .from("jams")
    .select("id, connection_id, starts_at, place, connections(from_id, to_id)")
    .eq("status", "accepted")
    .gte("starts_at", new Date(now + 1.75 * HOUR).toISOString())
    .lte("starts_at", new Date(now + 3 * HOUR).toISOString());
  const jams = (data ?? []) as unknown as { id: number; starts_at: string; place: string; connections: { from_id: string; to_id: string } | null }[];
  for (const j of jams) {
    if (!j.connections) continue;
    const { from_id, to_id } = j.connections;
    await Promise.all([notifyJamSoon(j.id, from_id, to_id, j.starts_at, j.place), notifyJamSoon(j.id, to_id, from_id, j.starts_at, j.place)]);
  }
  return jams.length;
}

type Joiner = { id: string; instruments: string[]; genres: string[]; onboarded_at: string };
type Listener = { id: string; alert_roles: string[] | null; goals: string[]; genres: string[]; radius_mi: number | null };

/**
 * #12 role alerts: someone who joined in the last 24 hours plays a role you want, is within
 * your radius, and shares an influence or genre. At most one alert a day per person.
 */
async function roleAlerts() {
  const db = adminClient()!;
  const now = Date.now();
  const { data: j } = await db
    .from("profiles")
    .select("id, instruments, genres, onboarded_at")
    .gte("onboarded_at", new Date(now - 24 * HOUR).toISOString())
    .order("onboarded_at", { ascending: false })
    .limit(200);
  const joiners = (j ?? []) as Joiner[];
  if (!joiners.length) return 0;
  const roles = [...new Set(joiners.flatMap((x) => x.instruments))];

  // Everyone who wants to hear about one of those roles (picked, or the starting-a-band default).
  const [{ data: picked }, { data: defaults }] = await Promise.all([
    db.from("profiles").select("id, alert_roles, goals, genres, radius_mi").not("onboarded_at", "is", null).overlaps("alert_roles", roles).limit(2000),
    roles.some((r) => DEFAULT_ALERT_ROLES.includes(r))
      ? db.from("profiles").select("id, alert_roles, goals, genres, radius_mi").not("onboarded_at", "is", null).is("alert_roles", null).contains("goals", ["start_project"]).limit(2000)
      : Promise.resolve({ data: [] }),
  ]);
  const listeners = [...((picked ?? []) as Listener[]), ...((defaults ?? []) as Listener[])];
  if (!listeners.length) return 0;

  const everyone = [...new Set([...listeners.map((l) => l.id), ...joiners.map((x) => x.id)])];
  const [{ data: locs }, { data: infl }, { data: lastSent }] = await Promise.all([
    db.from("profile_locations").select("profile_id, lat, lng").in("profile_id", everyone),
    db.from("influences").select("profile_id, artist_id, artist_name, rank").in("profile_id", everyone).order("rank"),
    db.from("notification_log").select("recipient_id, sent_at").eq("type", "alerts").in("recipient_id", listeners.map((l) => l.id)).gte("sent_at", new Date(now - 24 * HOUR).toISOString()),
  ]);
  const at = new Map(((locs ?? []) as { profile_id: string; lat: number; lng: number }[]).map((l) => [l.profile_id, l]));
  const influences = new Map<string, { id: string; name: string }[]>();
  for (const r of (infl ?? []) as { profile_id: string; artist_id: string; artist_name: string }[]) {
    influences.set(r.profile_id, [...(influences.get(r.profile_id) ?? []), { id: r.artist_id, name: r.artist_name }]);
  }
  const alertedToday = new Set(((lastSent ?? []) as { recipient_id: string }[]).map((r) => r.recipient_id));

  let sent = 0;
  for (const l of listeners) {
    if (alertedToday.has(l.id)) continue;
    const here = at.get(l.id);
    if (!here) continue;
    const wanted = l.alert_roles ?? DEFAULT_ALERT_ROLES;
    const mine = new Set((influences.get(l.id) ?? []).map((a) => a.id));
    const myGenres = new Set(l.genres);
    for (const x of joiners) {
      if (x.id === l.id) continue;
      const role = x.instruments.find((i) => wanted.includes(i));
      const there = at.get(x.id);
      if (!role || !there) continue;
      const miles = distanceMi(here, there);
      if (miles > (l.radius_mi ?? 25)) continue;
      const shared = (influences.get(x.id) ?? []).find((a) => mine.has(a.id));
      const genre = x.genres.find((g) => myGenres.has(g));
      if (!shared && !genre) continue;
      if (await knowEachOther(l.id, x.id)) continue;
      await notifyRoleAlert(l.id, x.id, role, shared ? `into ${shared.name}` : `into ${genre!.toLowerCase()}`, miles);
      sent++;
      break; // one a day
    }
  }
  return sent;
}

/** Already connected (any state), or either one blocked the other. */
async function knowEachOther(a: string, b: string) {
  const db = adminClient()!;
  const pair = `and(from_id.eq.${a},to_id.eq.${b}),and(from_id.eq.${b},to_id.eq.${a})`;
  const blockPair = `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`;
  const [{ count: c }, { count: bl }] = await Promise.all([
    db.from("connections").select("id", { count: "exact", head: true }).or(pair),
    db.from("blocks").select("blocker_id", { count: "exact", head: true }).or(blockPair),
  ]);
  return Boolean(c || bl);
}

function distanceMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}
