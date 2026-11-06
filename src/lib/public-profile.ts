import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { findMusician, type Musician } from "./mock";
import { LOOKING_FOR } from "./people";
import { playedWith, withBandmates } from "./bands";
import { SAMPLE_PROJECTS, fromRow, sortProjects, type Project, type ProjectRow } from "./projects";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./supabase/config";

/**
 * A music page anyone can open, signed in or not: what the share loop links to.
 * Reads go through public.public_profile(), which returns only public fields and
 * nothing for someone who turned their page off. Demo mode uses the sample musicians.
 */

export const APP_ORIGIN = (process.env.APP_URL || "https://app.mixstro.com").replace(/\/$/, "");

/** The link people share: app.mixstro.com/@name. */
export const pageUrl = (username: string) => `${APP_ORIGIN}/@${username}`;

export type PublicPage = { person: Musician; projects: Project[]; instruments: string[] };

type Row = {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  instruments: string[];
  main_instrument: string | null;
  genres: string[];
  goals: string[];
  neighborhood: string | null;
  verified: boolean;
  influences: { id: string; name: string; image: string | null }[];
  projects: ProjectRow[];
};

const anon = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export const getPublicPage = cache(async (username: string): Promise<PublicPage | null> => {
  const name = decodeURIComponent(username).replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_.]{3,24}$/.test(name)) return null;

  if (!isSupabaseConfigured) {
    const person = findMusician(name);
    return person ? { person, projects: SAMPLE_PROJECTS[name] ?? [], instruments: [person.instrument] } : null;
  }

  const db = anon();
  const { data, error } = await db.rpc("public_profile", { p_username: name });
  if (error || !data) return null;
  const r = data as Row;
  const mates = await playedWith(db, r.id);
  const instrument = r.main_instrument ?? r.instruments[0] ?? "Musician";
  const influences = r.influences.map((a) => ({ id: a.id, name: a.name, image: a.image ?? undefined }));
  const person: Musician = {
    id: r.id,
    username: r.username,
    name: r.first_name,
    instrument,
    genres: r.genres.slice(0, 2).join(", ") || "Open to anything",
    neighborhood: r.neighborhood ?? "",
    photo: r.avatar_url,
    photoAlt: `${r.first_name}'s photo`,
    influences,
    shared: [],
    commitment: "",
    verified: r.verified,
    lookingFor: LOOKING_FOR[r.goals[0]] ?? "Open to collaborating",
    instruments: r.instruments,
    genreList: r.genres,
    goals: r.goals,
    bands: [],
  };
  return { person, projects: withBandmates(sortProjects(r.projects.map(fromRow)), mates), instruments: r.instruments.length ? r.instruments : [instrument] };
});

/** "Guitar and vocals", "Guitar, bass and keys". */
export function plays(list: string[]) {
  const l = list.map((x, i) => (i ? x.toLowerCase() : x));
  return l.length < 2 ? (l[0] ?? "Musician") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`;
}
