import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ACTS, MAX_RELEASES, parseActs } from "./journey-validate.ts";

const rel = (i: number) => ({ id: `mb:${i}`, title: `Song ${i}`, type: "Single", year: 2020 });

test("accepts a normal import", () => {
  const acts = parseActs({ acts: [{ name: "The Lows", relation: "band", releases: [rel(1), rel(2)] }] });
  assert.equal(acts?.length, 1);
  assert.equal(acts?.[0].releases.length, 2);
});

test("rejects too many acts or releases before any provider work", () => {
  assert.equal(parseActs({ acts: Array.from({ length: MAX_ACTS + 1 }, () => ({ name: "x", relation: "self", releases: [] })) }), null);
  assert.equal(parseActs({ acts: [{ name: "x", relation: "self", releases: Array.from({ length: MAX_RELEASES + 1 }, (_, i) => rel(i)) }] }), null);
});

test("rejects wrong shapes and long fields", () => {
  assert.equal(parseActs(null), null);
  assert.equal(parseActs({ acts: "nope" }), null);
  assert.equal(parseActs({ acts: [{ name: "x".repeat(121), relation: "self", releases: [] }] }), null);
  assert.equal(parseActs({ acts: [{ name: "x", relation: "owner", releases: [] }] }), null);
  assert.equal(parseActs({ acts: [{ name: "x", relation: "self", releases: [{ id: "a", title: "t".repeat(201), type: "Album" }] }] }), null);
  assert.equal(parseActs({ acts: [{ name: "x", relation: "self", releases: [{ id: "a", title: "t", type: "Album", year: "1999" }] }] }), null);
});
