import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import * as childProcess from "node:child_process";
import { tmpdir } from "os";
import { join } from "path";
import { npmExecutableName, runNew } from "../src/new-package.js";

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

test("new: uses npm.cmd on Windows", () => {
  const originalPlatform = process.platform;
  Object.defineProperty(process, "platform", {
    value: "win32",
    configurable: true,
  });
  try {
    assert.equal(npmExecutableName(), "npm.cmd");
  } finally {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  }
});

test("new: shells out through cmd.exe on Windows so npm.cmd can spawn in Git Bash", () => {
  const originalPlatform = process.platform;
  Object.defineProperty(process, "platform", {
    value: "win32",
    configurable: true,
  });

  const original = childProcess.spawnSync;
  const calls = [];

  try {
    Object.defineProperty(childProcess, "spawnSync", {
      value: (cmd, args, opts) => {
        calls.push({ cmd, args, opts });
        return { status: 0, error: undefined };
      },
      configurable: true,
    });

    const dir = mkdtempSync(join(tmpdir(), "tbc-new-shell-"));
    runNew({
      cwd: dir,
      npmInit: (cwd) =>
        writeFileSync(
          join(cwd, "package.json"),
          JSON.stringify({ name: "demo" }, null, 2) + "\n",
        ),
      log: silent,
    });

    assert.ok(calls.length > 0, "expected spawnSync to be called");
    assert.equal(calls[0].opts.shell, true);
  } finally {
    Object.defineProperty(childProcess, "spawnSync", {
      value: original,
      configurable: true,
    });
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  }
});
