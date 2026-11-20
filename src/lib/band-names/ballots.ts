import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { clean } from "./wordlists.ts";
import { safeBandName } from "./generate.ts";

/**
 * Band votes on mixstro.com: no sign-in. Each browser gets a random id in an httpOnly cookie.
 * It identifies the browser's vote, and the browser that made a vote can open new rounds
 * (the database keeps only a sha256 of the id). See supabase/migrations/20261120000000_band_name_votes.sql.
 */

export type Kind = "band" | "single" | "closer";
export type Ballot = {
  id: string;
  kind: Kind;
  options: string[];
  round: number;
  choice: number | null;
  organizer: boolean;
  counts: number[] | null;
  voters: number;
  history: { round: number; kind: Kind; options: string[]; counts: number[] }[];
};

export const QUESTION: Record<Kind, string> = {
  band: "Pick our band name",
  single: "Pick our next single",
  closer: "Pick our set closer",
};

const COOKIE = "mx_nb";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isBallotId = (id: string) => UUID.test(id);

function db() {
  if (!isSupabaseConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** This browser's id; made (and set as a cookie) when `create` is true. */
export async function voterId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const have = jar.get(COOKIE)?.value;
  if (have && UUID.test(have)) return have;
  if (!create) return null;
  const id = randomUUID();
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return id;
}

const hash = (id: string | null) => (id ? createHash("sha256").update(`mixstro-ballot:${id}`).digest("hex") : null);

/** Options a person typed or picked: band names pass the generator's filters, songs the word filter. */
export function validOptions(kind: Kind, options: unknown): string[] | null {
  if (!Array.isArray(options) || options.length !== 3) return null;
  const list = options.map((o) => (typeof o === "string" ? o.trim().replace(/\s+/g, " ") : ""));
  const ok = (s: string) => s.length >= 1 && s.length <= 80 && !/[\u0000-\u001f<>]/.test(s) && (kind === "band" ? safeBandName(s) : clean(s));
  if (!list.every(ok) || new Set(list.map((s) => s.toLowerCase())).size !== 3) return null;
  return list;
}

export async function getBallot(id: string): Promise<Ballot | null> {
  const client = db();
  if (!client || !isBallotId(id)) return null;
  const voter = await voterId(false);
  const { data } = await client.rpc("name_ballot_get", { p_id: id, p_voter: voter, p_organizer_hash: hash(voter) });
  return (data as Ballot | null) ?? null;
}

export async function createBallot(options: string[]): Promise<string | null> {
  const client = db();
  if (!client) return null;
  const voter = await voterId(true);
  const { data, error } = await client.rpc("name_ballot_create", { p_options: options, p_organizer_hash: hash(voter) });
  return error ? null : (data as string);
}

export async function castVote(id: string, round: number, choice: number): Promise<{ ballot?: Ballot; error?: string }> {
  const client = db();
  if (!client) return { error: "Voting isn't available right now." };
  const voter = await voterId(true);
  const { data, error } = await client.rpc("name_ballot_vote", { p_id: id, p_round: round, p_voter: voter, p_choice: choice });
  if (error) return { error: error.message.includes("stale round") ? "A new round has started. Refresh to see it." : "That vote didn't go through. Try again." };
  // The vote function can't see who organized it; read again for the full picture.
  return { ballot: (await getBallot(id)) ?? (data as Ballot) };
}

export async function newRound(id: string, round: number, kind: Kind, options: string[]): Promise<{ ballot?: Ballot; error?: string }> {
  const client = db();
  if (!client) return { error: "Voting isn't available right now." };
  const voter = await voterId(false);
  if (!voter) return { error: "Only the person who started this vote can open a new round." };
  const { data, error } = await client.rpc("name_ballot_round", { p_id: id, p_round: round, p_organizer_hash: hash(voter), p_kind: kind, p_options: options });
  if (error) {
    if (error.message.includes("not organizer")) return { error: "Only the person who started this vote can open a new round." };
    if (error.message.includes("stale round")) return { error: "Someone already opened a new round. Refresh." };
    return { error: "That didn't work. Try again." };
  }
  return { ballot: data as Ballot };
}

export async function countEvent(name: string) {
  const client = db();
  if (!client) return;
  await client.rpc("tool_event", { p_name: name }).then(() => {}, () => {});
}
