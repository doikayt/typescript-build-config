import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalScripts,
  devDependencyNames,
} from "../src/canonical-scripts.js";

const BASE = {
  ci: "npm run check-all-format && npm run test",
  test: "vitest run",
  "update-all-format":
    "npm run update-code-formatting && npm run update-markdown-docs",
  "update-code-formatting": "prettier --write src/",
  "update-markdown-docs": "autogen-markdown-doc",
  "check-all-format":
    "npm run check-code-formatting && npm run check-markdown-docs",
  "check-code-formatting": "prettier --check src/",
  "check-markdown-docs": "autogen-markdown-doc check",
};

test("canonicalScripts: console project has no e2e and a plain ci", () => {
  assert.deepEqual(canonicalScripts({ ui: false }), BASE);
});

test("canonicalScripts: UI project adds test:e2e and folds it into ci", () => {
  const s = canonicalScripts({ ui: true });
  assert.equal(
    s.ci,
    "npm run check-all-format && npm run test && npm run test:e2e",
  );
  assert.equal(s["test:e2e"], "doikayt-playwright-install && playwright test");
  // the rest of the set is unchanged
  for (const k of Object.keys(BASE)) {
    if (k === "ci") continue;
    assert.equal(s[k], BASE[k]);
  }
});

test("devDependencyNames: console project", () => {
  assert.deepEqual(devDependencyNames({ ui: false }), [
    "vitest",
    "@doikayt/autogen-markdown-doc",
  ]);
});

test("devDependencyNames: UI project adds @playwright/test", () => {
  assert.deepEqual(devDependencyNames({ ui: true }), [
    "vitest",
    "@doikayt/autogen-markdown-doc",
    "@playwright/test",
  ]);
});
