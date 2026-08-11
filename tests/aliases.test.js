import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ALIASES = fileURLToPath(
  new URL("../assets/shell/aliases.sh", import.meta.url),
);

// Run dk-scaffold with every external stubbed to echo a "CALL <cmd>" marker, so
// we can assert control flow (which side effects fire) without gh, npm, or git.
// REPO_OWNER/DOIKAYT_ORG/_TBC are cleared so aliases.sh applies its own defaults,
// making the default-path assertions deterministic regardless of the caller's env.
function runScaffold(args) {
  const workdir = mkdtempSync(join(tmpdir(), "tbc-scaffold-"));
  const script = `
    source ${JSON.stringify(ALIASES)}
    mkrepo(){ echo "CALL mkrepo $*"; return 0; }
    dk-new(){ echo "CALL dk-new"; }
    dk-init(){ cat >/dev/null; echo "CALL dk-init"; }
    npm(){ echo "CALL npm $*"; return 0; }
    git(){ echo "CALL git $*"; return 0; }
    cd ${JSON.stringify(workdir)}
    dk-scaffold ${args}
    exit $?
  `;
  const env = { ...process.env };
  delete env.REPO_OWNER;
  delete env.DOIKAYT_ORG;
  delete env.DOIKAYT_TBC;
  const res = spawnSync("bash", ["-c", script], { encoding: "utf8", env });
  return { out: (res.stdout || "") + (res.stderr || ""), status: res.status };
}

test("--local: scaffolds but creates no repo and never pushes", () => {
  const { out, status } = runScaffold("my-demo --local");
  assert.equal(status, 0);
  assert.match(out, /Scaffolded my-demo locally \(app\)/);
  assert.doesNotMatch(out, /CALL mkrepo/);
  assert.doesNotMatch(out, /CALL git push/);
});

test("default (no flag): creates the repo and pushes", () => {
  const { out, status } = runScaffold("my-demo");
  assert.equal(status, 0);
  assert.match(out, /CALL mkrepo my-demo/);
  assert.match(out, /CALL git push -u origin main/);
  assert.match(out, /Scaffolded doikayt\/my-demo \(app\)/);
});

// Owner-override plumbing: REPO_OWNER sets the repo owner, and the legacy
// DOIKAYT_ORG is still honored (REPO_OWNER wins when both are set).
function runScaffoldWithEnv(args, overrides) {
  const workdir = mkdtempSync(join(tmpdir(), "tbc-scaffold-"));
  const script = `
    source ${JSON.stringify(ALIASES)}
    mkrepo(){ echo "CALL mkrepo $*"; return 0; }
    dk-new(){ echo "CALL dk-new"; }
    dk-init(){ cat >/dev/null; echo "CALL dk-init"; }
    npm(){ echo "CALL npm $*"; return 0; }
    git(){ echo "CALL git $*"; return 0; }
    cd ${JSON.stringify(workdir)}
    dk-scaffold ${args}
    exit $?
  `;
  const env = { ...process.env };
  delete env.REPO_OWNER;
  delete env.DOIKAYT_ORG;
  delete env.DOIKAYT_TBC;
  Object.assign(env, overrides);
  const res = spawnSync("bash", ["-c", script], { encoding: "utf8", env });
  return { out: (res.stdout || "") + (res.stderr || ""), status: res.status };
}

test("REPO_OWNER overrides the repo owner", () => {
  const { out } = runScaffoldWithEnv("my-demo", { REPO_OWNER: "alice" });
  assert.match(out, /Scaffolded alice\/my-demo \(app\)/);
});

test("legacy DOIKAYT_ORG is still honored", () => {
  const { out } = runScaffoldWithEnv("my-demo", { DOIKAYT_ORG: "legacy-org" });
  assert.match(out, /Scaffolded legacy-org\/my-demo \(app\)/);
});

test("REPO_OWNER wins when both it and DOIKAYT_ORG are set", () => {
  const { out } = runScaffoldWithEnv("my-demo", {
    REPO_OWNER: "alice",
    DOIKAYT_ORG: "legacy-org",
  });
  assert.match(out, /Scaffolded alice\/my-demo \(app\)/);
});

test("--local is positional-independent and preserves kind", () => {
  const { out, status } = runScaffold("--local my-demo lib");
  assert.equal(status, 0);
  assert.match(out, /Scaffolded my-demo locally \(lib\)/);
  assert.doesNotMatch(out, /CALL git push/);
});

test("-l short flag behaves like --local", () => {
  const { out, status } = runScaffold("my-demo -l");
  assert.equal(status, 0);
  assert.match(out, /Scaffolded my-demo locally \(app\)/);
  assert.doesNotMatch(out, /CALL mkrepo/);
});

test("missing name prints usage and fails", () => {
  const { out, status } = runScaffold("--local");
  assert.notEqual(status, 0);
  assert.match(out, /Usage: dk-scaffold/);
});

test("errors out early when no git identity is configured", () => {
  const workdir = mkdtempSync(join(tmpdir(), "tbc-scaffold-"));
  const script = `
    source ${JSON.stringify(ALIASES)}
    mkrepo(){ echo "CALL mkrepo $*"; return 0; }
    dk-new(){ echo "CALL dk-new"; }
    dk-init(){ cat >/dev/null; echo "CALL dk-init"; }
    npm(){ echo "CALL npm $*"; return 0; }
    git(){
      case "$*" in
        "config user.email" | "config user.name") return 1 ;; # identity unset
        *) echo "CALL git $*"; return 0 ;;
      esac
    }
    cd ${JSON.stringify(workdir)}
    dk-scaffold demo --local
    exit $?
  `;
  const env = { ...process.env };
  delete env.REPO_OWNER;
  delete env.DOIKAYT_ORG;
  delete env.DOIKAYT_TBC;
  const res = spawnSync("bash", ["-c", script], { encoding: "utf8", env });
  const out = (res.stdout || "") + (res.stderr || "");
  assert.notEqual(res.status, 0);
  assert.match(out, /Git identity not configured/);
  assert.doesNotMatch(out, /CALL dk-new/); // failed before any scaffolding
});
