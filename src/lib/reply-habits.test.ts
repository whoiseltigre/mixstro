import { test } from "node:test";
import assert from "node:assert/strict";
import { replyHabit } from "./reply-habits.ts";

test("says nothing until there's enough to judge", () => {
  assert.deepEqual(replyHabit(undefined), { slow: false });
  assert.deepEqual(replyHabit({ asked: 2, answered: 0, medianHours: null }), { slow: false });
});

test("fast, reliable repliers get a line", () => {
  assert.equal(replyHabit({ asked: 4, answered: 4, medianHours: 5 }).label, "Usually replies within a day");
  assert.equal(replyHabit({ asked: 4, answered: 3, medianHours: 40 }).label, "Usually replies within a few days");
  assert.equal(replyHabit({ asked: 3, answered: 3, medianHours: null }).label, "Usually replies");
});

test("middling repliers get nothing, poor ones are ranked lower but never labelled", () => {
  assert.deepEqual(replyHabit({ asked: 10, answered: 5, medianHours: 2 }), { slow: false });
  const poor = replyHabit({ asked: 10, answered: 1, medianHours: 2 });
  assert.equal(poor.slow, true);
  assert.equal(poor.label, undefined);
});
