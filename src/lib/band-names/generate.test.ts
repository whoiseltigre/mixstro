import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNames, safeBandName } from './generate.ts';
import { checkAvailability } from './availability.ts';
import { clean, famous, fold, genres, identity, moods } from './wordlists.ts';
import type { Genre } from './wordlists.ts';

const words = (s: string) => fold(s).replace(/&/g,' ').split(/[^a-z']+/).map(w => w.replace(/'s$|s$/,'')).filter(w => w.length > 1 && !['the','of','and','a','in','at','to','on','under','after'].includes(w));

test('seeded batches reproduce, vary across seeds and respect word limits', () => {
  const names = generateNames({seed:0});
  assert.equal(names.length, 12);
  assert.deepEqual(names, generateNames({seed:0}));
  assert.notDeepEqual(names, generateNames({seed:1}));
  assert.ok(names.every(n => n.split(' ').length <= 4));
});

test('every curated name is clean, safe and not a famous band', () => {
  const all = [...Object.values(genres).flatMap(g => g.names), ...[...moods.values()].flat()];
  for (const n of all) assert.ok(safeBandName(n), n);
});

test('all genres yield clean distinct names outside the famous catalog', () => {
  const catalog = new Set(famous.map(identity));
  assert.ok(catalog.size >= 290);
  for (const genre of Object.keys(genres) as Genre[]) {
    const batch = generateNames({genre,seed:25,count:80});
    const keys = batch.map(identity);
    assert.equal(new Set(keys).size,80);
    assert.ok(batch.every(clean));
    assert.ok(keys.every(key => !catalog.has(key)));
  }
});

test('a batch of twelve never repeats a word, across genres, vibes and seeds', () => {
  for (const genre of [undefined, ...Object.keys(genres)] as (Genre|undefined)[])
    for (const seed of [1,2,3,4,5]) for (const vibe of [[], ['dark'], ['funny']]) {
      const ws = generateNames({genre,seed,vibe}).flatMap(words);
      assert.equal(new Set(ws).size, ws.length, `${genre} ${seed} ${vibe}: ${ws}`);
    }
});

test('the next batch leaves out the names already on screen', () => {
  const first = generateNames({genre:'rock',seed:4});
  const next = generateNames({genre:'rock',seed:5,exclude:first});
  assert.ok(next.every(n => !first.includes(n)));
});

test('vibe and jazz ensembles change the vocabulary', () => {
  const jazz = generateNames({genre:'jazz',seed:3,count:40});
  assert.ok(jazz.filter(n => /Trio|Quartet|Quintet|Sextet|Five/.test(n)).length >= 5);
  const indie = generateNames({genre:'indie',seed:3,vibe:['funny']});
  const funny = new Set(moods.get('funny'));
  assert.ok(indie.filter(n => funny.has(n)).length >= 3);
});

test('half the batch features a typed word, and bad words are refused', () => {
  for (const keyword of ['Ember','Copper Moon','Beneath Blue Skies']) {
    const names = generateNames({keyword,count:12,seed:15});
    assert.ok(names.filter(n => n.includes(keyword)).length >= 6, names.join());
    assert.ok(names.every(n => n.split(' ').length <= 4));
  }
  assert.throws(() => generateNames({keyword:'mAtCh'}),RangeError);
  assert.throws(() => generateNames({keyword:'shit'}),RangeError);
  assert.deepEqual(generateNames({count:0}),[]);
});

test('lookups combine MusicBrainz and Apple Music, retry busy replies and recover from failures', async t => {
  const mb: (unknown[] | number | null)[] = [
    [{name:'Other Act',score:97},{name:'COPPER REED',score:85}],
    [{name:'The Copper-Reed',score:80}],
    [{name:'Other Act',score:'90'}],
    503, [{name:'Other Act',score:89}],
    null, null, null,
    [],
  ];
  const apple: (unknown[] | null)[] = [[], [], [], [], null, [{artistName:'Empty'}]];
  const starts: number[] = [];
  t.mock.method(globalThis,'fetch', (url: URL) => {
    if (url.hostname === 'itunes.apple.com') {
      const results = apple.shift();
      if (!results) throw new Error('offline');
      return Response.json({results});
    }
    starts.push(performance.now());
    assert.ok(url.searchParams.get('query')?.startsWith('artist:'));
    const artists = mb.shift();
    if (artists === null || artists === undefined) throw new Error('offline');
    if (typeof artists === 'number') return new Response('busy', {status: artists});
    return Response.json({artists});
  });
  const results = await Promise.all(['Copper Reed','Copper-Reed','Other','Quiet','Failure','Empty'].map(checkAvailability));
  assert.deepEqual(results.map(x => x.status),['taken','similar','similar','available','unknown','taken']);
  assert.deepEqual(results[0]?.matches,['Other Act','COPPER REED']);
  assert.deepEqual(results[4]?.matches,[]);
  assert.deepEqual(results[5]?.matches,['Empty']);
  assert.ok(starts.slice(1).every((n,i) => n-starts[i]! >= 1000));
});

test('stylized only changes case, never spelling, and screens famous respellings', () => {
  for (const s of ['CHRCHS','CHVRCHES','Churches','RDOHD','NIRVNA','PVRIS','ALVVAYS']) assert.equal(safeBandName(s),false,s);
  const plain = generateNames({genre:'punk',seed:8});
  const styled = generateNames({genre:'punk',seed:8,stylize:true});
  assert.deepEqual(styled.map(n => n.toLowerCase()), plain.map(n => n.toLowerCase()));
  assert.ok(styled.some(n => n === n.toUpperCase()));
  const themed = generateNames({genre:'folk',keyword:'garage',keywordMode:'inspire',seed:2});
  assert.ok(themed.some(n => /Side Door|Bare Bulb|Concrete|Oil Rag|Practice Room|Workbench|Extension Cord/i.test(n)), themed.join());
  assert.ok(themed.every(n => !/garage/i.test(n)));
});
