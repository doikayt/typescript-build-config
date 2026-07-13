# @datalackey/typescript-build-config

Shared build configuration presets for TypeScript-based projects.

## Purpose

This package centralises common build tooling configuration and release policy across all
TypeScript projects maintained under the `@datalackey` scope. The goal is a
single source of truth for such settings that should be held constant across
projects, avoiding drift between repos over time. 
The plugin encapsulates common build **policy** and release **workflow logic**
via the pipeline files it installs into each consumer repo and the canonical release process in
[docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md).



## Installation

```bash
npm install --save-dev @datalackey/typescript-build-config
```

The postinstall script copies starter config files into your project root and
sets up the release pipeline (see below).

## Dependency Strategy

`eslint` and `prettier` are listed as `dependencies` and are pulled in
automatically. The `@typescript-eslint/*` plugins are listed in both
`dependencies` and `peerDependencies` — the peer declaration pins the minimum
version to `^8.57.1` to avoid a `ts-api-utils` incompatibility with TS 5.4+.

This package targets new projects. Use in existing projects that pin older
versions of these tools may produce peer dependency conflicts.

## Current Contents

- ESLint config
- Prettier config
- TypeScript config (`tsconfig.json`, `tsconfig.test.json`, `tsconfig.eslint.json`)
- Postinstall script that copies starter top-level config files into your
  project root, extending the configs installed under `node_modules`
