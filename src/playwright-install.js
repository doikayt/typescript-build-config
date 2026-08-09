#!/usr/bin/env node
import { spawnSync } from "child_process";
import { realpathSync } from "fs";
import { fileURLToPath } from "url";

// Treat CI as active when the CI env var is present and not an explicit falsy
// value. Most CI systems (including GitHub Actions) set CI=true.
export function isCI(env = process.env) {
  const v = env.CI;
  if (v === undefined) return false;
  return v !== "" && v !== "false" && v !== "0";
}

// --with-deps installs OS-level libraries and requires root, so it is only safe
// (and only needed) on Linux CI runners. Everywhere else — dev laptops, NixOS,
// macOS — install just the browser binary.
export function playwrightInstallArgs({ ci, platform }) {
  const args = ["install"];
  if (ci && platform === "linux") args.push("--with-deps");
  args.push("chromium");
  return args;
}

export function run({ env = process.env, platform = process.platform } = {}) {
  const args = [
    "playwright",
    ...playwrightInstallArgs({ ci: isCI(env), platform }),
  ];
  const result = spawnSync("npx", args, { stdio: "inherit" });
  return result.status ?? 1;
}

// This file is both an importable module (unit tests import the pure functions)
// and an executable bin. Guard the CLI action so `run()` — which shells out to
// `playwright install` — fires only when the file is run directly, never on
// import. When launched via the npm `.bin/doikayt-playwright-install` shim,
// argv[1] is a symlink, so realpath both sides before comparing.
function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exit(run());
}
