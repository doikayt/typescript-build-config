import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ALIASES = fileURLToPath(
  new URL("../assets/shell/aliases.sh", import.meta.url),
);
const LIST_ALIASES = fileURLToPath(
  new URL("../assets/shell/list-aliases.mjs", import.meta.url),
);
const { parseAliases } = await import(LIST_ALIASES);

function bashExecutable() {
  if (process.platform === "win32") {
    const candidates = [
      "C:/Program Files/Git/bin/bash.exe",
      "C:/Program Files/Git/usr/bin/bash.exe",
      "C:/Program Files/Git/bin/bash",
    ];
    const match = candidates.find((candidate) => existsSync(candidate));
    if (match) return match;
  }
  return "bash";
}

test("aliases target Codeberg and use the API token", () => {
  const source = readFileSync(ALIASES, "utf8");
  assert.match(source, /CODEBERG_API/);
  assert.match(source, /Authorization: token/);
  assert.match(source, /git@codeberg\.org/);
  assert.doesNotMatch(source, /gh repo create/);
});

// Run dk-scaffold with every external stubbed to echo a "CALL <cmd>" marker, so
// we can assert control flow (which side effects fire) without curl, npm, or git.
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
  env.CODEBERG_TOKEN = "test-token";
  const res = spawnSync(bashExecutable(), ["-c", script], { encoding: "utf8", env });
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
  env.CODEBERG_TOKEN = "test-token";
  Object.assign(env, overrides);
  const res = spawnSync(bashExecutable(), ["-c", script], { encoding: "utf8", env });
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

test("prints the auto-answered-prompts note by default", () => {
  const { out, status } = runScaffold("my-demo --local");
  assert.equal(status, 0);
  assert.match(out, /answers all setup prompts for you automatically/);
});

test("-q and --quiet hide the auto-answered-prompts note", () => {
  for (const flag of ["-q", "--quiet"]) {
    const { out, status } = runScaffold(`my-demo --local ${flag}`);
    assert.equal(status, 0);
    assert.doesNotMatch(out, /answers all setup prompts/);
    assert.match(out, /Scaffolded my-demo locally \(app\)/);
  }
});

test("missing name prints usage and fails", () => {
  const { out, status } = runScaffold("--local");
  assert.notEqual(status, 0);
  assert.match(out, /Usage: dk-scaffold/);
});

test("missing Codeberg token explains the local-only workaround", () => {
  const workdir = mkdtempSync(join(tmpdir(), "tbc-scaffold-"));
  const script = `
    source ${JSON.stringify(ALIASES)}
    dk-new(){ echo "CALL dk-new"; }
    dk-init(){ cat >/dev/null; echo "CALL dk-init"; }
    npm(){ echo "CALL npm $*"; return 0; }
    git(){ echo "CALL git $*"; return 0; }
    cd ${JSON.stringify(workdir)}
    dk-scaffold demo
    exit $?
  `;
  const env = { ...process.env };
  delete env.REPO_OWNER;
  delete env.DOIKAYT_ORG;
  delete env.DOIKAYT_TBC;
  delete env.CODEBERG_TOKEN;
  const res = spawnSync(bashExecutable(), ["-c", script], { encoding: "utf8", env });
  const out = (res.stdout || "") + (res.stderr || "");
  assert.notEqual(res.status, 0);
  assert.match(out, /CODEBERG_TOKEN is not set/);
  assert.match(out, /--local/);
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
  const res = spawnSync(bashExecutable(), ["-c", script], { encoding: "utf8", env });
  const out = (res.stdout || "") + (res.stderr || "");
  assert.notEqual(res.status, 0);
  assert.match(out, /Git identity not configured/);
  assert.doesNotMatch(out, /CALL dk-new/); // failed before any scaffolding
});

