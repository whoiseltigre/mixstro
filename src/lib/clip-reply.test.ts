import { test } from "node:test";
import assert from "node:assert/strict";
import { boundClipAt, clipTime, messagePreview, parseClipTime } from "./clip-reply.ts";

test("clip times read the way musicians write them", () => {
  assert.equal(clipTime(83), "1:23");
  assert.equal(clipTime(3723), "1:02:03");
  assert.equal(parseClipTime("1:23"), 83);
  assert.equal(parseClipTime("83"), 83);
  assert.equal(parseClipTime(""), null);
  assert.equal(parseClipTime("1:75"), "invalid");
  assert.equal(parseClipTime("abc"), "invalid");
  assert.equal(parseClipTime("7:00:01"), "invalid");
});

test("moments stay inside the clip", () => {
  assert.equal(boundClipAt(undefined), null);
  assert.equal(boundClipAt(120, 200), 120);
  assert.equal(boundClipAt(201, 200), "invalid");
  assert.equal(boundClipAt(-1), "invalid");
  assert.equal(boundClipAt(1.5), "invalid");
  assert.equal(boundClipAt(5000, null), 5000);
});

test("previews never call a clip a voice note", () => {
  assert.equal(messagePreview({ body: "hey" }), "hey");
  assert.equal(messagePreview({ body: null, voice_url: "x" }), "Voice note");
  assert.equal(messagePreview({ body: null, voice_url: null }), "Sent a clip");
  assert.equal(messagePreview({ body: null, clipAt: 83 }), "Sent a clip at 1:23");
});
