import type { SupabaseClient } from "@supabase/supabase-js";

/** A jam invite in a conversation (#7), plus the private "Did you jam?" check-in (#8). */
export type Jam = {
  id: number;
  mine: boolean;
  startsAt: string;
  place: string;
  note: string | null;
  status: "proposed" | "accepted" | "declined" | "replaced" | "cancelled";
  createdAt: string;
  /** Your own check-in answer, if you gave one. */
  played: boolean | null;
  /** Shown only once both answered: "played" or "not_played". "waiting" before that. */
  outcome: "waiting" | "played" | "not_played" | null;
};

/** The check-in opens a day after the jam time, like Hinge's "We Met". */
export const CHECKIN_AFTER_MS = 24 * 60 * 60 * 1000;

type JamRow = { id: number; proposed_by: string; starts_at: string; place: string; note: string | null; status: Jam["status"]; created_at: string };

/** Every jam in one conversation, oldest first. Empty if jams aren't set up in the database yet. */
export async function getJams(supabase: SupabaseClient, connectionId: number, viewerId: string): Promise<Jam[]> {
  const { data, error } = await supabase
    .from("jams")
    .select("id, proposed_by, starts_at, place, note, status, created_at")
    .eq("connection_id", connectionId)
    .order("created_at");
  if (error || !data?.length) return [];
  const rows = data as JamRow[];
  const accepted = rows.filter((r) => r.status === "accepted").map((r) => r.id);
  const [checkins, outcomes] = accepted.length
    ? await Promise.all([
        supabase.from("jam_checkins").select("jam_id, played").eq("profile_id", viewerId).in("jam_id", accepted),
        supabase.rpc("jam_outcomes", { conn: connectionId }),
      ])
    : [{ data: [] }, { data: [] }];
  const mine = new Map(((checkins.data ?? []) as { jam_id: number; played: boolean }[]).map((c) => [c.jam_id, c.played]));
  const result = new Map(((outcomes.data ?? []) as { jam_id: number; outcome: Jam["outcome"] }[]).map((o) => [o.jam_id, o.outcome]));
  return rows.map((r) => ({
    id: r.id,
    mine: r.proposed_by === viewerId,
    startsAt: r.starts_at,
    place: r.place,
    note: r.note,
    status: r.status,
    createdAt: r.created_at,
    played: mine.has(r.id) ? mine.get(r.id)! : null,
    outcome: r.status === "accepted" ? (result.get(r.id) ?? "waiting") : null,
  }));
}

/** Connections (by id) with a jam you still haven't checked in on. Feeds the "Did you jam?" nudge in Messages. */
export async function pendingCheckins(supabase: SupabaseClient, connectionIds: number[], viewerId: string): Promise<Set<number>> {
  if (!connectionIds.length) return new Set();
  const { data, error } = await supabase
    .from("jams")
    .select("id, connection_id")
    .in("connection_id", connectionIds)
    .eq("status", "accepted")
    .lt("starts_at", new Date(Date.now() - CHECKIN_AFTER_MS).toISOString());
  if (error || !data?.length) return new Set();
  const { data: done } = await supabase.from("jam_checkins").select("jam_id").eq("profile_id", viewerId).in("jam_id", data.map((j) => j.id));
  const answered = new Set((done ?? []).map((d) => d.jam_id as number));
  return new Set(data.filter((j) => !answered.has(j.id)).map((j) => j.connection_id as number));
}
