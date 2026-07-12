# Release Process and Policy

This document is the canonical statement of the release policy promoted by
`@datalackey/typescript-build-config` and implemented by the pipeline files it distributes
(consumer-repo destination → template source):

- [`.github/workflows/release.yml`](../src/pipeline/release.yml)
- [`.changeset/config.json`](../src/pipeline/changeset-config.json)
- [`scripts/auto-changeset.sh`](../src/pipeline/auto-changeset.sh)
- [`.github/workflows/verify-npm-token.yml`](../src/pipeline/verify-npm-token.yml)

It applies to every repository that installs this package. Repos with extra machinery (e.g.
monorepos with NX orchestration or post-publish smoke tests) layer their specifics on top of
this policy — they should link here rather than restate it.

## How the Automated Release Pipeline Works

The release job only runs after the CI job passes. The CI job runs
`npm test --if-present`: if the repo defines a `test` script, it must pass before anything
can be released; repos without one are not blocked (the
[`--if-present` flag](https://docs.npmjs.com/cli/commands/npm-run-script) makes npm exit
successfully when the script is absent). This lets a single workflow template serve every
consumer unchanged: a repo opts into the test gate simply by defining a `test` script, and
is not penalised before it has one.

On every push to `main` that passes CI, the release job runs three steps:

### 1. Auto-changeset (`scripts/auto-changeset.sh`)

If no handwritten `.changeset/*.md` file exists, the script scans `git log` since the last
release tag and derives a semver bump from conventional commit prefixes (see
[Versioning Tiers](#versioning-tiers)). It writes a changeset file that `changeset version`
then consumes. If no releasable commits are found (`fix:`, `feat:`, `perf:`), the script exits
cleanly and no release is produced. If a breaking-change marker is found without a
handwritten changeset, the script fails the release job (see
[Versioning Tiers](#versioning-tiers)).

### 2. Version bump + publish

`changeset version` reads the changeset file, bumps the package version, updates
`CHANGELOG.md`, and deletes the changeset file. The version bump is committed back to `main`
with `[skip ci]` to prevent a recursive CI trigger. `changeset publish` then publishes to npm
and creates a `v<x.y.z>` git tag.

### 3. Optional repo-specific extensions

Individual repos may append further stages — for example, a post-publish smoke test that
installs the just-published version from the npm registry and exercises it end to end. Such
stages are owned by the consuming repo, not by this policy.

## Versioning Tiers

The semver bump level is derived automatically from commit message prefixes via
`scripts/auto-changeset.sh`.

### Bump levels

Semver version numbers follow the format **MAJOR.MINOR.PATCH** (e.g. `1.4.2`):

| Tier | Version change | When to use |
|---|---|---|
| **PATCH** | `1.4.0 → 1.4.1` | Bug fixes, performance improvements — no new API surface |
| **MINOR** | `1.4.0 → 1.5.0` | New features that are backwards-compatible |
| **MAJOR** | `1.4.0 → 2.0.0` | Breaking changes — existing callers must update their code |

### Commit prefix → bump mapping

| Commit prefix | Bump | Example |
|---|---|---|
| `fix:` or `fix(scope):` | patch | `fix(parser): handle headings after HTML blocks` |
| `perf:` or `perf(scope):` | patch | `perf: cache results across files` |
| `feat:` or `feat(scope):` | patch | `feat: add --quiet flag` |
| `feat!:` or `feat(scope)!:` | **release job fails** | `feat!: remove deprecated --output flag` |
| `BREAKING CHANGE` in body | **release job fails** | any prefix + `BREAKING CHANGE: ...` in body |
| `chore:`, `ci:`, `docs:`, `refactor:`, `style:`, `test:`, `build:` | none | no release triggered |

> **Note:** Automated releases are intentionally conservative — the auto path only ever
> produces **patch** releases. Minor and major bumps require a handwritten changeset
> (`npx changeset` before pushing). A breaking-change marker (`!` prefix or
> `BREAKING CHANGE` in a commit body) with no handwritten changeset **fails the release
> job** on every push until a changeset — real (declaring the bump) or empty (suppressing
> the release) — is committed. Commits and CI tests are unaffected; only publishing halts.

## Forcing a Specific Bump Level

If the commit prefix convention doesn't reflect the true impact of a change — for example, a
`refactor:` that silently breaks a public API — run `npx changeset` manually before pushing:

```sh
npx changeset
# select bump level and write a description at the prompt
git add .changeset
git commit -m "chore: add changeset"
git push origin main
```

The auto-generation script skips when a handwritten changeset file already exists, so the
manual changeset takes full precedence.

## Suppressing a Release

If your commits touch publishable files but should not trigger a release (e.g. a
documentation-only change that somehow carries a releasable prefix):

```sh
npx changeset add --empty
git add .changeset
git commit -m "chore: skip release"
git push origin main
```

The empty changeset satisfies the pipeline without bumping any version.

## Handling `changeset status` Errors

When running:

```
npx changeset status
```

you may see:

```
🦋  error Some packages have been changed but no changesets were found.
🦋  error Run `changeset add` to resolve this error.
🦋  error If this change doesn't need a release, run `changeset add --empty`.
```

### What this means

Changesets has detected that:

- Files affecting the publishable package have changed, and
- No corresponding `.changeset/*.md` file exists describing release intent.

Changesets refuses to proceed because releases must always be **explicit and deterministic**.
This safeguard prevents accidental releases, ambiguous version bumps, and silent drift between
code and published packages.

### When you will see this

Typically after modifying publishable code, merging a PR without a changeset, or running local
experiments that touched package files.

### How to resolve

**Option A — this change SHOULD trigger a release:**

```sh
npx changeset
git add .changeset
git commit -m "chore: add changeset"
```

**Option B — this change should NOT trigger a release:**

```sh
npx changeset add --empty
git add .changeset
git commit -m "chore: add empty changeset"
```

### Maintainer rules

- Never ignore this error.
- Never manually edit package versions.
- Every change affecting publishable packages must have a changeset (real or empty).
- If this error appears in CI, the PR is missing required release metadata.

## Verifying a Release

After a release completes, evidence appears in several places:

| Where | What to look for |
|---|---|
| **GitHub Actions** | Release job green; `Publishing "<your-package>" at "x.y.z"` in the log |
| **`git log`** | A `chore: release [skip ci]` commit with the bumped version |
| **`git tag`** | New `v<x.y.z>` tag from `changeset publish` — `git pull --tags` to fetch |
| **`CHANGELOG.md`** | One entry per release with the commit summaries that drove it |
| **npm registry** | `npm view <your-package> versions` — the new version appears |

The `CHANGELOG.md` is the canonical human-readable record of what changed in each release and
why. It is generated automatically from the conventional commit subjects that drove the bump.

## Rules

- Version numbers must never be edited manually.
- Version ranges of depended-on sibling packages must never be manually adjusted.
- `npm publish` must never be run by hand — leave publishing to CI.
- All releases must originate from committed changesets (handwritten or auto-generated).

## Troubleshooting Publish Auth

The pipeline files installed by this package include a small diagnostic workflow,
`.github/workflows/verify-npm-token.yml`, for checking npm publish credentials without
performing a release.

**When to use it:** the release job fails at the `changeset publish` step with an auth error
(`ENEEDAUTH`, `EOTP`, 403), or you have just rotated the `NPM` org secret and want to confirm
the new token works before pushing a release commit.

**How to run it:** GitHub → Actions → **Verify NPM Token** → **Run workflow**. It is
manual-dispatch only and never runs automatically.

**What it does:** sets up Node against `registry.npmjs.org` and runs `npm whoami` with the
`NPM` secret injected as `NODE_AUTH_TOKEN`.

**Reading the result:**

- **Green, prints a username** — the token is valid and authenticated as that npm user.
  Publish auth failures lie elsewhere (e.g. 2FA policy on the package, missing scope access
  for that user).
- **Red** — the token is expired, revoked, malformed, or the `NPM` secret is missing or
  misnamed at the org or repo level. Recreate the token (a granular token needs 2FA bypass
  enabled, or use a classic Automation token) and update the org-level secret.

This costs seconds and has no side effects — prefer it over debugging auth by pushing release
commits.

## Coordinated (Sideways) Version Bumps

Multi-package workspaces should release siblings in lockstep: when any publishable package is
bumped (patch, minor, or major), all others are bumped to the same exact version — even if
they had no source changes. This rules out any ambiguity about compatibility between sibling
packages.

Enforce it by listing all publishable packages in a `fixed` group in
`.changeset/config.json`:

```json
"fixed": [["@scope/pkg-a", "@scope/pkg-b", "@scope/pkg-c"]]
```

Single-package repos — the default for the installed template — leave `fixed: []`.