test("dk-new and dk-init always prefer the local checkout even after cd", () => {
  const workdir = mkdtempSync(join(tmpdir(), "tbc-scaffold-"));
  const script = `
    source ${JSON.stringify(ALIASES)}
    node(){ echo "CALL node $*"; return 0; }
    npx(){ echo "CALL npx $*"; return 0; }
    cd ${JSON.stringify(workdir)}
    dk-new demo
    dk-init --help
  `;
  const env = { ...process.env };
  delete env.REPO_OWNER;
  delete env.DOIKAYT_ORG;
  delete env.DOIKAYT_TBC;
  const res = spawnSync(bashExecutable(), ["-c", script], { encoding: "utf8", env });
  const out = (res.stdout || "") + (res.stderr || "");
  assert.match(out, /CALL node .*src\/cli\.js new demo/);
  assert.match(out, /CALL node .*src\/cli\.js init --help/);
  assert.doesNotMatch(out, /CALL npx/);
});

// gp/gpu/trackify are plain git plumbing, so these use a real local bare
// repo as "origin" instead of stubbing git — cheap, no network, and trusts
// git's own ref-existence semantics rather than reimplementing them in a stub.
function makeRepoWithRemote() {
  const bareDir = mkdtempSync(join(tmpdir(), "tbc-bare-"));
  spawnSync("git", ["init", "--bare", "-q", bareDir]);

  const workdir = mkdtempSync(join(tmpdir(), "tbc-work-"));
  const run = (args) => spawnSync("git", args, { cwd: workdir, encoding: "utf8" });
  run(["init", "-q", "-b", "main"]);
  run(["config", "user.email", "test@example.com"]);
  run(["config", "user.name", "Test"]);
  writeFileSync(join(workdir, "file.txt"), "hello\n");
  run(["add", "-A"]);
  run(["commit", "-q", "-m", "initial"]);
  run(["remote", "add", "origin", bareDir]);
  run(["push", "-q", "-u", "origin", "main"]);

  return { workdir, bareDir };
}

function runAliasFn(workdir, fnCall) {
  const script = `
    source ${JSON.stringify(ALIASES)}
    cd ${JSON.stringify(workdir)}
    ${fnCall}
    exit $?
  `;
  const res = spawnSync(bashExecutable(), ["-c", script], { encoding: "utf8" });
  return { out: (res.stdout || "") + (res.stderr || ""), status: res.status };
}

function currentUpstream(workdir) {
  const res = spawnSync(
    "git",
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    { cwd: workdir, encoding: "utf8" },
  );
  return res.stdout.trim();
}

test("gp: pulls with rebase, then pushes the current branch", () => {
  const { workdir, bareDir } = makeRepoWithRemote();
  writeFileSync(join(workdir, "file.txt"), "hello again\n");
  spawnSync("git", ["add", "-A"], { cwd: workdir });
  spawnSync("git", ["commit", "-q", "-m", "second"], { cwd: workdir });

  const { out, status } = runAliasFn(workdir, "gp");
  assert.equal(status, 0);
  assert.match(out, /Pulled with rebase and pushed to main/);

  // Reference "main" explicitly -- a fresh bare repo's HEAD may symbolically
  // point at "master" (depends on init.defaultBranch), which would make a
  // plain `git log` here resolve nothing even though the push succeeded.
  const log = spawnSync("git", ["log", "-1", "--format=%s", "main"], {
    cwd: bareDir,
    encoding: "utf8",
  });
  assert.equal(log.stdout.trim(), "second");
});

test("gpu: pushes and sets tracking for a brand-new branch", () => {
  const { workdir, bareDir } = makeRepoWithRemote();
  spawnSync("git", ["checkout", "-q", "-b", "feature-x"], { cwd: workdir });

  const { status } = runAliasFn(workdir, "gpu");
  assert.equal(status, 0);
  assert.equal(currentUpstream(workdir), "origin/feature-x");

  const branches = spawnSync("git", ["branch"], { cwd: bareDir, encoding: "utf8" });
  assert.match(branches.stdout, /feature-x/);
});

test("gpu: just sets tracking when origin already has the branch", () => {
  const { workdir } = makeRepoWithRemote();
  // Simulate the branch already existing on origin (e.g. pushed from elsewhere).
  spawnSync("git", ["push", "-q", "origin", "main:feature-y"], { cwd: workdir });
  spawnSync("git", ["checkout", "-q", "-b", "feature-y", "--no-track"], { cwd: workdir });
  spawnSync("git", ["fetch", "-q", "origin"], { cwd: workdir });

  const { status } = runAliasFn(workdir, "gpu");
  assert.equal(status, 0);
  assert.equal(currentUpstream(workdir), "origin/feature-y");
});

