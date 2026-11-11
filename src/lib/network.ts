import { cache } from "react";
import { MUSICIANS, findMusician, type Musician } from "./mock";
import { SHOW_SAMPLES, getMusicians, getViewer, myConnections } from "./people";

/**
 * Your network: who you're connected with, who you have in common with someone, and
 * people you may know through your bands and your connections. Connections stay private,
 * so the database works these out for the signed-in person (migration 20261111010000_network).
 */

export type Mutual = { username: string; name: string; photo: string | null };

export type Suggestion = {
  person: Pick<Musician, "id" | "username" | "name" | "photo" | "photoAlt" | "instrument" | "neighborhood" | "sample">;
  /** e.g. "Played with Maya in Low Tide Trio". */
  reason: string;
};

type MutualRow = { username: string; first_name: string; avatar_url: string | null };
type SuggestionRow = {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  main_instrument: string | null;
  neighborhood: string | null;
  reason: string;
};

/** Sample mutuals so profiles in demo mode show the row. */
const SAMPLE_MUTUALS: Record<string, string[]> = { eli: ["maya"], maya: ["eli"], jonah: ["eli", "maya"] };

function sampleMutuals(username: string): Mutual[] {
  return (SAMPLE_MUTUALS[username] ?? []).flatMap((u) => {
    const m = findMusician(u);
    return m ? [{ username: m.username, name: m.name.split(" ")[0], photo: m.photo }] : [];
  });
}

const SAMPLE_SUGGESTIONS = (): Suggestion[] => {
  const jonah = findMusician("jonah");
  return jonah ? [{ person: jonah, reason: "Played with Eli in Night Shift" }] : [];
};

/** People you and this musician are both connected with. Empty for yourself or on any hiccup. */
export async function getMutuals(person: Musician): Promise<Mutual[]> {
  if (person.sample) return SHOW_SAMPLES ? sampleMutuals(person.username) : [];
  const viewer = await getViewer();
  if (!viewer) return sampleMutuals(person.username);
  if (viewer.id === person.id) return [];
  const { data, error } = await viewer.supabase.rpc("mutual_connections", { p_other: person.id });
  if (error) return [];
  return ((data ?? []) as MutualRow[]).map((r) => ({ username: r.username, name: r.first_name, photo: r.avatar_url }));
}

export type Network = { connections: Musician[]; suggestions: Suggestion[]; demo: boolean };

/** Your connections (newest first) and up to 12 people you may know. */
export const getNetwork = cache(async (): Promise<Network> => {
  const viewer = await getViewer();
  if (!viewer) {
    return { demo: true, connections: MUSICIANS.filter((m) => m.username !== "jonah"), suggestions: SAMPLE_SUGGESTIONS() };
  }
  const accepted = (await myConnections(viewer))
    .filter((c) => c.status === "accepted")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ids = accepted.map((c) => (c.from_id === viewer.id ? c.to_id : c.from_id));
  const [connections, { data, error }] = await Promise.all([getMusicians(viewer, ids), viewer.supabase.rpc("people_you_may_know")]);
  const suggestions: Suggestion[] = error
    ? []
    : ((data ?? []) as SuggestionRow[]).map((r) => ({
        person: {
          id: r.id,
          username: r.username,
          name: r.first_name,
          photo: r.avatar_url,
          photoAlt: `${r.first_name}'s photo`,
          instrument: r.main_instrument ?? "Musician",
          neighborhood: r.neighborhood ?? "Nearby",
        },
        reason: r.reason,
      }));
  // While Mixstro is small, keep the shelf from looking empty.
  return { demo: false, connections, suggestions: suggestions.length || !SHOW_SAMPLES ? suggestions : SAMPLE_SUGGESTIONS() };
});
