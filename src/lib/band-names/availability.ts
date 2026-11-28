import { clean, identity } from './wordlists.ts';

export interface Availability {
  status: 'available' | 'similar' | 'taken' | 'unknown';
  matches: string[];
}
const fallback = (): Availability => ({status:'unknown', matches:[]});
let queue = Promise.resolve();
let nextStart = 0;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** MusicBrainz: every artist with a release anywhere. Busy replies (503) are common, so it retries twice. */
async function musicbrainz(name: string): Promise<Availability | null> {
  const url = new URL('https://musicbrainz.org/ws/2/artist');
  const escaped = name.replace(/["\\]/g, '\\$&');
  url.search = new URLSearchParams({query:'artist:"' + escaped + '"',fmt:'json',limit:'100'}).toString();
  for (const backoff of [0, 1500, 3000]) {
    if (backoff) await wait(backoff);
    const delay = nextStart - performance.now();
    if (delay > 0) await wait(Math.ceil(delay));
    nextStart = performance.now() + 1010;
    let response: Response;
    try {
      response = await fetch(url, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
    } catch {
      continue;
    }
    if (response.status === 503 || response.status === 429) continue;
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!Array.isArray(data?.artists)) return null;
    const found = new Set<string>();
    let status: Availability['status'] = 'available';
    const key = identity(name);
    for (const artist of data.artists) {
      if (typeof artist?.name !== 'string' || !artist.name.trim()) continue;
      const label = artist.name.trim();
      const exact = label.toLowerCase() === name.toLowerCase();
      if (exact || (key && identity(label) === key) || Number(artist.score) >= 90) {
        if (exact) status = 'taken';
        else if (status === 'available') status = 'similar';
        if (clean(label)) found.add(label);
      }
    }
    return {status, matches:[...found]};
  }
  return null;
}

/** Apple Music, through the iTunes Search API (open to browsers): artists with music out now. */
async function appleMusic(name: string): Promise<Availability | null> {
  const url = new URL('https://itunes.apple.com/search');
  url.search = new URLSearchParams({term:name,entity:'musicArtist',limit:'25'}).toString();
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(8000)});
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.results)) return null;
    const key = identity(name);
    const same = data.results
      .map((r: {artistName?: unknown}) => (typeof r?.artistName === 'string' ? r.artistName.trim() : ''))
      .filter((label: string) => label && key && identity(label) === key && clean(label));
    return {status: same.length ? 'taken' : 'available', matches: [...new Set<string>(same)]};
  } catch {
    return null;
  }
}

const RANK = {taken: 3, similar: 2, available: 1, unknown: 0} as const;

/** Both sources at once. Taken in either wins; it only fails when neither answers. */
async function lookup(name: string): Promise<Availability> {
  const [mb, apple] = await Promise.all([musicbrainz(name), appleMusic(name)]);
  const answers = [mb, apple].filter((a): a is Availability => !!a);
  if (!answers.length) return fallback();
  const status = answers.reduce((s, a) => (RANK[a.status] > RANK[s] ? a.status : s), 'available' as Availability['status']);
  return {status, matches: [...new Set(answers.flatMap((a) => a.matches))]};
}

// Runs in the visitor's browser: MusicBrainz turns away our cloud servers but allows
// cross-origin requests from browsers, and so does Apple's search. The queue keeps each
// visitor to about one MusicBrainz request a second, which is its limit.
const cache = new Map<string,{value:Availability; until:number}>();
const pending = new Map<string,Promise<Availability>>();
export async function checkAvailability(name: string): Promise<Availability> {
  if (typeof name !== 'string' || !name.trim() || !clean(name)) return fallback();
  const key = name.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return structuredClone(hit.value);
  const active = pending.get(key);
  if (active) return structuredClone(await active);
  if (pending.size >= 8) return fallback();
  const job = queue.then(() => lookup(name.trim())).catch(fallback);
  pending.set(key,job);
  queue = job.then(() => undefined);
  const value = await job;
  pending.delete(key);
  if (value.status !== 'unknown') {
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key,{value,until:Date.now()+3600000});
  }
  return structuredClone(value);
}
