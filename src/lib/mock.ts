import { CATALOG } from "./artists";
import type { Artist } from "./onboarding";

/** Sample musicians and posts so the app is explorable before real data exists. */

export type Musician = {
  /** Profile id; the username for sample musicians. */
  id: string;
  username: string;
  name: string;
  instrument: string;
  genres: string;
  neighborhood: string;
  distanceMi?: number;
  photo: string | null;
  photoAlt: string;
  influences: Artist[];
  shared: Artist[];
  commitment: string;
  /** True when their commitment level matches yours. */
  sameCommitment?: boolean;
  lookingFor: string;
  bands: { name: string; years: string; role: string; photo: string }[];
};

const byName = (names: string[]) => names.map((n) => CATALOG.find((a) => a.name === n)!).filter(Boolean);

export const ME_INFLUENCES = byName(["Phoebe Bridgers", "The National", "Big Thief", "Wilco", "Radiohead", "Bon Iver"]);

export const MUSICIANS: Musician[] = [
  {
    id: "eli",
    username: "eli",
    name: "Eli Navarro",
    instrument: "Guitar",
    genres: "Indie rock",
    neighborhood: "Silver Lake",
    distanceMi: 3,
    photo: "/photos/eli-stage.jpg",
    photoAlt: "Eli playing guitar on stage under warm beams",
    influences: byName(["Phoebe Bridgers", "The National", "Big Thief", "Wilco", "Arctic Monkeys", "The Strokes"]),
    shared: byName(["Phoebe Bridgers", "The National", "Big Thief", "Wilco"]),
    commitment: "Gigs monthly",
    sameCommitment: true,
    lookingFor: "Looking for a bassist",
    bands: [{ name: "Night Shift", years: "2022 to now", role: "Guitar, vocals", photo: "/photos/rock-red.jpg" }],
  },
  {
    id: "maya",
    username: "maya",
    name: "Maya Torres",
    instrument: "Bass",
    genres: "Neo-soul, funk",
    neighborhood: "Echo Park",
    distanceMi: 4,
    photo: "/photos/bass-blue.jpg",
    photoAlt: "Maya's hands on a bass under blue stage light",
    influences: byName(["Thundercat", "Khruangbin", "D'Angelo", "Hiatus Kaiyote", "Esperanza Spalding", "Bon Iver"]),
    shared: byName(["Bon Iver"]),
    commitment: "Weekly",
    lookingFor: "Looking for a drummer",
    bands: [
      { name: "Low Tide Trio", years: "2021 to now", role: "Bass, backing vocals", photo: "/photos/rock-red.jpg" },
      { name: "Session work", years: "2019 to 2021", role: "Session bass", photo: "/photos/gretsch.jpg" },
    ],
  },
  {
    id: "jonah",
    username: "jonah",
    name: "Jonah Reyes",
    instrument: "Guitar",
    genres: "Folk, ambient",
    neighborhood: "Highland Park",
    distanceMi: 6,
    photo: "/photos/acoustic-amber.jpg",
    photoAlt: "Acoustic guitarist under amber lights",
    influences: byName(["Bon Iver", "Big Thief", "Fleetwood Mac", "Mitski", "Japanese Breakfast"]),
    shared: byName(["Bon Iver", "Big Thief"]),
    commitment: "Just for fun",
    lookingFor: "Looking for a co-writer",
    bands: [],
  },
];

export const findMusician = (u: string) => MUSICIANS.find((m) => m.username === u);

export const BOARD = [
  { id: 1, photo: "/photos/bass-blue.jpg", alt: "Bassist on stage", kind: "Band seeking", title: "Drummer for neo-soul trio", meta: "Echo Park · Gigs monthly · Paid", foot: "6 musicians interested", isNew: true, author: "maya" },
  { id: 2, photo: "/photos/gretsch.jpg", alt: "Guitarist playing a Gretsch", kind: "Session", title: "Rhythm guitar for an EP", meta: "Studio City · 3 days · $300/day", foot: "Closes Friday", isNew: false, author: "eli" },
  { id: 3, photo: "/photos/acoustic-amber.jpg", alt: "Acoustic guitarist under amber lights", kind: "Collab", title: "Co-writer, folk and ambient", meta: "Remote or LA · Just for fun", foot: "2 musicians interested", isNew: false, author: "jonah" },
  { id: 4, photo: "/photos/rock-red.jpg", alt: "Rock guitarist on stage", kind: "Band seeking", title: "Lead singer, glam rock", meta: "Burbank · Touring 2027", foot: "11 musicians interested", isNew: false, author: "eli" },
];

export const THREADS = [
  { id: "eli", with: "eli", preview: "We have a rehearsal space in Silver Lake. Want to come play Thursday?", time: "7:42 PM", unread: true },
  { id: "maya", with: "maya", preview: "Voice note · 0:31", time: "Tue", unread: false },
];
