import { clean, famous, fold, genres, identity, moods } from "./wordlists.ts";
import type { Genre } from "./wordlists.ts";
import { COMMON_PREFIX, COMMON_SUFFIX, IMAGERY, type GenreWords } from "./names.ts";

export interface NameOptions {
  genre?: Genre;
  vibe?: string[];
  keyword?: string;
  /** Lowercase or ALL CAPS styling for about half the names. Spelling is never changed. */
  stylize?: boolean;
  keywordMode?: "include" | "inspire";
  count?: number;
  seed?: number;
  /** Names to leave out, such as the batch already on screen. */
  exclude?: string[];
}

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

// Famous names, and anything one letter away from one, are off limits.
const exact = new Set(famous.map(identity));
const removed = new Set<string>();
const deletions = (s: string) => Array.from(s, (_, i) => s.slice(0, i) + s.slice(i + 1));
for (const name of exact) for (const variant of deletions(name)) removed.add(variant);
function reserved(name: string) {
  if (exact.has(name) || removed.has(name)) return true;
  return deletions(name).some((v) => exact.has(v) || (name.length >= 4 && removed.has(v)));
}
function skeleton(name: string) {
  return identity(name).replace(/vv/g, "w").replace(/v/g, "u").replace(/[aeiou]/g, "").replace(/(.)\1+/g, "$1");
}
const silhouettes = new Set(famous.map(skeleton).filter(Boolean));
export function safeBandName(name: string) {
  return clean(name) && !!identity(name) && !reserved(identity(name)) && !silhouettes.has(skeleton(name));
}

const GENRES = Object.keys(genres) as Genre[];
const FILLER = new Set(["the", "of", "and", "a", "in", "at", "to", "on", "under", "after"]);
/** Content words of a name, for keeping a batch from repeating itself ("Overdrive Salvage" + "Overdrive"). */
const words = (s: string) =>
  fold(s)
    .replace(/&/g, " ")
    .split(/[^a-z']+/)
    .map((w) => w.replace(/'s$|s$/, ""))
    .filter((w) => w.length > 1 && !FILLER.has(w));

const title = (s: string) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());

/** Names built around a word someone typed, in shapes real bands use. */
function keywordNames(keyword: string, g: GenreWords, pick: <T>(a: readonly T[]) => T) {
  const single = !keyword.includes(" ");
  const ending = (s: string) => (/^[a-z]/.test(s) ? (single && keyword.length <= 7 ? [keyword + s] : []) : [`${keyword} ${s}`]);
  // The genre's own endings sound most like the genre, so they go first.
  const genre = [...g.suffix.flatMap(ending), `${keyword} & the ${pick(g.plural)}`];
  const common = [...COMMON_SUFFIX.flatMap(ending), ...COMMON_PREFIX.map((p) => `${p} ${keyword}`), `The ${keyword} Years`];
  if (single && !/s$/i.test(keyword)) common.push(`The ${keyword}s`);
  const fits = (n: string) => n.split(" ").length <= 4;
  return { genre: genre.filter(fits), common: common.filter(fits) };
}

const LOWERCASE: Genre[] = ["indie", "electronic", "pop", "hip-hop", "folk"];

export function generateNames(opts: NameOptions = {}): string[] {
  const count = opts.count ?? 12;
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("Invalid count.");
  if (!count) return [];
  const rng = randomSource(opts.seed ?? Math.random() * 2 ** 32);
  const pick = <T>(a: readonly T[]) => a[Math.floor(rng() * a.length)]!;
  const shuffle = <T>(a: readonly T[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [b[i], b[j]] = [b[j]!, b[i]!];
    }
    return b;
  };

  const raw = opts.keyword?.trim().replace(/\s+/g, " ") ?? "";
  if (raw && (!/^[a-z]+(?: [a-z]+){0,2}$/.test(fold(raw)) || !clean(raw) || raw.length > 48))
    throw new RangeError("Use a clean keyword of one to three words.");
  const keyword = title(raw);

  // Any genre: draw from all of them. A genre page or pick: that genre's words.
  const pool: Genre[] = opts.genre ? [opts.genre] : GENRES;
  const curated = shuffle(pool.flatMap((g) => genres[g].names));
  const vibes = (opts.vibe ?? []).flatMap((v) => moods.get(v.trim().toLowerCase()) ?? []);
  const composed = shuffle(
    pool.flatMap((g) => genres[g].adj.flatMap((a) => genres[g].plural.map((p) => `The ${a} ${p}`))),
  );

  // A word to put in the name: half the batch. "Just set the mood": a few names from its imagery.
  let keyed: string[] = [];
  if (keyword) {
    const inspire = opts.keywordMode === "inspire";
    const images = inspire ? IMAGERY[fold(raw)] : undefined;
    const seeds = images ? shuffle(images).slice(0, 3) : [keyword];
    const built = seeds.map((k) => keywordNames(k, genres[pick(pool)], pick));
    const own = shuffle(built.flatMap((b) => b.genre));
    const common = shuffle(built.flatMap((b) => b.common));
    // About two in three from the genre's endings.
    while (own.length || common.length) keyed.push((own.length && (rng() < 0.65 || !common.length) ? own : common).shift()!);
    if (images) {
      // Curated names that already carry one of the images go first.
      const imageWords = new Set(images.flatMap(words));
      keyed = [...curated.filter((n) => words(n).some((w) => imageWords.has(w))), ...keyed];
    }
  }
  const quota = {
    keyed: !keyword ? 0 : opts.keywordMode === "inspire" ? Math.ceil(count / 3) : Math.ceil(count / 2),
    vibe: vibes.length ? Math.round(count * 0.4) : 0,
    composed: Math.max(1, Math.round(count / 6)),
  };

  const exclude = new Set((opts.exclude ?? []).map(identity));
  const keywordWords = new Set(keyword ? words(keyword) : []);
  const chosen: string[] = [];
  const ids = new Set<string>();
  const used = new Set<string>();

  function take(source: string[], n: number, strict: boolean) {
    let got = 0;
    for (const name of source) {
      if (got >= n || chosen.length >= count) break;
      const id = identity(name);
      if (ids.has(id) || exclude.has(id) || !safeBandName(name)) continue;
      const ws = words(name).filter((w) => !keywordWords.has(w));
      if (strict && ws.some((w) => used.has(w))) continue;
      chosen.push(name);
      ids.add(id);
      ws.forEach((w) => used.add(w));
      got++;
    }
    return got;
  }

  take(keyed, quota.keyed, true);
  take(shuffle(vibes), quota.vibe, true);
  take(composed, quota.composed, true);
  take(curated, count, true);
  // Big batches can run out of names with no shared word: allow repeats rather than stop short.
  for (const source of [curated, vibes, composed, keyed]) take(source, count, false);
  if (chosen.length < count) throw new RangeError("Try another keyword or a smaller batch.");

  // Mix the kinds so a keyword or vibe doesn't fill the top row.
  const mixed = shuffle(chosen);
  if (!opts.stylize) return mixed;
  // Styling comes last so the same seed gives the same names with or without it.
  const lower = opts.genre ? LOWERCASE.includes(opts.genre) : rng() < 0.5;
  return mixed.map((n) => (rng() < 0.5 ? (lower ? n.toLowerCase() : n.toUpperCase()) : n));
}
