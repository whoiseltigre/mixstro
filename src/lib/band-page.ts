import { cache } from "react";
import { SAMPLE_PROJECTS, type Track } from "./projects";
import { createClient } from "./supabase/server";

/**
 * A band's page (/b/<id>): everyone who confirmed they played in it, with their role and
 * years, and every track they linked to it. Readable signed out through public.public_band().
 * Demo mode builds one from the sample musicians.
 */

export type BandMember = {
  username: string;
  name: string;
  photo: string | null;
  instrument: string;
  neighborhood: string;
  verified: boolean;
  role?: string;
  startYear: number;
  endYear?: number;
};

export type BandPage = {
  id: string;
  name: string;
  members: BandMember[];
  tracks: (Track & { by: string })[];
  startYear: number;
  /** Undefined while anyone still plays in it. */
  endYear?: number;
};

type Row = {
  id: number;
  name: string;
  members: {
    username: string;
    first_name: string;
    avatar_url: string | null;
    main_instrument: string | null;
    instruments: string[];
    neighborhood: string | null;
    verified: boolean;
    role: string | null;
    start_year: number;
    end_year: number | null;
  }[];
  tracks: { id: number; provider: Track["provider"]; url: string; title: string | null; thumb_url: string | null; by: string }[];
};

export const getBandPage = cache(async (raw: string): Promise<BandPage | null> => {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) return demoBand(raw);
  const supabase = await createClient();
  if (!supabase) return demoBand(raw);
  const { data, error } = await supabase.rpc("public_band", { p_id: id });
  if (error || !data) return null;
  const r = data as Row;
  const members: BandMember[] = r.members.map((m) => ({
    username: m.username,
    name: m.first_name,
    photo: m.avatar_url,
    instrument: m.main_instrument ?? m.instruments[0] ?? "Musician",
    neighborhood: m.neighborhood ?? "",
    verified: m.verified,
    role: m.role ?? undefined,
    startYear: m.start_year,
    endYear: m.end_year ?? undefined,
  }));
  // Bandmates often link the same song: keep each link once.
  const seen = new Set<string>();
  const tracks = r.tracks.flatMap((t) => {
    if (seen.has(t.url)) return [];
    seen.add(t.url);
    return [{ id: String(t.id), provider: t.provider, url: t.url, title: t.title ?? undefined, thumb: t.thumb_url ?? undefined, by: t.by }];
  });
  return { id: String(r.id), name: r.name, members, tracks, ...span(members) };
});

function span(members: BandMember[]) {
  const startYear = Math.min(...members.map((m) => m.startYear));
  const endYear = members.some((m) => m.endYear === undefined) ? undefined : Math.max(...members.map((m) => m.endYear!));
  return { startYear, endYear };
}

/** "2019 to now", "2012 to 2014" or "2016". */
export function bandYears(b: Pick<BandPage, "startYear" | "endYear">) {
  if (b.endYear === undefined) return `${b.startYear} to now`;
  return b.endYear === b.startYear ? `${b.startYear}` : `${b.startYear} to ${b.endYear}`;
}

/** Sample band for demo mode: Eli and Maya's Night Shift (/b/night-shift). */
function demoBand(raw: string): BandPage | null {
  if (raw !== "night-shift") return null;
  const p = SAMPLE_PROJECTS.eli[0];
  const members: BandMember[] = [
    { username: "eli", name: "Eli", photo: "/photos/eli-stage.jpg", instrument: "Guitar", neighborhood: "Echo Park", verified: true, role: "Guitar, vocals", startYear: 2022 },
    { username: "maya", name: "Maya", photo: "/photos/bass-blue.jpg", instrument: "Bass", neighborhood: "Silver Lake", verified: true, role: "Bass, backing vocals", startYear: 2022 },
    { username: "jonah", name: "Jonah", photo: "/photos/acoustic-amber.jpg", instrument: "Guitar", neighborhood: "Highland Park", verified: false, role: "Drums", startYear: 2022, endYear: 2023 },
  ];
  return { id: raw, name: p.name, members, tracks: p.tracks.map((t) => ({ ...t, by: "Eli" })), ...span(members) };
}
