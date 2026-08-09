import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalScripts,
  devDependencyNames,
  packageFields,
} from "../src/canonical-scripts.js";

const BASE = {
  ci: "npm run check-all-format && npm run test",
  build: "tsc",
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

test("canonicalScripts: console app has no e2e, no prepack, and a plain ci", () => {
  assert.deepEqual(canonicalScripts({ ui: false }), BASE);
});

test("canonicalScripts: a library adds prepack; an app does not", () => {
  assert.equal(canonicalScripts({ library: true }).prepack, "npm run build");
  assert.equal(canonicalScripts({ library: false }).prepack, undefined);
  // build is universal — present either way
  assert.equal(canonicalScripts({ library: false }).build, "tsc");
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

test("devDependencyNames: console project includes typescript + changesets", () => {
  assert.deepEqual(devDependencyNames({ ui: false }), [
    "vitest",
    "@doikayt/autogen-markdown-doc",
    "typescript",
    "@changesets/cli",
  ]);
});

test("devDependencyNames: UI project adds @playwright/test", () => {
  assert.deepEqual(devDependencyNames({ ui: true }), [
    "vitest",
    "@doikayt/autogen-markdown-doc",
    "typescript",
    "@changesets/cli",
    "@playwright/test",
  ]);
});

test("packageFields: a library gets ESM publish config at the built dist/index", () => {
  const f = packageFields({ library: true });
  assert.equal(f.type, "module");
  assert.equal(f.main, "dist/index.js");
  assert.equal(f.types, "dist/index.d.ts");
  assert.deepEqual(f.files, ["dist"]);
  assert.equal(f.exports["."].default, "./dist/index.js");
  assert.equal(f.exports["."].types, "./dist/index.d.ts");
  assert.equal(f.private, undefined);
});

test("packageFields: an app is private ESM with no library entry points", () => {
  const f = packageFields({ library: false });
  assert.equal(f.type, "module");
  assert.equal(f.private, true);
  assert.equal(f.main, undefined);
  assert.equal(f.types, undefined);
  assert.equal(f.exports, undefined);
  assert.equal(f.files, undefined);
});
