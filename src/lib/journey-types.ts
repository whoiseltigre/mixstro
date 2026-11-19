/** Shapes shared by Journey import's browser (MusicBrainz) and server (Apple) halves. */

export type JourneyArtist = {
  /** "mb:<MBID>" or "apple:<artistId>". */
  id: string;
  name: string;
  kind: "person" | "group";
  /** "UK rock band", "Austin, TX", genre… whatever helps you tell namesakes apart. */
  hint?: string;
  since?: number;
  image?: string;
};

export type JourneyRelease = { id: string; title: string; year?: number; type: string; url?: string; artwork?: string };

export type JourneyAct = {
  name: string;
  /** "self" is your own name; "band" one you were a member of. */
  relation: "self" | "band";
  startYear?: number;
  endYear?: number;
  role?: string;
  releases: JourneyRelease[];
};
