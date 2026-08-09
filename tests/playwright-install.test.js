import { test } from "node:test";
import assert from "node:assert/strict";
import { isCI, playwrightInstallArgs } from "../src/playwright-install.js";

test("playwrightInstallArgs: CI on linux uses --with-deps", () => {
  assert.deepEqual(playwrightInstallArgs({ ci: true, platform: "linux" }), [
    "install",
    "--with-deps",
    "chromium",
  ]);
});

test("playwrightInstallArgs: non-CI on linux omits --with-deps", () => {
  assert.deepEqual(playwrightInstallArgs({ ci: false, platform: "linux" }), [
    "install",
    "chromium",
  ]);
});

test("playwrightInstallArgs: CI on macOS omits --with-deps", () => {
  assert.deepEqual(playwrightInstallArgs({ ci: true, platform: "darwin" }), [
    "install",
    "chromium",
  ]);
});

test("playwrightInstallArgs: CI on windows omits --with-deps", () => {
  assert.deepEqual(playwrightInstallArgs({ ci: true, platform: "win32" }), [
    "install",
    "chromium",
  ]);
});

test("isCI: true when CI is a truthy value", () => {
  assert.equal(isCI({ CI: "true" }), true);
  assert.equal(isCI({ CI: "1" }), true);
});

test("isCI: false when CI is unset or a falsy value", () => {
  assert.equal(isCI({}), false);
  assert.equal(isCI({ CI: "" }), false);
  assert.equal(isCI({ CI: "false" }), false);
  assert.equal(isCI({ CI: "0" }), false);
});