test("trackify: sets tracking when the remote branch already exists", () => {
  const { workdir } = makeRepoWithRemote();
  spawnSync("git", ["push", "-q", "origin", "main:feature-z"], { cwd: workdir });
  spawnSync("git", ["checkout", "-q", "-b", "feature-z", "--no-track"], { cwd: workdir });
  spawnSync("git", ["fetch", "-q", "origin"], { cwd: workdir });

  const { status } = runAliasFn(workdir, "trackify");
  assert.equal(status, 0);
  assert.equal(currentUpstream(workdir), "origin/feature-z");
});

test("trackify: fails cleanly when the remote branch doesn't exist yet", () => {
  const { workdir } = makeRepoWithRemote();
  spawnSync("git", ["checkout", "-q", "-b", "never-pushed"], { cwd: workdir });

  const { status } = runAliasFn(workdir, "trackify");
  assert.notEqual(status, 0);
});

test("gpu and trackify refuse to run in detached HEAD", () => {
  const { workdir } = makeRepoWithRemote();
  spawnSync("git", ["checkout", "-q", "--detach", "HEAD"], { cwd: workdir });

  const gpuResult = runAliasFn(workdir, "gpu");
  assert.notEqual(gpuResult.status, 0);
  assert.match(gpuResult.out, /Not on a branch/);

  const trackifyResult = runAliasFn(workdir, "trackify");
  assert.notEqual(trackifyResult.status, 0);
  assert.match(trackifyResult.out, /Not on a branch/);
});

test("gm: checks out the default branch queried live from origin", () => {
  const { workdir, bareDir } = makeRepoWithRemote();
  // Give the bare repo a non-"main" HEAD, so this only passes if gm actually
  // queries origin rather than assuming "main".
  spawnSync("git", ["push", "-q", "origin", "main:trunk"], { cwd: workdir });
  spawnSync("git", ["symbolic-ref", "HEAD", "refs/heads/trunk"], { cwd: bareDir });
  spawnSync("git", ["checkout", "-q", "-b", "side-branch"], { cwd: workdir });

  const { out, status } = runAliasFn(workdir, "gm");
  assert.equal(status, 0);
  assert.match(out, /Switched to branch 'trunk'|trunk/);

  const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: workdir,
    encoding: "utf8",
  });
  assert.equal(branch.stdout.trim(), "trunk");
});

test("gm: fails cleanly when origin's default branch can't be determined", () => {
  const workdir = mkdtempSync(join(tmpdir(), "tbc-work-"));
  spawnSync("git", ["init", "-q", "-b", "main"], { cwd: workdir });

  const { status } = runAliasFn(workdir, "gm");
  assert.notEqual(status, 0);
});

test("rmbranch: deletes the branch locally and on origin, force-pushes current", () => {
  const { workdir, bareDir } = makeRepoWithRemote();
  spawnSync("git", ["push", "-q", "origin", "main:doomed"], { cwd: workdir });
  spawnSync("git", ["fetch", "-q", "origin"], { cwd: workdir });
  spawnSync("git", ["branch", "doomed", "origin/doomed"], { cwd: workdir });

  const { status } = runAliasFn(workdir, "rmbranch doomed");
  assert.equal(status, 0);

  const localBranches = spawnSync("git", ["branch"], { cwd: workdir, encoding: "utf8" });
  assert.doesNotMatch(localBranches.stdout, /doomed/);

  const remoteBranches = spawnSync("git", ["branch"], { cwd: bareDir, encoding: "utf8" });
  assert.doesNotMatch(remoteBranches.stdout, /doomed/);
});

test("rmbranch: requires a branch name", () => {
  const { workdir } = makeRepoWithRemote();
  const { status, out } = runAliasFn(workdir, "rmbranch");
  assert.notEqual(status, 0);
  assert.match(out, /Usage: rmbranch/);
});

