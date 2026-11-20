import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNames, safeBandName } from './generate.ts';
import { checkAvailability } from './availability.ts';
import { clean, famous, genres, identity } from './wordlists.ts';
import type { Genre } from './wordlists.ts';

test('seeded batches reproduce, vary across seeds and respect word limits', () => {
  const names = generateNames({seed:0});
  assert.deepEqual(names, generateNames({seed:0}));
  assert.notDeepEqual(names, generateNames({seed:1}));
  assert.ok(names.every(n => n.split(' ').length <= 4));
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

test('ensembles favor jazz, and vibe changes the vocabulary', () => {
  const jazz = generateNames({genre:'jazz',seed:3,count:40});
  assert.ok(jazz.filter(n => /Trio|Quartet/.test(n)).length >= 5);
  const indie = generateNames({genre:'indie',seed:3,count:40,vibe:['funny']});
  assert.ok(indie.some(n => /Pickle|Kazoo|Noodle|Wonky|Muffin|Wobbl|Spatula/i.test(n)));
});

test('odd batches feature the keyword in at least half, including phrases', () => {
  for (const keyword of ['Ember','Copper Moon','Beneath Blue Skies']) {
    const names = generateNames({keyword,count:21,seed:15});
    assert.ok(names.filter(n => n.includes(keyword)).length >= 11);
    assert.ok(names.every(n => n.split(' ').length <= 4));
  }
  assert.throws(() => generateNames({keyword:'mAtCh'}),RangeError);
  assert.throws(() => generateNames({keyword:'shit'}),RangeError);
  assert.deepEqual(generateNames({count:0}),[]);
});

test('queued lookups classify results and recover from failures', async t => {
  const fixtures = [
    [{name:'Other Act',score:97},{name:'COPPER REED',score:85}],
    [{name:'The Copper-Reed',score:80}],
    [{name:'Other Act',score:'90'}],
    [{name:'Other Act',score:89}], null, [],
  ];
  const starts: number[] = [];
  t.mock.method(globalThis,'fetch', (url: URL, init: RequestInit) => {
    starts.push(performance.now());
    assert.ok(url.searchParams.get('query')?.startsWith('artist:'));
    assert.equal(new Headers(init.headers).get('Accept'),'application/json');
    const artists = fixtures.shift();
    if (!artists) throw new Error('offline');
    return Response.json({artists});
  });
  const results = await Promise.all(['Copper Reed','Copper-Reed','Other','Quiet','Failure','Empty'].map(checkAvailability));
  assert.deepEqual(results.map(x => x.status),['taken','similar','similar','available','unknown','available']);
  assert.deepEqual(results[0]?.matches,['Other Act','COPPER REED']);
  assert.deepEqual(results[4]?.matches,[]);
  assert.ok(starts.slice(1).every((n,i) => n-starts[i]! >= 1000));
});

test('stylization screens vowel substitutions, echoes and original spellings', () => {
  for (const s of ['CHRCHS','CHVRCHES','Churches','RDOHD','NIRVNA','PVRIS','ALVVAYS']) assert.equal(safeBandName(s),false,s);
  const opts={genre:'indie' as const,seed:8,stylize:true,keyword:'Rain'};
  const names=generateNames(opts);
  assert.deepEqual(names,generateNames(opts));
  assert.ok(names.some(n=>/[A-Z]{3}/.test(n)));
  assert.ok(names.every(safeBandName));
  assert.ok(names.filter(n=>n.includes('Rain')).length>=6);
  const themed=generateNames({...opts,keyword:'garage',keywordMode:'inspire'});
  assert.ok(themed.some(n=>/Side Door|Bare Bulb|Concrete|Oil Rag|Practice Room/i.test(n)));
});