- GitHub Actions release workflow (`.github/workflows/release.yml`)
- Changeset config (`.changeset/config.json`)
- Auto-changeset script (`scripts/auto-changeset.sh`)
- NPM token diagnostic workflow (`.github/workflows/verify-npm-token.yml`) — see
  [Troubleshooting Publish Auth](docs/RELEASE-PROCESS.md#troubleshooting-publish-auth)

## Delivery Model

This package standardizes downstream repos through three delivery channels — script and
config artifacts that *implement* the common policy, and a canonical document that
*states* it:

```
        ┌─────────────────────────────────────────────────┐
        │      @datalackey/typescript-build-config        │
        │                                                 │
        │  presets     src/eslint.js  prettier  tsconfig  │
        │  stubs       src/top-level/*                    │
        │  pipeline    src/pipeline/*                     │
        │  policy      docs/RELEASE-PROCESS.md            │
        └─────────┬───────────────┬───────────────┬───────┘
                  │               │               │
   1 REFERENCED   │  2 COPIED     │  3 LINKED,    │
     IN PLACE     │    ON INSTALL │  NEVER COPIED │
                  │               │               │
 presets stay in  │ postinstall   │ cited by URL  │
 node_modules —   │ seeds stubs + │ only; one     │
 updates flow     │ pipeline once;│ canonical     │
 with npm update  │ consumer owns │ copy — drift  │
                  │ them; drift ⇒ │ is impossible │
                  │ diff warning  │               │
                  ▼               ▼               ▼
        ┌─────────────────────────────────────────────────┐
        │                  consumer repo                  │
        │                                                 │
        │  seeded stubs:  eslint.config.js  tsconfig.json │
        │       │         prettier.config.js  …           │
        │       └────extends────► presets living in       │
        │                         node_modules  (chan. 1) │
        │  owned pipeline:  .github/workflows/release.yml │
        │                   scripts/auto-changeset.sh     │
        │  CONTRIBUTING.md ─cites URL─► RELEASE-PROCESS.md│
        └─────────────────────────────────────────────────┘
```

**Terms:**

- **Presets** — the real configuration content: the ESLint rules (`src/eslint.js`),
  Prettier options, and base tsconfig this package exports. They stay inside
  `node_modules` and are never copied — which is what makes them ecosystem-wide levers:
  change a lint rule once here, publish, and every downstream repo receives the new rule
  on its next `npm update`, with no per-repo edits.
- **Stubs** — thin files seeded once into the consumer's project root by the postinstall
  script (`eslint.config.js`, `tsconfig.json`, …). Their only job is to `extends`/import
  the presets: channel 2 seeds these static, copied-once files, and they point back at
  the evolving content that channel 1 keeps current in `node_modules`.
- **Owned pipeline** — the release workflow and scripts, copied on install. "Owned" by
  the **consumer repo**: it may edit its copies, upstream never overwrites them, and
  postinstall prints a diff warning when a copy drifts from the canonical template.
- **Policy** — the release process itself, stated once in
  [docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md). Consumers reference it by URL from
  their own contributor docs (as the consumer box shows) — never copied, so it cannot
  drift.

## Release Pipeline

On install, the postinstall script copies the release pipeline files into your
project automatically. The package name in `auto-changeset.sh` is substituted
from your project's `package.json` at install time.

On `npm update`, the behavior per file is:

- **File absent** — copied into place
- **File identical to canonical** — skipped silently
- **File differs from canonical** — warning printed with a diff; local copy is
  left untouched for manual review

This means local customisations are never silently overwritten, but you are
notified when your copy has drifted from the upstream version.

The release pipeline requires an `NPM` secret stored at the GitHub organisation
level. All repos under the org inherit it automatically — no per-repo secret
configuration is needed.

## The `ci` Script — Required Convention

Every project that installs this package **must** define a `ci` script in its
`package.json`. The release workflow calls `npm run ci` as its CI gate. A
project without a `ci` script will fail the CI job — which is the correct
signal that the convention has not been met.

This package does not mandate a build orchestrator. Projects may use plain npm
scripts, NX, or any other toolchain — the only requirement is that
`package.json` exposes a `ci` entry point that the release workflow can call
uniformly.

The `ci` script is the single entry point for "everything that must pass before
a release". What it calls internally is up to the project:

```json
{ "scripts": { "ci": "npm run check-docs && vitest run && playwright test" } }
```

### NX projects: the shim requirement

NX-based projects must still provide the `package.json` `ci` entry as a thin
shim, even if it only delegates to NX targets:

```json
{ "scripts": { "ci": "nx run-many --target=ci --all" } }
```

The release workflow is NX-agnostic — it calls `npm run ci`, never NX directly.
The shim is the contract that connects this universal workflow to whatever
toolchain the project uses internally.

### Local use

`npm run ci` is your local "simulate CI" command. A passing `npm run ci`
locally means the release CI job will pass.

INVARIANT:  any project that depends on this base project should guarantee that if a developer
invokes the 'npm run ci' successfully, then commits everything in their workspace, and pushes 
to git, then the subsequent build should pass.

## The `update-all-format` Target — Required Convention

Every project that installs this package **must** define an `update-all-format`
entry point — either a `package.json` script or an NX `project.json` target.
This is the single command for "reformat everything before reviewing a diff":
run it before committing to keep diffs clean and reviewable.

The plugin enforces the **name only**, not the content. What it invokes is up
to the project:

```json
{ "scripts": { "update-all-format": "prettier --write src/ && npm run update-markdown-docs" } }
```

Or as an NX target:

```json
{ "targets": { "update-all-format": { "executor": "nx:run-commands", "options": { "command": "prettier --write src/" } } } }
```

If neither is found, `postinstall` prints a warning (non-fatal) on every
`npm install` / `npm update` until the target is added.

### NX projects

NX projects may define the target in `project.json` instead of `package.json`
scripts — the postinstall check recognises both. There is no shim requirement
for `update-all-format` (unlike `ci`), because no external tooling calls it
directly.

## Publishing

Releases are automated via Changesets and GitHub Actions. The full policy —
commit-prefix → bump mapping, forcing or suppressing a release, resolving
`changeset status` errors, verifying a release, troubleshooting publish auth —
is documented in [docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md). That
document is the canonical release policy for every repo that installs this
package.

Quick reference:

**For a patch release** — push a `fix:` commit to `main`. The workflow handles
the rest.

**For a minor or major release** — run `npx changeset` locally, choose the
bump level at the prompt, commit the generated `.changeset/*.md` file, then
push. The auto-generation step is skipped when a handwritten changeset is
present. For majors this is mandatory: a breaking-change commit (`feat!:` or
`BREAKING CHANGE` in the body) with no handwritten changeset fails the
release job until one is committed.

**Manual publish (emergency):** trigger the workflow manually via
**GitHub Actions → CI / Release → Run workflow** on the `main` branch.

## License

MIT