test("curr-branch: prints the current branch name", () => {
  const { workdir } = makeRepoWithRemote();
  spawnSync("git", ["checkout", "-q", "-b", "feature-print-me"], { cwd: workdir });
  const { out, status } = runAliasFn(workdir, "curr-branch");
  assert.equal(status, 0);
  assert.equal(out.trim(), "feature-print-me");
});

// list-aliases.mjs: the sentence-extraction convention is genuinely testable
// logic (unlike the one-line diff aliases), so it gets unit tests against a
// synthetic source string rather than the real aliases.sh.
test("parseAliases: extracts the first sentence, stripping a leading name prefix", () => {
  const source = `
# --- Some Group ---

# foo ("mnemonic"): does the first thing. Does a second thing too.
foo() {
  true
}
`;
  const groups = parseAliases(source);
  assert.deepEqual(groups.get("Some Group"), [
    { name: "foo", mnemonic: "mnemonic", summary: "does the first thing." },
  ]);
});

test("parseAliases: extracts a quoted mnemonic separately from the summary", () => {
  const source = `
# --- Sync ---

# gp ("git pull-push"): pull --rebase, then push the current branch.
gp() {
  true
}
`;
  const groups = parseAliases(source);
  assert.deepEqual(groups.get("Sync"), [
    {
      name: "gp",
      mnemonic: "git pull-push",
      summary: "pull --rebase, then push the current branch.",
    },
  ]);
});

test("parseAliases: mnemonic is null when the comment has no quoted string", () => {
  const source = `
# --- Some Group ---

# plain : has no mnemonic at all.
plain() {
  true
}
`;
  const groups = parseAliases(source);
  assert.deepEqual(groups.get("Some Group"), [
    { name: "plain", mnemonic: null, summary: "has no mnemonic at all." },
  ]);
});

test("parseAliases: falls back to the first comment line when there's no period", () => {
  const source = `
# --- Some Group ---

# bar does a thing with no terminal punctuation anywhere in this comment
bar() {
  true
}
`;
  const groups = parseAliases(source);
  assert.deepEqual(groups.get("Some Group"), [
    {
      name: "bar",
      mnemonic: null,
      summary: "bar does a thing with no terminal punctuation anywhere in this comment",
    },
  ]);
});

test("parseAliases: skips pure border lines but keeps multi-line comment text", () => {
  const source = `
# --- Some Group ---

# ---------------------------------------------------------------------------
# baz <arg> : does the thing. More detail here.
# ---------------------------------------------------------------------------
baz() {
  true
}
`;
  const groups = parseAliases(source);
  assert.deepEqual(groups.get("Some Group"), [
    { name: "baz", mnemonic: null, summary: "does the thing." },
  ]);
});

test("parseAliases: handles plain `alias` definitions too, and groups by the nearest header", () => {
  const source = `
# --- Group One ---

# one : first alias.
alias one="echo 1"

# --- Group Two ---

# two : second alias.
alias two="echo 2"
`;
  const groups = parseAliases(source);
  assert.deepEqual(groups.get("Group One"), [
    { name: "one", mnemonic: null, summary: "first alias." },
  ]);
  assert.deepEqual(groups.get("Group Two"), [
    { name: "two", mnemonic: null, summary: "second alias." },
  ]);
});

test("parseAliases: definitions with no doc comment above them are skipped", () => {
  const source = `
# --- Some Group ---

undocumented() {
  true
}
`;
  const groups = parseAliases(source);
  assert.equal(groups.has("Some Group"), false);
});

test("tools-help: runs against the real aliases.sh and lists every group", () => {
  const { out, status } = runAliasFn(process.cwd(), "tools-help");
  assert.equal(status, 0);
  for (const group of [
    "Repo bootstrap",
    "Sync",
    "Diff & inspect",
    "Cleanup",
    "CLI wrappers",
    "Introspection",
  ]) {
    assert.match(out, new RegExp(group.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(out, /tools-help/);
  assert.match(out, /rmbranch/);
});
