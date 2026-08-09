import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  existsSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const postinstall = join(repoRoot, "src", "postinstall.js");
const PKG = "@doikayt/fake-consumer";

function makeConsumer() {
  const dir = mkdtempSync(join(tmpdir(), "tbc-postinstall-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: PKG, version: "0.0.1" }),
  );
  return dir;
}

function run(dir) {
  return spawnSync("node", [postinstall], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, INIT_CWD: dir },
  });
}

test("fresh install copies config and pipeline files verbatim", () => {
  const dir = makeConsumer();
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  for (const f of [
    "tsconfig.json",
    "eslint.config.js",
    "prettier.config.js",
    ".github/workflows/release.yml",
    ".github/workflows/verify-npm-token.yml",
    ".changeset/config.json",
    "scripts/auto-changeset.sh",
    "docs/assets/doikayt-logo.png",
    "docs/assets/doikayt-logo.svg",
  ]) {
    assert.ok(existsSync(join(dir, f)), `expected ${f} to be copied`);
  }
  const script = readFileSync(
    join(dir, "scripts", "auto-changeset.sh"),
    "utf8",
  );
  // Copied verbatim: the name is read from package.json at runtime, not baked in.
  assert.ok(
    script.includes(`PACKAGES=("$(node -p "require('./package.json').name")")`),
  );
  assert.doesNotMatch(script, /__PACKAGE_NAME__/);
});

test("second run skips identical pipeline files without warnings", () => {
  const dir = makeConsumer();
  run(dir);
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.doesNotMatch(res.stderr, /WARNING/);
});

test("diverged pipeline file is preserved and produces a diff warning", () => {
  const dir = makeConsumer();
  run(dir);
  const target = join(dir, ".github", "workflows", "release.yml");
  appendFileSync(target, "# local customisation\n");
  const before = readFileSync(target, "utf8");
  const res = run(dir);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /release\.yml differs from canonical version/);
  assert.equal(
    readFileSync(target, "utf8"),
    before,
    "local copy must not be overwritten",
  );
});

test("update-all-format in package.json scripts suppresses the warning", () => {
  const dir = makeConsumer();
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: PKG,
      version: "0.0.1",
      scripts: { "update-all-format": "prettier --write src/" },
    }),
  );
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.doesNotMatch(res.stderr, /Missing target: update-all-format/);
});

test("update-all-format in project.json targets suppresses the warning", () => {
  const dir = makeConsumer();
  writeFileSync(
    join(dir, "project.json"),
    JSON.stringify({
      targets: { "update-all-format": { executor: "nx:run-commands" } },
    }),
  );
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.doesNotMatch(res.stderr, /Missing target: update-all-format/);
});

test("second run skips identical asset files without warnings", () => {
  const dir = makeConsumer();
  run(dir);
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.doesNotMatch(
    res.stderr,
    /doikayt-logo.*WARNING|WARNING.*doikayt-logo/,
  );
});

test("diverged asset file is preserved and produces a warning", () => {
  const dir = makeConsumer();
  run(dir);
  const target = join(dir, "docs", "assets", "doikayt-logo.svg");
  const before = readFileSync(target, "utf8");
  appendFileSync(target, "<!-- local edit -->\n");
  const res = run(dir);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /doikayt-logo\.svg differs from canonical version/);
  assert.equal(
    readFileSync(target, "utf8"),
    before + "<!-- local edit -->\n",
    "local copy must not be overwritten",
  );
});

test("missing update-all-format in both package.json and project.json prints a warning, exit 0", () => {
  const dir = makeConsumer();
  const res = run(dir);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /Missing target: update-all-format/);
  assert.match(res.stderr, /update-all-format/);
});

test("ci in package.json scripts suppresses the ci warning", () => {
  const dir = makeConsumer();
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: PKG,
      version: "0.0.1",
      scripts: { ci: "npm run check-all-format && vitest run" },
    }),
  );
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.doesNotMatch(res.stderr, /Missing target: ci/);
});

test("missing ci prints a warning, exit 0", () => {
  const dir = makeConsumer();
  const res = run(dir);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /Missing target: ci/);
});

test("ci as an NX target only (no package.json shim) still warns", () => {
  const dir = makeConsumer();
  writeFileSync(
    join(dir, "project.json"),
    JSON.stringify({ targets: { ci: { executor: "nx:run-commands" } } }),
  );
  const res = run(dir);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /Missing target: ci/);
});

test("both ci and update-all-format missing prints both warnings", () => {
  const dir = makeConsumer();
  const res = run(dir);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /Missing target: ci/);
  assert.match(res.stderr, /Missing target: update-all-format/);
});
