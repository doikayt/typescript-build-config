import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runInit } from "../src/init.js";

function makeConsumer(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tbc-init-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      { name: "@x/consumer", version: "0.0.1", ...extra },
      null,
      2,
    ) + "\n",
  );
  return dir;
}

const fakeVersions = (names) =>
  Object.fromEntries(names.map((n) => [n, "^9.9.9"]));
const silent = () => {};

test("console project: writes canonical scripts + devDeps, no e2e", async () => {
  const dir = makeConsumer();
  await runInit({
    cwd: dir,
    prompt: async () => false,
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.scripts.ci, "npm run check-all-format && npm run test");
  assert.equal(pkg.scripts["update-markdown-docs"], "autogen-markdown-doc");
  assert.equal(pkg.scripts["test:e2e"], undefined);
  assert.equal(pkg.devDependencies.vitest, "^9.9.9");
  assert.equal(pkg.devDependencies["@doikayt/autogen-markdown-doc"], "^9.9.9");
  assert.equal(pkg.devDependencies["@playwright/test"], undefined);
});

test("UI project: adds test:e2e, folds into ci, declares @playwright/test", async () => {
  const dir = makeConsumer();
  await runInit({
    cwd: dir,
    prompt: async () => true,
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(
    pkg.scripts.ci,
    "npm run check-all-format && npm run test && npm run test:e2e",
  );
  assert.equal(
    pkg.scripts["test:e2e"],
    "doikayt-playwright-install && playwright test",
  );
  assert.equal(pkg.devDependencies["@playwright/test"], "^9.9.9");
});

test("never clobbers an existing script", async () => {
  const dir = makeConsumer({ scripts: { ci: "my custom ci" } });
  await runInit({
    cwd: dir,
    prompt: async () => false,
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.scripts.ci, "my custom ci");
  assert.equal(pkg.scripts.test, "vitest run");
});

test("idempotent: a second run changes nothing", async () => {
  const dir = makeConsumer();
  const opts = {
    cwd: dir,
    prompt: async () => false,
    resolveDevVersions: fakeVersions,
    log: silent,
  };
  await runInit(opts);
  const first = readFileSync(join(dir, "package.json"), "utf8");
  await runInit(opts);
  const second = readFileSync(join(dir, "package.json"), "utf8");
  assert.equal(first, second);
});

test("console project seeds vitest.config.ts but not playwright.config.ts", async () => {
  const dir = makeConsumer();
  await runInit({
    cwd: dir,
    prompt: async () => false,
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  assert.ok(existsSync(join(dir, "vitest.config.ts")));
  assert.ok(!existsSync(join(dir, "playwright.config.ts")));
});

test("UI project seeds both vitest and playwright configs", async () => {
  const dir = makeConsumer();
  await runInit({
    cwd: dir,
    prompt: async () => true,
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  assert.ok(existsSync(join(dir, "vitest.config.ts")));
  const pw = readFileSync(join(dir, "playwright.config.ts"), "utf8");
  assert.match(pw, /definePlaywrightConfig/);
});

test("does not overwrite an existing config file", async () => {
  const dir = makeConsumer();
  writeFileSync(join(dir, "vitest.config.ts"), "// mine\n");
  await runInit({
    cwd: dir,
    prompt: async () => false,
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  assert.equal(
    readFileSync(join(dir, "vitest.config.ts"), "utf8"),
    "// mine\n",
  );
});
