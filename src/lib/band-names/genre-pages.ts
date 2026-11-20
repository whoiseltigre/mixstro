import type { Genre } from "./wordlists.ts";

/** Copy for /band-name-generator/<genre>. Each page targets "<genre> band name generator". */
export type GenrePage = { genre: Genre; slug: string; label: string; h1: string; dek: string; intro: string; tips: string[] };

export const GENRE_PAGES: GenrePage[] = [
  {
    genre: "metal",
    slug: "metal",
    label: "Metal",
    h1: "Metal band name generator",
    dek: "Heavy, cold and a little ominous. Twelve metal band names at a time, checked against real bands.",
    intro: "Metal names lean on weight: iron, ash, crypts, forges and single hard words that look good in a jagged logo. Pick Dark as the vibe for doom and black metal, Gritty for thrash and sludge.",
    tips: ["One word names (Pyreward, Anvilforge) are easiest to turn into a logo.", "Read it in a growl. If it still sounds like a name, keep it.", "Check that the logo version is still readable on a shirt from across a room."],
  },
  {
    genre: "punk",
    slug: "punk",
    label: "Punk",
    h1: "Punk band name generator",
    dek: "Cheap, loud and a bit rude. Punk band names that fit on a hand-cut flyer.",
    intro: "Punk names come from the street and the paperwork of a broke life: noise complaints, late fees, basements and safety pins. Short and sarcastic usually beats clever.",
    tips: ["If it would look right spray painted on a guitar case, you're close.", "Two words is the sweet spot for a sticker.", "Funny works in punk. Pick the Funny vibe for pop punk names."],
  },
  {
    genre: "rock",
    slug: "rock",
    label: "Rock",
    h1: "Rock band name generator",
    dek: "Amps, engines and open highways. Rock band names for bar stages and festival tents.",
    intro: "Rock names borrow from motors, wires and places with a little rust on them. The classic shape is 'The' plus a plural, but a hard two-word name works just as well.",
    tips: ["Say it the way an announcer would: 'Please welcome… ' and see if it lands.", "Avoid names that sound like an existing classic rock band. The check helps.", "Retro as the vibe gives you a seventies feel."],
  },
  {
    genre: "indie",
    slug: "indie",
    label: "Indie",
    h1: "Indie band name generator",
    dek: "Small, specific and a little odd. Indie band names that sound like a record you find by accident.",
    intro: "Indie names tend to be everyday objects and places seen sideways: postcards, attics, Sunday papers, borrowed things. Specific and quiet beats big and epic.",
    tips: ["Dreamy as the vibe suits shoegaze and bedroom pop.", "Phrases ('Meet Me Sunday') work well for indie. Turn the word mode to 'Just set the mood'.", "Check the Instagram handle before you fall in love with it."],
  },
  {
    genre: "country",
    slug: "country",
    label: "Country",
    h1: "Country band name generator",
    dek: "Dust, gravel roads and county lines. Country and Americana band names with some miles on them.",
    intro: "Country names come from the land and the work: saddles, creeks, counties and long drives. Place names and 'The' plus a plural are both at home here.",
    tips: ["Add your home town or river as the word. It makes the name yours.", "Retro vibe gives you an old honky-tonk feel.", "Make sure it reads well on a festival poster in small type."],
  },
  {
    genre: "folk",
    slug: "folk",
    label: "Folk",
    h1: "Folk band name generator",
    dek: "Woodsy, warm and handmade. Folk band names for duos, string bands and porch sessions.",
    intro: "Folk names are gentle and natural: birds, orchards, meadows, fiddles and woven things. Names that sound like a place on an old map work well.",
    tips: ["Duos often use 'X & the Y'. Turn on a word to get those.", "Dreamy vibe suits indie folk.", "Read it out loud quietly. Folk names should sound good softly."],
  },
  {
    genre: "jazz",
    slug: "jazz",
    label: "Jazz",
    h1: "Jazz band name generator",
    dek: "Late sets and blue hours. Names for jazz trios, quartets and big bands.",
    intro: "Jazz groups often go by the leader's name plus Trio or Quartet, or by a late-night image: blue hours, last sets, night porters. The generator mixes both.",
    tips: ["Put your own name in the word box for a leader-style name.", "Retro vibe gives you a fifties club feel.", "If you play weddings too, make sure it sounds right on a booking site."],
  },
  {
    genre: "hip-hop",
    slug: "hip-hop",
    label: "Hip-hop",
    h1: "Hip-hop group name generator",
    dek: "Cyphers, corners and crates of records. Names for hip-hop crews and collectives.",
    intro: "Hip-hop crew names come from the block and the craft: corners, cyphers, samplers and cassettes. Collective and Edition style endings are common.",
    tips: ["Your neighborhood as the word makes it local.", "Check that it's searchable. A plain English word gets buried.", "Gritty vibe suits boom bap, Dreamy suits lo-fi."],
  },
  {
    genre: "electronic",
    slug: "electronic",
    label: "Electronic",
    h1: "Electronic band name generator",
    dek: "Signals, circuits and neon. Names for electronic acts, DJ duos and synth projects.",
    intro: "Electronic names borrow from machines and light: relays, prisms, pulses and grids. Single invented words work especially well on streaming services.",
    tips: ["Stylized spelling fits electronic music. Turn it on.", "Short names fit better on a festival lineup.", "Make sure it isn't a gear brand. The check helps."],
  },
  {
    genre: "pop",
    slug: "pop",
    label: "Pop",
    h1: "Pop band name generator",
    dek: "Bright, shiny and easy to sing along to. Pop band names that fit on a lineup poster.",
    intro: "Pop names are sweet and quick: candy colors, summers, mirrors and day trips. They should be easy to spell after hearing them once.",
    tips: ["Funny vibe gives you bubblegum names.", "Avoid odd spellings. Fans need to find you by search.", "Two syllables per word is easiest to chant."],
  },
];

export const genrePage = (slug: string) => GENRE_PAGES.find((g) => g.slug === slug);
