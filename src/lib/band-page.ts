import { cache } from "react";
import { sampleBands, span, type BandMember, type BandPage, type BandStatus } from "./band-shared";
import type { Track } from "./projects";
import { createClient } from "./supabase/server";

export * from "./band-shared";

/** A band's page from public.public_band(), or a sample band in demo mode. Server only. */

type Row = {
  id: number;
  name: string;
  bio?: string | null;
  city?: string | null;
  genres?: string[];
  status?: BandStatus;
  photo_url?: string | null;
  is_member?: boolean;
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
  shows?: { id: number; date: string; time: string | null; venue: string; city: string | null; ticket_url: string | null; with_text: string | null; with_bands: { id: number; name: string }[] }[];
  spots?: { id: number; title: string; role: string | null; details: string | null; paid: boolean; pay: string | null; asked: number; answered: boolean }[];
  shared_stage?: { id: number; name: string; photo_url: string | null; shows: number }[];
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
  return {
    id: String(r.id),
    name: r.name,
    bio: r.bio ?? undefined,
    city: r.city ?? undefined,
    genres: r.genres ?? [],
    status: r.status ?? "active",
    photo: r.photo_url ?? undefined,
    isMember: Boolean(r.is_member),
    members,
    tracks,
    shows: (r.shows ?? []).map((s) => ({
      id: String(s.id),
      date: s.date,
      time: s.time ?? undefined,
      venue: s.venue,
      city: s.city ?? undefined,
      ticketUrl: s.ticket_url ?? undefined,
      withText: s.with_text ?? undefined,
      withBands: (s.with_bands ?? []).map((b) => ({ id: String(b.id), name: b.name })),
    })),
    spots: (r.spots ?? []).map((s) => ({
      id: String(s.id),
      title: s.title,
      role: s.role ?? undefined,
      details: s.details ?? undefined,
      paid: s.paid,
      pay: s.pay ?? undefined,
      asked: Number(s.asked) || 0,
      answered: Boolean(s.answered),
    })),
    sharedStage: (r.shared_stage ?? []).map((b) => ({ id: String(b.id), name: b.name, photo: b.photo_url ?? undefined, shows: b.shows })),
    ...span(members),
  };
});

function demoBand(raw: string): BandPage | null {
  return sampleBands().find((b) => b.id === raw) ?? null;
}
