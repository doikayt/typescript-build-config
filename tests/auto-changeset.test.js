import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Exercises the consumer-installed template (src/pipeline/auto-changeset.sh) after the same
// __PACKAGE_NAME__ substitution postinstall.js performs, so a green run here validates
// the exact artifact consumer repos receive.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = readFileSync(join(repoRoot, 'src/pipeline/auto-changeset.sh'), 'utf8');
const PKG = '@datalackey/fake-consumer';

function git(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'pipe' });
}

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'tbc-autochangeset-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  mkdirSync(join(dir, '.changeset'));
  writeFileSync(join(dir, '.changeset', 'README.md'), '# Changesets\n');
  mkdirSync(join(dir, 'scripts'));
  const script = TEMPLATE.replace('PACKAGES=("__PACKAGE_NAME__")', `PACKAGES=("${PKG}")`);
  writeFileSync(join(dir, 'scripts', 'auto-changeset.sh'), script);
  return dir;
}

let fileCounter = 0;
function commit(dir, subject, body) {
  writeFileSync(join(dir, `file${++fileCounter}.txt`), String(Math.random()));
  git(dir, 'add', '-A');
  const args = ['commit', '-q', '-m', subject];
  if (body) args.push('-m', body);
  git(dir, ...args);
}

function run(dir) {
  return spawnSync('bash', ['scripts/auto-changeset.sh'], { cwd: dir, encoding: 'utf8' });
}

function autoChangesets(dir) {
  return readdirSync(join(dir, '.changeset')).filter(
    (f) => f.endsWith('.md') && f !== 'README.md'
  );
}

test('fix: commit produces a patch changeset', () => {
  const dir = makeFixture();
  commit(dir, 'fix: something broken');
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  const files = autoChangesets(dir);
  assert.equal(files.length, 1);
  const content = readFileSync(join(dir, '.changeset', files[0]), 'utf8');
  assert.match(content, new RegExp(`"${PKG}": patch`));
  assert.match(content, /fix: something broken/);
});

test('feat: and perf: commits produce a patch changeset (never more)', () => {
  const dir = makeFixture();
  commit(dir, 'feat: new capability');
  commit(dir, 'perf: faster path');
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  const files = autoChangesets(dir);
  assert.equal(files.length, 1);
  const content = readFileSync(join(dir, '.changeset', files[0]), 'utf8');
  assert.match(content, new RegExp(`"${PKG}": patch`));
  assert.doesNotMatch(content, /minor|major/);
});

test('chore:/docs: only commits produce no release', () => {
  const dir = makeFixture();
  commit(dir, 'chore: housekeeping');
  commit(dir, 'docs: update readme');
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(autoChangesets(dir).length, 0);
});

test('feat!: commit with no handwritten changeset fails the release', () => {
  const dir = makeFixture();
  commit(dir, 'feat!: remove deprecated flag');
  const res = run(dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /breaking-change commit found with no handwritten changeset/);
  assert.match(res.stderr, /npx changeset/);
  assert.equal(autoChangesets(dir).length, 0);
});

test('BREAKING CHANGE in commit body fails the release regardless of prefix', () => {
  const dir = makeFixture();
  commit(dir, 'refactor: rework internals', 'BREAKING CHANGE: public API renamed');
  const res = run(dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /breaking-change commit found/);
});

test('handwritten changeset unblocks a breaking-change commit', () => {
  const dir = makeFixture();
  commit(dir, 'feat!: remove deprecated flag');
  writeFileSync(
    join(dir, '.changeset', 'manual-major.md'),
    `---\n"${PKG}": major\n---\n\nRemove deprecated flag. Migrate by ...\n`
  );
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /already present/);
  assert.deepEqual(autoChangesets(dir), ['manual-major.md']);
});

test('empty changeset suppresses a breaking-change failure', () => {
  const dir = makeFixture();
  commit(dir, 'feat!: not actually shipping yet');
  writeFileSync(join(dir, '.changeset', 'empty-suppress.md'), '---\n---\n');
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /already present/);
});

test('commits before the last release tag are ignored', () => {
  const dir = makeFixture();
  commit(dir, 'feat!: old breaking change, already released');
  git(dir, 'tag', 'v1.0.0');
  commit(dir, 'fix: post-release bugfix');
  const res = run(dir);
  assert.equal(res.status, 0, res.stderr);
  const files = autoChangesets(dir);
  assert.equal(files.length, 1);
  const content = readFileSync(join(dir, '.changeset', files[0]), 'utf8');
  assert.match(content, new RegExp(`"${PKG}": patch`));
  assert.doesNotMatch(content, /old breaking change/);
});
