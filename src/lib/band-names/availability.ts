import { clean, identity } from './wordlists.ts';

export interface Availability {
  status: 'available' | 'similar' | 'taken' | 'unknown';
  matches: string[];
}
const fallback = (): Availability => ({status:'unknown', matches:[]});
let queue = Promise.resolve();
let nextStart = 0;

async function lookup(name: string): Promise<Availability> {
  const delay = nextStart - performance.now();
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, Math.ceil(delay)));
  nextStart = performance.now() + 1010;
  const url = new URL('https://musicbrainz.org/ws/2/artist');
  const escaped = name.replace(/["\\]/g, '\\$&');
  url.search = new URLSearchParams({query:'artist:"' + escaped + '"',fmt:'json',limit:'100'}).toString();
  const response = await fetch(url, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if (!response.ok) return fallback();
  const data = await response.json();
  if (!Array.isArray(data?.artists)) return fallback();
  const found = new Set<string>();
  let status: Availability['status'] = 'available';
  for (const artist of data.artists) {
    if (typeof artist?.name !== 'string' || !artist.name.trim()) return fallback();
    const label = artist.name.trim();
    const exact = label.toLowerCase() === name.toLowerCase();
    const key = identity(name);
    if (exact || (key && identity(label) === key) || Number(artist.score) >= 90) {
      if (exact) status = 'taken';
      else if (status === 'available') status = 'similar';
      if (clean(label)) found.add(label);
    }
  }
  return {status, matches:[...found]};
}

// Runs in the visitor's browser: MusicBrainz turns away our cloud servers but allows
// cross-origin requests from browsers (see src/lib/musicbrainz.ts). The queue keeps each
// visitor to about one request a second, which is MusicBrainz's limit.
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
