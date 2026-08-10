import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INSTALL = fileURLToPath(
  new URL("../assets/shell/install.sh", import.meta.url),
);

// Run install.sh against an isolated HOME so it can't touch the real rc files.
function runInstall({ shell = "/bin/bash", home } = {}) {
  const HOME = home || mkdtempSync(join(tmpdir(), "tbc-install-"));
  const env = { ...process.env, HOME, SHELL: shell };
  const res = spawnSync("bash", [INSTALL], { encoding: "utf8", env });
  return { HOME, out: (res.stdout || "") + (res.stderr || ""), status: res.status };
}

test("creates ~/.bashrc when no rc exists (fresh account)", () => {
  const { HOME, out, status } = runInstall({
    shell: "/run/current-system/sw/bin/bash",
  });
  assert.equal(status, 0);
  const rc = join(HOME, ".bashrc");
  assert.ok(existsSync(rc), "~/.bashrc should be created");
  assert.match(readFileSync(rc, "utf8"), /aliases\.sh/);
  assert.match(out, /Created .*\.bashrc/);
});

test("creates ~/.zshrc (not ~/.bashrc) when SHELL is zsh and no rc exists", () => {
  const { HOME, status } = runInstall({
    shell: "/run/current-system/sw/bin/zsh",
  });
  assert.equal(status, 0);
  assert.ok(existsSync(join(HOME, ".zshrc")), "~/.zshrc should be created");
  assert.ok(
    !existsSync(join(HOME, ".bashrc")),
    "~/.bashrc should not be created for a zsh user",
  );
});

test("appends to an existing rc and is idempotent on re-run", () => {
  const home = mkdtempSync(join(tmpdir(), "tbc-install-"));
  writeFileSync(join(home, ".bashrc"), "# existing\n");

  const first = runInstall({ home });
  assert.equal(first.status, 0);
  assert.match(first.out, /Added source line/);

  const second = runInstall({ home });
  assert.equal(second.status, 0);
  assert.match(second.out, /Already sourced/);

  const body = readFileSync(join(home, ".bashrc"), "utf8");
  assert.equal(
    (body.match(/aliases\.sh/g) || []).length,
    1,
    "source line must not be duplicated",
  );
});
