import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeById, pendingNotIn, settle, type OutboxItem } from "./outbox.ts";

const item = (clientId: string, body = "hi"): OutboxItem => ({ clientId, body, createdAt: "2026-11-25T10:00:00Z", status: "sending" });

test("realtime arriving before the acknowledgment removes only that send", () => {
  const outbox = [item("a"), item("b"), item("c")];
  const stored = [{ id: 10, clientId: "b" }];
  assert.deepEqual(pendingNotIn(outbox, stored).map((o) => o.clientId), ["a", "c"]);
});

test("an acknowledged send disappears once its stored copy shows, even without a client id", () => {
  const outbox = settle([item("a"), item("b")], "a", { storedId: 42 });
  assert.deepEqual(pendingNotIn(outbox, [{ id: 42 }]).map((o) => o.clientId), ["b"]);
});

test("a failure marks one send failed and keeps the others pending", () => {
  const outbox = settle([item("a"), item("b")], "b", { error: "No signal" });
  assert.equal(outbox[0].status, "sending");
  assert.equal(outbox[1].status, "failed");
  assert.equal(outbox[1].error, "No signal");
});

test("two identical texts are two sends", () => {
  const outbox = [item("a", "same"), item("b", "same")];
  assert.equal(pendingNotIn(outbox, [{ id: 1, clientId: "a" }]).length, 1);
});

test("pages merge without duplicates, oldest first", () => {
  const older = [{ id: 1, createdAt: "2026-01-01" }, { id: 2, createdAt: "2026-01-02" }];
  const newest = [{ id: 2, createdAt: "2026-01-02" }, { id: 3, createdAt: "2026-01-03" }];
  assert.deepEqual(mergeById(older, newest).map((m) => m.id), [1, 2, 3]);
});
