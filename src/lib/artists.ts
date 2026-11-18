import type { Artist } from "./onboarding";

/** Provider-independent artist id: a slug of the name, so overlap survives a switch from Deezer to Apple Music. */
export function artistId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Offline catalog for demo-mode suggestions and as a fallback when the search
 * API (/api/artists) can't be reached.
 */
const NAMES = [
  "Thundercat", "Khruangbin", "D'Angelo", "Hiatus Kaiyote", "Esperanza Spalding", "Erykah Badu",
  "Tom Misch", "Anderson .Paak", "Vulfpeck", "Phoebe Bridgers", "The National", "Big Thief",
  "Wilco", "Radiohead", "Fleetwood Mac", "Prince", "Stevie Wonder", "Arctic Monkeys",
  "Tame Impala", "Fiona Apple", "Bon Iver", "Paramore", "Foo Fighters", "Haim",
  "Kendrick Lamar", "SZA", "Frank Ocean", "Mitski", "boygenius", "St. Vincent",
  "Queens of the Stone Age", "The Strokes", "Snarky Puppy", "Robert Glasper", "Herbie Hancock", "Miles Davis",
  "John Mayer", "Hozier", "Lizzy McAlpine", "Japanese Breakfast", "Turnstile", "Deftones",
  "Daft Punk", "Bonobo", "Fred again..", "Jacob Collier", "Cory Wong", "Mac DeMarco",
];

/** Deezer photo ids for the catalog, so offline suggestions and sample profiles show real faces, not initials. */
const PHOTO: Record<string, string> = {
  "Thundercat": "b0c4ed80c89bbaad8224a90ce108e0d8",
  "Khruangbin": "1f18e4d815853265fe33c2965285c17a",
  "D'Angelo": "70295a0ca9cb7ff9ac33ab8be5a8070a",
  "Hiatus Kaiyote": "bd8a93d9063fb029c9ff060367a15291",
  "Esperanza Spalding": "83cbe5ac9b65985a18e9a7c38cd15a2a",
  "Erykah Badu": "559a518d415c84c4e41515c77057fc9c",
  "Tom Misch": "fa4ef37016d821bcb5207f8dcaad0b7a",
  "Anderson .Paak": "f36cab1ba62996ee8f670941aa8987e7",
  "Vulfpeck": "3ec38d89f48b85df7795eead1ef5c86f",
  "Phoebe Bridgers": "aaf9a93b5b4dc7a2368d375201cc58e1",
  "The National": "d68e8921c189fb0b7d724552eaa215a3",
  "Big Thief": "78df44195e9c4927ee83caa0eb2adb18",
  "Wilco": "9a9aad839fbbf125ed24b43b81271df9",
  "Radiohead": "0d58cfbc90f2e776608bcdc0c45a4711",
  "Fleetwood Mac": "ef23278cf3a67a3ca8404ddaa38699d4",
  "Prince": "85eec086152fb01d873ccdb0810e2660",
  "Stevie Wonder": "b8138428e7b0ce78843106b4b83d4e77",
  "Arctic Monkeys": "6c03e4c7c36800897fd468633286db24",
  "Tame Impala": "879015e713cc6ad6ffaeec154c027505",
  "Fiona Apple": "8d04617744ea61e7ad2891cf0297f3b5",
  "Bon Iver": "6edd41ee3cd3005077e07647242fb238",
  "Paramore": "60dc1956a36a5e552384b4a32b0cbf9b",
  "Foo Fighters": "c2a443972cacf77896f91a66b30bfd9e",
  "Haim": "fbd93d88588cdaab1906a749df472638",
  "Kendrick Lamar": "be0a7c550567f4af0ed202d7235b74d6",
  "SZA": "8ced041da2bed70d5715f0860956169b",
  "Frank Ocean": "882155c08dc31d6464d6d580083c968c",
  "Mitski": "95f0e0a39d7dd9eda8239c96d054527a",
  "boygenius": "fb370b7f0b00cc0c65bd91af16b1f51a",
  "St. Vincent": "4460a799440831657f6cdbbf555ff303",
  "Queens of the Stone Age": "489308e79a340dfd05d78fcd91f26a10",
  "The Strokes": "88e8ecd06aae5cd69d414af57a67f339",
  "Snarky Puppy": "7e2d615395e8d77226a834a1dbc17c97",
  "Robert Glasper": "64db3f897347fa383ec678cae51ae500",
  "Herbie Hancock": "afa7dfde3e193b870dd79bd4cedb5e03",
  "Miles Davis": "3a7973349c1b56f5764abb7507078f22",
  "John Mayer": "a3a8c6e8db765c4ab19f046f0539971b",
  "Hozier": "4970da41372f40bb2d85b71d41c359e8",
  "Lizzy McAlpine": "5337742c9d803925eacdb5c0ec77269d",
  "Japanese Breakfast": "131fce389393ca49fbe2aa5831f492b6",
  "Turnstile": "8cc086b7cd608c8cdc06f79ae6075bfd",
  "Deftones": "a4fab59f82dc48f2c636ce8497282e67",
  "Daft Punk": "638e69b9caaf9f9f3f8826febea7b543",
  "Bonobo": "ceb51b6de1f57f093cc569ec8127646d",
  "Fred again..": "3f0a4f39334266aa963038d95bbb267f",
  "Jacob Collier": "6f96ea76cf63639f0031eae5e40f9d2b",
  "Cory Wong": "b42fab08607cdcc3047e534171053677",
  "Mac DeMarco": "b468329467ac01256a85e0925026715d",
};
const photoUrl = (hash: string) => `https://cdn-images.dzcdn.net/images/artist/${hash}/500x500-000000-80-0-0.jpg`;

export const CATALOG: Artist[] = NAMES.map((name) => ({ id: artistId(name), name, image: PHOTO[name] ? photoUrl(PHOTO[name]) : undefined }));

const CATALOG_PHOTO = new Map(CATALOG.map((a) => [a.id, a.image]));

/** A known photo for an artist saved without one (picked while search was down), else undefined. */
export const catalogPhoto = (id: string) => CATALOG_PHOTO.get(id);

/** What "Connect Apple Music" returns in demo mode: a plausible top-artists list. */
export const DEMO_TOP_ARTISTS = CATALOG.slice(0, 12);

export function searchArtists(q: string): Artist[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return CATALOG.filter((a) => a.name.toLowerCase().includes(s)).slice(0, 8);
}

// Warm stage-gel hues only (no navy or teal).
const HUES = [28, 350, 300, 45, 15, 330];

export function artistTint(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return `linear-gradient(140deg, oklch(0.42 0.08 ${hue}), oklch(0.24 0.04 ${hue}))`;
}

export function initials(name: string) {
  return name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
