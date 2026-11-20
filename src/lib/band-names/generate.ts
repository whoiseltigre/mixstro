import { clean, famous, fold, genres, identity, irregular, moods } from './wordlists.ts';
import type { Genre } from './wordlists.ts';

export interface NameOptions {
  genre?: Genre;
  vibe?: string[];
  keyword?: string;
  stylize?: boolean;
  keywordMode?: 'include' | 'inspire';
  count?: number;
  seed?: number;
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

const exact = new Set(famous.map(identity));
const removed = new Set<string>();
function deletions(s: string) {
  return Array.from(s, (_, i) => s.slice(0,i) + s.slice(i+1));
}
for (const name of exact) for (const variant of deletions(name)) removed.add(variant);
function reserved(name: string) {
  if (exact.has(name) || removed.has(name)) return true;
  return deletions(name).some(v => exact.has(v) || (name.length >= 4 && removed.has(v)));
}

function draw(opts: NameOptions): string[] {
  const count = opts.count ?? 12;
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Count must be a nonnegative integer.');
  const rng = randomSource(opts.seed ?? Math.random() * 2 ** 32);
  const pick = <T>(items: readonly T[]) => items[Math.floor(rng() * items.length)]!;
  const genre = opts.genre ?? pick(Object.keys(genres) as Genre[]);
  const base = genres[genre];
  const colors = (opts.vibe ?? []).flatMap(v => moods.get(v.trim().toLowerCase()) ?? []);
  function word(key: keyof typeof base) {
    const palette = colors.length && rng() < 0.45 ? pick(colors) : base;
    return pick(palette[key]);
  }
  const raw = opts.keyword?.trim().replace(/\s+/g,' ') ?? '';
  if (raw && (!/^[a-z]+(?: [a-z]+){0,2}$/.test(fold(raw)) || raw.length > 48 || !clean(raw)))
    throw new RangeError('Use a clean keyword of one to three words.');
  const keyword = raw.toLowerCase().replace(/(^| )\p{L}/gu, s => s.toUpperCase());
  const parts = keyword ? keyword.split(' ').length : 0;
  const names: string[] = [];
  const seen = new Set<string>();
  const sizes = [0,0,0,0];
  let featured = 0;
  let attempts = 0;
  while (names.length < count) {
    if (++attempts > 2000) throw new RangeError('Name pool exhausted for these options.');
    const useKey = !!keyword && featured < Math.ceil(count/2) && names.length % 2 === 0;
    const lengths = [1,2,3,4].filter(n => !useKey || n >= parts);
    const min = Math.min(...lengths.map(n => sizes[n-1]!));
    const length = pick(lengths.filter(n => sizes[n-1] === min));
    const adj = word('adj'), noun = word('noun'), place = word('place'), obj = word('object');
    const plural = irregular[noun] ?? noun + 's';
    const leader = pick(['Ellis','Marlow','Cleo','Alden','Nell','Otis','Vera','Idris']);
    const ensemble = pick(['Trio','Quartet']);
    const root = useKey ? keyword : noun;
    const slots = length - (useKey ? parts : 1);
    let candidates: string[];
    switch (slots) {
      case 0: {
        const tail = pick(['wake','vale','loom','ward','well','mere','wing','fall']);
        candidates = [root + tail, root + fold(obj)];
        if (genre === 'metal') candidates.push(root + 'forge', root + 'grave', root + 'pyre');
        break;
      }
      case 1: {
        const alliterative = [...base.noun, ...base.object, ...base.place, ...base.adj]
          .filter(s => s !== root && s.startsWith(root[0]!));
        candidates = [place + ' ' + root, word('ing') + ' ' + root, root + ' ' + obj,
          root + ' ' + (10 + Math.floor(rng()*90))];
        if (alliterative.length) candidates.push(root + ' ' + pick(alliterative));
        if (genre === 'jazz') candidates.push(...Array(12).fill((useKey ? root : leader) + ' ' + ensemble));
        if (genre === 'indie') candidates.push('Pocket ' + root, 'Borrowed ' + root);
        break;
      }
      case 2:
        candidates = ['The ' + adj + ' ' + (useKey ? root : plural), root + ' After Hours', root + ' & ' + obj];
        if (genre === 'jazz') candidates.push(...Array(8).fill(leader + ' ' + root + ' ' + ensemble));
        break;
      default:
        candidates = [(useKey ? root : obj) + ' & the ' + plural, 'The ' + root + ' of ' + place, root + ' Under the ' + obj];
        if (genre === 'jazz') candidates.push(...Array(8).fill('The ' + leader + ' ' + root + ' ' + ensemble));
    }
    const name = pick(candidates);
    const id = identity(name);
    if (seen.has(id) || reserved(id) || !clean(name)) continue;
    seen.add(id);
    names.push(name);
    sizes[length-1]!++;
    if (useKey) featured++;
    attempts = 0;
  }
  return names;
}

const imagery: Record<string,string[]> = {
  garage:['Side Door','Bare Bulb','Concrete','Oil Rag','Practice Room'],
  ocean:['Low Tide','Breaker','Salt Line','Undertow'],
  night:['Last Bus','Porch Light','Night Shift','Moon'],
  austin:['Limestone','River Bend','Hill Country','Heatwave'],
  rain:['Downpour','Gutter','Tin Roof','Puddle'],
  fire:['Ember','Ash','Kindling','Smoke'],
};
const phrases: Record<Genre,string[]> = {
  rock:['Overdrive','Exit Ramp','Live Wire'], indie:['Porch Weather','Parking Receipt','Sunday Paper','Guest Room'],
  punk:['Late Fee','Noise Complaint','Pay Cut'], metal:['Iron Veil','Ash Vault','Burial Stone'],
  jazz:['Last Set','Blue Hour','Night Porter'], 'hip-hop':['Corner Store','Paper Route','Night Shift'],
  country:['County Line','Gravel Road','Last Acre'], electronic:['Phase Drift','Relay Signal','Glass Grid'],
  pop:['Peach Soda','Flash Photo','Day Trip'], folk:['Field Notes','Mill Pond','Wool Thread'],
};

const endings: Record<Genre,string[]> = {
  indie:['Weather','Receipt','Season','Practice','Cinema','Parade','Radio'],
  punk:['Strike','Violation','Fine','Complaint'], metal:['Pyre','Furnace','Tomb','Mantle'],
  folk:['Almanac','Letter','Hymn','Crossing'], rock:['Static','Drive','Parade','Salvage'],
  jazz:['Sessions','Standard','Transit','Quartet'], electronic:['Carrier','Sequence','Array','Signal'],
  pop:['Hour','Season','Club','Summer'], country:['County','Crossing','Revival','Sunday'],
  'hip-hop':['Ledger','Collective','Edition','Dispatch'],
};

function skeleton(name: string) {
  return identity(name).replace(/vv/g,'w').replace(/v/g,'u').replace(/[aeiou]/g,'').replace(/(.)\1+/g,'$1');
}
const silhouettes = new Set(famous.map(skeleton).filter(Boolean));
export function safeBandName(name: string) {
  return clean(name) && !!identity(name) && !reserved(identity(name)) && !silhouettes.has(skeleton(name));
}

// Change a single word, preserving its initial sound and the literal keyword.
function respell(name: string, keyword: string, rng: () => number) {
  const words = name.split(' ');
  const options = words.flatMap((word,i) => {
    if (word.length < 4 || ['under','after','hours'].includes(word.toLowerCase()) || (keyword && keyword.toLowerCase().split(' ').some(k => word.toLowerCase().includes(k)))) return [];
    const variants = [word.replace(/u/i,'v'),word[0]! + word.slice(1).replace(/[aeiou](?=[a-z])/gi,'')];
    return variants.filter(v => v !== word && v.length >= 3).map(v =>
      words.map((s,j) => j === i ? v.toUpperCase() : s).join(' '));
  });
  return options[Math.floor(rng()*options.length)] ?? name;
}

export function generateNames(opts: NameOptions = {}): string[] {
  const count = opts.count ?? 12;
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid count.');
  if (!count) return [];
  const rng = randomSource(opts.seed ?? Math.random()*2**32);
  const pick = <T>(a: readonly T[]) => a[Math.floor(rng()*a.length)]!;
  const genre = opts.genre ?? pick(Object.keys(genres) as Genre[]);
  const raw = opts.keyword?.trim().replace(/\s+/g,' ') ?? '';
  if (raw && (!/^[a-z]+(?: [a-z]+){0,2}$/.test(fold(raw)) || !clean(raw) || raw.length > 48))
    throw new RangeError('Use a clean keyword of one to three words.');
  const literal = opts.keywordMode === 'inspire' ? '' : raw;
  const pool = new Map<string,{name:string; baseId:string; score:number; featured:boolean}>();
  const chosen: string[] = [];
  const usage = new Map<string,number>();
  const tokens = (s:string) => fold(s).split(' ').filter(w => !['the','of','&','and'].includes(w));
  function offer(base:string, bonus:number) {
    if (!safeBandName(base)) return;
    const name = opts.stylize && rng() < 0.65 ? respell(base,literal,rng) : base;
    if (!safeBandName(name) || name.split(' ').length > 4) return;
    const id = identity(name);
    const featured = !!literal && fold(name).includes(fold(literal));
    const score = rng()*3 + bonus - (/\d/.test(name) ? 1 : 0);
    if (!pool.has(id)) pool.set(id,{name,baseId:identity(base),score,featured});
  }
  // Refresh in bounded chunks to support larger programmatic requests.
  const seen = new Set<string>();
  while (chosen.length < count) {
    pool.clear();
    for (let i=0;i<12;i++) {
      const keyword = opts.keywordMode === 'inspire' && raw ? pick(Object.hasOwn(imagery,fold(raw)) ? imagery[fold(raw)]! : [raw]) : literal;
      for (const name of draw({...opts,genre,keyword,count:12,seed:rng()*2**32})) {
        offer(name, /Trio|Quartet/.test(name) || (genre === 'metal' && !name.includes(' ')) ? 2 : 0);
      }
      const phrase = pick(phrases[genre]);
      offer(phrase,0.5);
      const stem = pick(phrases[genre]).split(' ')[0]!;
      offer(stem+' '+pick(endings[genre]),1);
      if (genre==='indie') offer(pick(['Meet Me','Call Again','Come Back'])+' '+pick(['Sunday','Tomorrow','At Noon','In June']),1);
      if (keyword) offer(keyword.replace(/\b\w/g,c=>c.toUpperCase()) + ' ' + phrase,1);
    }
    let added = 0;
    for (let slot=0;slot<12 && chosen.length<count;slot++) {
      const requireWord = literal && chosen.length % 2 === 0;
      let best = -Infinity, winner = '';
      for (const [id,c] of pool) {
        if (seen.has(id) || seen.has(c.baseId) || (requireWord && !c.featured)) continue;
        const score = c.score - tokens(c.name).reduce((sum,w)=>sum+(usage.get(w)??0)*1.4,0);
        if (score > best) {best=score;winner=id;}
      }
      if (!winner) break;
      const {name} = pool.get(winner)!;
      chosen.push(name);
      seen.add(winner);
      seen.add(pool.get(winner)!.baseId);
      for (const w of tokens(name)) usage.set(w,(usage.get(w)??0)+1);
      added++;
    }
    if (!added) throw new RangeError('Try another keyword or a smaller batch.');
  }
  return chosen;
}
