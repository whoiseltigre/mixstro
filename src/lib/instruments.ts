/**
 * What musicians play, in two levels: a family you tap ("Strings") and the exact instruments
 * inside it ("Violin", "Cello"). Profiles store the exact instruments. Family ids are the names
 * profiles used before (Guitar, Strings…), so older profiles and saved role alerts keep working:
 * a family name on a profile simply means "this family, not more specific".
 */
export type Family = {
  id: string;
  label: string;
  /** Shown on the tile before you pick, so "Strings" says what's inside. */
  peek: string;
  hue: string;
  noun: string;
  options: string[];
};

export const FAMILIES: Family[] = [
  { id: "Guitar", label: "Guitar", peek: "Electric, acoustic, steel…", hue: "#FFB245", noun: "guitarist", options: ["Electric guitar", "Acoustic guitar", "Classical guitar", "Slide guitar", "Pedal steel"] },
  { id: "Bass", label: "Bass", peek: "Electric, upright, synth", hue: "#FF8A6B", noun: "bassist", options: ["Electric bass", "Upright bass", "Synth bass"] },
  { id: "Drums", label: "Drums", peek: "Kit, percussion, hand drums…", hue: "#FF7AA2", noun: "drummer", options: ["Drum kit", "Percussion", "Hand drums", "Electronic drums", "Vibes & mallets"] },
  { id: "Keys", label: "Keys", peek: "Piano, synth, organ…", hue: "#C9B6FF", noun: "keys player", options: ["Piano", "Synth", "Organ", "Electric piano", "Accordion"] },
  { id: "Vocals", label: "Vocals", peek: "Lead, harmonies, rap…", hue: "#FFACBA", noun: "singer", options: ["Lead vocals", "Harmony vocals", "Rap", "Beatbox"] },
  { id: "Strings", label: "Strings", peek: "Violin, cello, harp…", hue: "#F7BF77", noun: "string player", options: ["Violin", "Fiddle", "Viola", "Cello", "Harp", "Mandolin", "Banjo", "Ukulele"] },
  { id: "Horns", label: "Horns & winds", peek: "Sax, trumpet, flute…", hue: "#FFD27A", noun: "horn player", options: ["Saxophone", "Trumpet", "Trombone", "Clarinet", "Flute", "French horn", "Tuba", "Harmonica"] },
  { id: "Producer", label: "Production", peek: "Producing, beats, mixing…", hue: "#E7A6FF", noun: "producer", options: ["Producer", "Beatmaker", "Mixing engineer", "Recording engineer"] },
  { id: "Songwriter", label: "Writing", peek: "Songs, lyrics, arranging…", hue: "#FFC29E", noun: "songwriter", options: ["Songwriter", "Lyricist", "Composer", "Arranger"] },
  { id: "DJ", label: "DJ", peek: "Club, turntablism, live sets", hue: "#B9A2FF", noun: "DJ", options: ["DJ", "Turntablist", "Live electronics"] },
];

/** The families, as role names (for "Who you're looking for" and Board posts). */
export const ROLE_IDS = FAMILIES.map((f) => f.id);

const NOUNS: Record<string, string> = {
  "Electric guitar": "guitarist",
  "Acoustic guitar": "acoustic guitarist",
  "Classical guitar": "classical guitarist",
  "Slide guitar": "slide guitarist",
  "Pedal steel": "pedal steel player",
  "Electric bass": "bassist",
  "Upright bass": "upright bassist",
  "Synth bass": "synth bassist",
  "Drum kit": "drummer",
  Percussion: "percussionist",
  "Hand drums": "hand drummer",
  "Electronic drums": "drummer",
  "Vibes & mallets": "mallet player",
  Piano: "pianist",
  Synth: "synth player",
  Organ: "organist",
  "Electric piano": "keys player",
  Accordion: "accordionist",
  "Lead vocals": "singer",
  "Harmony vocals": "harmony singer",
  Rap: "rapper",
  Beatbox: "beatboxer",
  Violin: "violinist",
  Fiddle: "fiddler",
  Viola: "violist",
  Cello: "cellist",
  Harp: "harpist",
  Mandolin: "mandolin player",
  Banjo: "banjo player",
  Ukulele: "ukulele player",
  Saxophone: "saxophonist",
  Trumpet: "trumpeter",
  Trombone: "trombonist",
  Clarinet: "clarinetist",
  Flute: "flutist",
  "French horn": "horn player",
  Tuba: "tuba player",
  Harmonica: "harmonica player",
  Producer: "producer",
  Beatmaker: "beatmaker",
  "Mixing engineer": "mix engineer",
  "Recording engineer": "recording engineer",
  Songwriter: "songwriter",
  Lyricist: "lyricist",
  Composer: "composer",
  Arranger: "arranger",
  DJ: "DJ",
  Turntablist: "turntablist",
  "Live electronics": "electronic musician",
};

/** "Cello" → the Strings family. Unknown names (typed in) belong to no family. */
export function familyOf(name: string): Family | undefined {
  return FAMILIES.find((f) => f.id === name || f.options.includes(name));
}

/** "Cello" → "cellist", "Drums" → "drummer", "Erhu" → "erhu player". */
export function nounFor(name: string) {
  return NOUNS[name] ?? FAMILIES.find((f) => f.id === name)?.noun ?? `${name.toLowerCase()} player`;
}

/** Role names (families) → every instrument that counts as one, for matching profiles. */
export function expandRoles(roles: string[]) {
  return [...new Set(roles.flatMap((r) => [r, ...(familyOf(r)?.id === r ? familyOf(r)!.options : [])]))];
}

/** Does someone who plays `instrument` fill any of these roles? */
export function fillsRole(instrument: string, roles: string[]) {
  return roles.includes(instrument) || roles.includes(familyOf(instrument)?.id ?? "");
}

/** ["Cello", "Electric guitar"] → "Cellist and guitarist", the line under your name. */
export function headlineFor(instruments: string[], main?: string) {
  const ordered = main ? [main, ...instruments.filter((i) => i !== main)] : instruments;
  const nouns = [...new Set(ordered.map(nounFor))].slice(0, 2);
  if (!nouns.length) return "";
  const line = nouns.join(" and ");
  return line[0].toUpperCase() + line.slice(1);
}
