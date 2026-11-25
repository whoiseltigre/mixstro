import { test } from "node:test";
import assert from "node:assert/strict";
import { isReturnPath } from "./return-path.ts";

test("only a shared opening path is a return target", () => {
  assert.equal(isReturnPath("/o/42"), true);
  for (const bad of ["//evil.com", "/o/42/../../x", "https://evil.com/o/1", "/o/", "/o/1?x=//evil", "/settings", "/o/abc", "", null, undefined]) {
    assert.equal(isReturnPath(bad as string), false, String(bad));
  }
});
