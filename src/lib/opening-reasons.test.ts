import { test } from "node:test";
import assert from "node:assert/strict";
import { reasonsFor, statusLine } from "./opening-reasons.ts";

test("reciprocal fit and shared days lead, phrased as weekdays not availability", () => {
  assert.deepEqual(reasonsFor({ reciprocal: true, sharedDays: ["Tue", "Thu"], sharedArtists: 2, miles: 6 }, "bassist"), [
    "Looking for a bassist",
    "Also rehearses Tuesdays and Thursdays",
    "2 artists in common",
    "6 mi away",
  ]);
});

test("only supported reasons appear", () => {
  assert.deepEqual(reasonsFor({ reciprocal: false, sharedDays: [], sharedArtists: 0, miles: null }), []);
  assert.deepEqual(reasonsFor({ reciprocal: true, sharedDays: [], sharedArtists: 1, miles: 1 }), ["1 artist in common", "Nearby"]);
});

test("status line", () => {
  const now = Date.parse("2026-11-25T12:00:00Z");
  assert.equal(statusLine("open", "2026-12-04T12:00:00Z", now), "Open · 9 days left");
  assert.equal(statusLine("filled", null, now), "Filled");
  assert.equal(statusLine("open", "2026-11-25T13:00:00Z", now), "Open · 1 day left");
});
