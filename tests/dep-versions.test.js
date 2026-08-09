import { test } from "node:test";
import assert from "node:assert/strict";
import { toCaretRange, resolveVersions } from "../src/dep-versions.js";

test("toCaretRange prefixes a caret", () => {
  assert.equal(toCaretRange("2.1.3"), "^2.1.3");
});

test("resolveVersions maps each name to ^<latest> via the injected view fn", () => {
  const view = (name) => ({ a: "1.0.0", b: "2.3.4" })[name];
  assert.deepEqual(resolveVersions(["a", "b"], view), {
    a: "^1.0.0",
    b: "^2.3.4",
  });
});

test("resolveVersions falls back to 'latest' when the view fn throws", () => {
  const view = (name) => {
    if (name === "b") throw new Error("offline");
    return "1.0.0";
  };
  assert.deepEqual(resolveVersions(["a", "b"], view), {
    a: "^1.0.0",
    b: "latest",
  });
});

test("resolveVersions falls back to 'latest' on an empty version", () => {
  const view = () => "";
  assert.deepEqual(resolveVersions(["a"], view), { a: "latest" });
});
