import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runNew } from "../src/new-package.js";

const silent = () => {};

// Stand-in for `npm init -y`: writes a package.json with the given name.
const fakeNpmInit = (name) => (cwd) =>
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify({ name, version: "1.0.0" }, null, 2) + "\n",
  );

test("new: scopes an unscoped name to @doikayt", () => {
  const dir = mkdtempSync(join(tmpdir(), "tbc-new-"));
  const res = runNew({
    cwd: dir,
    npmInit: fakeNpmInit("scratch-pad"),
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.name, "@doikayt/scratch-pad");
  assert.equal(res.changed, true);
});

test("new: leaves an already-scoped name alone (any scope)", () => {
  const dir = mkdtempSync(join(tmpdir(), "tbc-new-"));
  const res = runNew({
    cwd: dir,
    npmInit: fakeNpmInit("@datalackey/thing"),
    log: silent,
  });
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.name, "@datalackey/thing");
  assert.equal(res.changed, false);
});

test("new: an already-@doikayt name is unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "tbc-new-"));
  const res = runNew({
    cwd: dir,
    npmInit: fakeNpmInit("@doikayt/keep"),
    log: silent,
  });
  assert.equal(
    JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name,
    "@doikayt/keep",
  );
  assert.equal(res.changed, false);
});
