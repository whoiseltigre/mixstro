import { nounFor } from "./instruments";
import { SAMPLE_PROJECTS, type Track } from "./projects";

/**
 * Shared by the server and the browser: a band page's types, labels and sample bands.
 * A band's page (/b/<id>): everyone who confirmed they played in it, with their role and
 * years, every track they linked to it, and the band's own details: photo, bio, city,
 * genres, status, upcoming shows, open spots and the bands it shared a bill with.
 * Readable signed out through public.public_band(). Demo mode builds sample bands.
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

export type BandStatus = "active" | "recording" | "break" | "done";
export const STATUS_LABEL: Record<BandStatus, string> = {
  active: "Playing out",
  recording: "Recording",
  break: "On a break",
  done: "Not together anymore",
};

export type BandShow = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  time?: string;
  venue: string;
  city?: string;
  ticketUrl?: string;
  withText?: string;
  withBands: { id: string; name: string }[];
};

/** An open spot: a Board post made for the band. */
export type BandSpot = {
  id: string;
  title: string;
  role?: string;
  details?: string;
  paid: boolean;
  pay?: string;
  asked: number;
  answered: boolean;
};

export type SharedStage = { id: string; name: string; photo?: string; shows: number };

export type BandPage = {
  id: string;
  name: string;
  bio?: string;
  city?: string;
  genres: string[];
  status: BandStatus;
  photo?: string;
  /** You play in it now (signed in). */
  isMember: boolean;
  members: BandMember[];
  tracks: (Track & { by: string })[];
  shows: BandShow[];
  spots: BandSpot[];
  sharedStage: SharedStage[];
  startYear: number;
  /** Undefined while anyone still plays in it. */
  endYear?: number;
  sample?: boolean;
};


export function span(members: BandMember[]) {
  const startYear = Math.min(...members.map((m) => m.startYear));
  const endYear = members.some((m) => m.endYear === undefined) ? undefined : Math.max(...members.map((m) => m.endYear!));
  return { startYear, endYear };
}

/** "2019 to now", "2012 to 2014" or "2016". */
export function bandYears(b: Pick<BandPage, "startYear" | "endYear">) {
  if (b.endYear === undefined) return `${b.startYear} to now`;
  return b.endYear === b.startYear ? `${b.startYear}` : `${b.startYear} to ${b.endYear}`;
}

/** "Drums" → "I'm a drummer", "Keys" → "I'm a keys player", "Organ" → "I'm an organist". */
export function spotAnswer(role?: string) {
  if (!role) return "I'm interested";
  const noun = nounFor(role.trim());
  return `I'm ${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

/** "Looking for a drummer" from a role. */
export function spotTitle(role: string) {
  const noun = nounFor(role.trim());
  return `Looking for ${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

/** What's still missing from a band's page, for the "x of 5 done" meter on Your band. */
export function pageChecklist(b: BandPage) {
  return [
    { done: Boolean(b.photo), todo: "a band photo" },
    { done: Boolean(b.bio), todo: "a short bio" },
    { done: b.genres.length > 0, todo: "genres" },
    { done: b.tracks.length > 0, todo: "a song" },
    { done: b.shows.length > 0, todo: "a show" },
  ];
}

/** "Fri, Nov 21" style parts for a show date, without time zone surprises. */
export function showDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }),
    day: d.toLocaleDateString("en-US", { day: "numeric" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** Sample bands for demo mode: Eli and Maya's Night Shift, and Maya's Low Tide Trio. */
export function sampleBands(): BandPage[] {
  const eli = SAMPLE_PROJECTS.eli[0];
  const maya = SAMPLE_PROJECTS.maya[0];
  const nightShift: BandMember[] = [
    { username: "eli", name: "Eli", photo: "/photos/eli-stage.jpg", instrument: "Guitar", neighborhood: "Echo Park", verified: true, role: "Guitar, vocals", startYear: 2022 },
    { username: "maya", name: "Maya", photo: "/photos/bass-blue.jpg", instrument: "Bass", neighborhood: "Silver Lake", verified: true, role: "Bass, backing vocals", startYear: 2022 },
    { username: "jonah", name: "Jonah", photo: "/photos/acoustic-amber.jpg", instrument: "Guitar", neighborhood: "Highland Park", verified: false, role: "Drums", startYear: 2022, endYear: 2023 },
  ];
  const lowTide: BandMember[] = [
    { username: "maya", name: "Maya", photo: "/photos/bass-blue.jpg", instrument: "Bass", neighborhood: "Silver Lake", verified: true, role: "Bass, backing vocals", startYear: 2021 },
  ];
  return [
    {
      id: "night-shift",
      name: eli.name,
      sample: true,
      bio: "Loud, warm, a little sad. A three-piece out of Echo Park playing the east side every month. Our EP Low Ceilings is out now.",
      city: "Echo Park, LA",
      genres: ["Indie rock", "Post-punk"],
      status: "active",
      photo: "/photos/rock-red.jpg",
      isMember: false,
      members: nightShift,
      tracks: eli.tracks.map((t) => ({ ...t, by: "Eli" })),
      shows: [
        { id: "s1", date: inDays(5), time: "9pm", venue: "The Echo", city: "Echo Park", ticketUrl: "https://example.com", withText: undefined, withBands: [{ id: "low-tide-trio", name: "Low Tide Trio" }] },
        { id: "s2", date: inDays(20), time: "8pm", venue: "Zebulon", city: "Frogtown", withBands: [] },
      ],
      spots: [{ id: "s-1", title: "Looking for a drummer", role: "Drums", details: "Weekly rehearsal in Glassell Park, paid shows. Think Low Ceilings, but louder.", paid: true, pay: "Paid shows", asked: 4, answered: false }],
      sharedStage: [{ id: "low-tide-trio", name: "Low Tide Trio", photo: "/photos/gretsch.jpg", shows: 2 }],
      ...span(nightShift),
    },
    {
      id: "low-tide-trio",
      name: maya.name,
      sample: true,
      bio: "Neo-soul trio. Sunday residency in Silver Lake, live-to-tape sessions the rest of the week.",
      city: "Silver Lake, LA",
      genres: ["Neo-soul", "Jazz"],
      status: "recording",
      photo: "/photos/gretsch.jpg",
      isMember: false,
      members: lowTide,
      tracks: maya.tracks.map((t) => ({ ...t, by: "Maya" })),
      shows: [{ id: "s3", date: inDays(5), time: "9pm", venue: "The Echo", city: "Echo Park", withBands: [{ id: "night-shift", name: "Night Shift" }] }],
      spots: [{ id: "s-2", title: "Looking for a keys player", role: "Keys", details: "Rhodes or synth. Sunday residency, paid.", paid: true, pay: "$150 a night", asked: 2, answered: false }],
      sharedStage: [{ id: "night-shift", name: "Night Shift", photo: "/photos/rock-red.jpg", shows: 2 }],
      ...span(lowTide),
    },
  ];
}


/** "Pile's", "Pillow Queens'". */
export const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);
