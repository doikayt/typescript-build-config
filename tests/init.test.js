import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "fs";
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

// Prompt keyed on the question text so a test can answer the UI and demo
// questions independently. Defaults demo to No so tests never shell out unless
// they opt in explicitly.
const answers =
  ({ ui = false, demo = false, library = false } = {}) =>
  async (question) =>
    /demo/i.test(question)
      ? demo
      : /publishable library/i.test(question)
        ? library
        : /ui project|playwright/i.test(question)
          ? ui
          : false;

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

test("init (default app): universal build, marked private, no library fields", async () => {
  const dir = makeConsumer();
  await runInit({
    cwd: dir,
    prompt: async () => false,
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.scripts.build, "tsc"); // build is universal
  assert.equal(pkg.devDependencies.typescript, "^9.9.9");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.private, true);
  // apps don't publish: no prepack, no library entry points
  assert.equal(pkg.scripts.prepack, undefined);
  assert.equal(pkg.main, undefined);
  assert.equal(pkg.exports, undefined);
  assert.equal(pkg.files, undefined);
});

test("init (library): adds prepack + dist publish fields, not private", async () => {
  const dir = makeConsumer();
  await runInit({
    cwd: dir,
    prompt: answers({ library: true }),
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.scripts.prepack, "npm run build");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.main, "dist/index.js");
  assert.equal(pkg.types, "dist/index.d.ts");
  assert.deepEqual(pkg.files, ["dist"]);
  assert.equal(pkg.exports["."].default, "./dist/index.js");
  assert.equal(pkg.private, undefined);
});

test("init (library): scopes an unscoped name to @doikayt (Enter = default)", async () => {
  const dir = makeConsumer({ name: "scratch-pad" });
  await runInit({
    cwd: dir,
    prompt: answers({ library: true }),
    promptText: async () => "", // accept the suggested default
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.name, "@doikayt/scratch-pad");
});

test("init (library): a bare typed name is scoped; a scoped one is kept", async () => {
  const bare = makeConsumer({ name: "scratch-pad" });
  await runInit({
    cwd: bare,
    prompt: answers({ library: true }),
    promptText: async () => "my-lib",
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  assert.equal(
    JSON.parse(readFileSync(join(bare, "package.json"), "utf8")).name,
    "@doikayt/my-lib",
  );

  const scoped = makeConsumer({ name: "scratch-pad" });
  await runInit({
    cwd: scoped,
    prompt: answers({ library: true }),
    promptText: async () => "@datalackey/thing",
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  assert.equal(
    JSON.parse(readFileSync(join(scoped, "package.json"), "utf8")).name,
    "@datalackey/thing",
  );
});

test("init (app): never prompts for a name and leaves it unchanged", async () => {
  const dir = makeConsumer({ name: "my-app" });
  let textCalls = 0;
  await runInit({
    cwd: dir,
    prompt: async () => false, // app
    promptText: async () => {
      textCalls++;
      return "";
    },
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.name, "my-app");
  assert.equal(textCalls, 0);
});

test("init replaces npm init -y's placeholder test script and main", async () => {
  // Simulate `npm init -y` output.
  const dir = makeConsumer({
    main: "index.js",
    scripts: { test: 'echo "Error: no test specified" && exit 1' },
  });
  await runInit({
    cwd: dir,
    prompt: answers({ library: true }),
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.scripts.test, "vitest run"); // not the echo stub
  assert.equal(pkg.main, "dist/index.js"); // not index.js
});

test("init drops npm's placeholder main for an app (no library entry)", async () => {
  const dir = makeConsumer({ main: "index.js" });
  await runInit({
    cwd: dir,
    prompt: async () => false, // app
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.main, undefined);
  assert.equal(pkg.scripts.test, "vitest run");
});

test("init never clobbers publish fields a library consumer already set", async () => {
  const dir = makeConsumer({ type: "commonjs", main: "lib/entry.js" });
  await runInit({
    cwd: dir,
    prompt: answers({ library: true }),
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.type, "commonjs");
  assert.equal(pkg.main, "lib/entry.js");
});

test("UI project: adds test:e2e, folds into ci, declares @playwright/test", async () => {
  const dir = makeConsumer();
  await runInit({
    cwd: dir,
    prompt: answers({ ui: true }),
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
    prompt: answers({ ui: true }),
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

test("demo declined (default): seeds nothing", async () => {
  const dir = makeConsumer();
  const res = await runInit({
    cwd: dir,
    prompt: answers({}),
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  assert.equal(existsSync(join(dir, "src")), false);
  assert.equal(existsSync(join(dir, "README.md")), false);
  assert.equal(existsSync(join(dir, "project.json")), false);
  assert.equal(res.demo.scaffolded, false);
  assert.equal(res.demo.reason, "declined");
});

test("demo opt-in on an empty project: seeds src module, README, project.json", async () => {
  const dir = makeConsumer();
  const res = await runInit({
    cwd: dir,
    prompt: answers({ demo: true }),
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  // src module copied recursively into src/, entry + component present.
  assert.ok(existsSync(join(dir, "src", "index.ts")));
  assert.ok(existsSync(join(dir, "src", "math-engine", "MathEngine.ts")));
  assert.ok(existsSync(join(dir, "src", "math-engine", "_COMPONENT_INFO.md")));
  // README with doc-generator markers + project.json seeded at the root.
  const readme = readFileSync(join(dir, "README.md"), "utf8");
  assert.match(readme, /<!-- UML:component-details:START -->/);
  assert.match(readme, /<!-- NX_GRAPH:START -->/);
  assert.ok(existsSync(join(dir, "project.json")));
  // No demo package.json or config files come along (init already set those up).
  assert.equal(existsSync(join(dir, "src", "package.json")), false);
  assert.equal(res.demo.scaffolded, true);
  assert.deepEqual(res.demo.wrote, [
    "src/ module",
    "README.md",
    "project.json",
  ]);
});

test("demo is non-destructive: keeps existing src and README, seeds only the gap", async () => {
  const dir = makeConsumer();
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "app.ts"), "// mine\n");
  writeFileSync(join(dir, "README.md"), "# mine\n");
  const res = await runInit({
    cwd: dir,
    prompt: answers({ demo: true }),
    resolveDevVersions: fakeVersions,
    log: silent,
  });
  // Existing src/ and README untouched; no starter component dropped in.
  assert.equal(readFileSync(join(dir, "src", "app.ts"), "utf8"), "// mine\n");
  assert.equal(existsSync(join(dir, "src", "math-engine")), false);
  assert.equal(readFileSync(join(dir, "README.md"), "utf8"), "# mine\n");
  // Only the missing project.json is seeded.
  assert.ok(existsSync(join(dir, "project.json")));
  assert.deepEqual(res.demo.wrote, ["project.json"]);
  assert.deepEqual(res.demo.skipped, ["src/ (already has files)", "README.md"]);
});
