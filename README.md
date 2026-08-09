# @doikayt/typescript-build-config

Shared build configuration presets for TypeScript-based projects.

<!-- TOC:START -->
- [@doikayt/typescript-build-config](#doikayttypescript-build-config)
  - [Purpose](#purpose)
  - [Design Goals](#design-goals)
    - [What each component is for](#what-each-component-is-for)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Console / CLI project](#console--cli-project)
    - [UI / web project (with Playwright e2e)](#ui--web-project-with-playwright-e2e)
    - [Existing project](#existing-project)
  - [Dependency Strategy](#dependency-strategy)
  - [Current Contents](#current-contents)
  - [Delivery Model](#delivery-model)
  - [Enforcement Model](#enforcement-model)
  - [Release Pipeline](#release-pipeline)
  - [Conventions Every Project Must Adhere To](#conventions-every-project-must-adhere-to)
    - [The `ci` script](#the-ci-script)
      - [NX projects](#nx-projects)
    - [The `update-all-format` target](#the-update-all-format-target)
  - [Publishing](#publishing)
  - [For Maintainers](#for-maintainers)
    - [Clone and install](#clone-and-install)
    - [Run the full CI suite](#run-the-full-ci-suite)
  - [License](#license)
<!-- TOC:END -->

## Purpose

This package centralises common build tooling configuration, release policy, and content assets
across all TypeScript projects maintained under the `@doikayt` scope. The goal is a
single source of truth for such settings that should be held constant across
projects, avoiding drift between repos over time.
The plugin encapsulates common build **policy** and release **workflow logic**
via the pipeline files it installs into each consumer repo and the canonical release process in
[docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md).

## Design Goals

Two goals drive every design decision here, and they pull in different
directions:

1. **Consistency enforcement** — every `@doikayt` TypeScript repo should expose
   the same command surface (`ci` and `update-all-format`) and share the same
   lint / format / release policy, so tooling, CI, and contributors can assume
   an identical shape in any repo.
2. **Minimal per-project setup** — standing up a new repo, or absorbing a policy
   change into an old one, should cost as close to zero manual wiring as
   possible.

They are reconciled by one architectural choice: **a single upstream package
both _defines_ the conventions and _distributes_ them.** A plain template repo
would copy conventions once and let them drift; a linter would enforce them but
set nothing up. This package does both — so the artifact that decides "every
repo has a `ci` gate" is the same artifact that installs and re-checks it. That
single source of truth is what keeps the ecosystem coherent as it grows.

### What each component is for

Each thing this package ships exists to serve one or both goals. (See
[Delivery Model](#delivery-model) for _how_ each is delivered; the table below
is _why_.)

| Component | Value it delivers | Serves |
| --- | --- | --- |
| **Presets** — `src/eslint.js`, Prettier, base tsconfig, living in `node_modules` | One lint / format / TS ruleset; change it once here and every repo picks it up on `npm update` | Consistency |
| **Stubs** — `src/top-level/*` seeded into the project root | Zero-config entry points that only `extends` the presets | Minimal setup |
| **Pipeline** — `src/pipeline/*` copied on install | A working release + changeset workflow with no hand-wiring; drift is diff-warned | Both |
| **Convention checks** — postinstall warns on missing `ci` / `update-all-format` | An install-time nudge toward the shared command surface | Consistency |
| **`ci` gate** — `release.yml` runs `npm run ci` | Fail-closed enforcement: a repo that ignores the convention cannot release | Consistency (hard teeth) |
| **Policy doc** — `docs/RELEASE-PROCESS.md`, linked never copied | One canonical release policy, impossible to drift | Consistency |
| **Assets** — `assets/*` seeded into `docs/assets/` | Shared brand logos with no per-repo copies to maintain | Minimal setup |

The two goals map onto two lifecycle phases — **delivery** (getting canonical
artifacts into a consuming repo) and **enforcement** (keeping that repo conformant over
time). Each has its own top-level section below.

## Installation

```bash
npm install --save-dev @doikayt/typescript-build-config
```

The postinstall script copies starter config files into your project root and
sets up the release pipeline (see below).

## Usage

After installing, run the `init` scaffolder to write the canonical npm-script
set and declare the dev dependencies those scripts need. `init` is interactive
and **idempotent** — it only adds what is missing and never overwrites a script
or config you already have, so it is safe to re-run.

### Console / CLI project

```bash
npm init -y                                            # if starting fresh
npm install --save-dev @doikayt/typescript-build-config
npx @doikayt/typescript-build-config init             # answer "n" to the Playwright prompt
npm install                                            # fetch the declared devDependencies
```

`init` writes the canonical scripts (`ci`, `test`, `update-all-format`,
`check-all-format`, and their sub-tasks), declares `vitest` +
`@doikayt/autogen-markdown-doc`, and seeds a commented `vitest.config.ts`.

### UI / web project (with Playwright e2e)

```bash
npm init -y
npm install --save-dev @doikayt/typescript-build-config
npx @doikayt/typescript-build-config init             # answer "y" to the Playwright prompt
npm install
# then fill in the TODOs in the generated playwright.config.ts (webServer, baseURL)
```

Answering **yes** to the Playwright prompt additionally: adds a `test:e2e`
script and folds it into `ci` (so the release gate runs e2e), declares
`@playwright/test`, and seeds a `playwright.config.ts` template. Browsers are
installed on demand by the bundled `doikayt-playwright-install` wrapper the
`test:e2e` script calls — no manual `playwright install` step, locally or in CI.

### Existing project

Skip `init` if you prefer. On install, `postinstall` warns about any missing
required targets (`ci`, `update-all-format`) until you add them — either by
running `init` to adopt the full canonical set, or by defining the two scripts
by hand (see [Conventions](#conventions-every-project-must-adhere-to)).

## Dependency Strategy

`eslint` and `prettier` are listed as `dependencies` and are pulled in
automatically. The `@typescript-eslint/*` plugins are listed in both
`dependencies` and `peerDependencies` — the peer declaration pins the minimum
version to `^8.57.1` to avoid a `ts-api-utils` incompatibility with TS 5.4+.

This package targets new projects. Use in existing projects that pin older
versions of these tools may produce peer dependency conflicts.

## Current Contents

- `init` scaffolder CLI (`npx @doikayt/typescript-build-config init`) — writes
  the canonical npm-script set, declares dev dependencies, and seeds config
  templates (see [Usage](#usage))
- `doikayt-playwright-install` bin — env-gated Playwright browser installer used
  by a UI project's `test:e2e` script (adds `--with-deps` only on CI+Linux)
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
- Playwright config helper (`@doikayt/typescript-build-config/playwright`) — `nixChromiumLaunchOptions()`
  discovers the system Chromium on quirky NixOS; `definePlaywrightConfig()` wraps `defineConfig` and
  merges the result in. Transparent no-op on platforms where Playwright's bundled browser works.
  `@playwright/test` is an **optional peer dependency** — it is not installed automatically.
  Any project that imports from `@doikayt/typescript-build-config/playwright` must declare it
  explicitly in its own `devDependencies`:

  ```bash
  npm install --save-dev @playwright/test
  ```

  ```ts
  import { definePlaywrightConfig } from "@doikayt/typescript-build-config/playwright";
  export default definePlaywrightConfig({
      testDir: "code/tests/e2e",
      testMatch: "**/*.spec.ts",
      use: { baseURL: "http://localhost:8080" },
  });
  ```

- Brand assets (`assets/doikayt-logo.png`, `assets/doikayt-logo.svg`) — shared logos for use
  across all `@doikayt` project READMEs and documentation

## Delivery Model

_Phase 1 of 2: getting canonical artifacts **into** a repo. Keeping a repo
conformant over time is the [Enforcement Model](#enforcement-model)._

This package standardizes downstream repos by delivering **five components through three
channels** — so as you read the diagram, note that the component count and the channel
count deliberately differ; several components share a channel. The components are the
presets, stubs, pipeline, and assets that _implement_ the common policy, plus a canonical
document that _states_ it. Each reaches the consumer via one of three channels:

1. **Referenced in place** — presets (stay in `node_modules`)
2. **Copied on install** — stubs, pipeline, assets
3. **Linked, never copied** — policy

The diagram below numbers those three channels; the terms after it define the five
components.

```
        ┌─────────────────────────────────────────────────┐
        │        @doikayt/typescript-build-config        │
        │                                                 │
        │  presets  eslint  prettier  tsconfig  playwright│
        │  stubs       src/top-level/*                    │
        │  pipeline    src/pipeline/*                     │
        │  assets      assets/*                           │
        │  policy      docs/RELEASE-PROCESS.md            │
        └─────────┬───────────────┬───────────────┬───────┘
                  │               │               │
   1 REFERENCED   │  2 COPIED     │  3 LINKED,    │
     IN PLACE     │    ON INSTALL │  NEVER COPIED │
                  │               │               │
 presets stay in  │ postinstall   │ cited by URL  │
 node_modules —   │ seeds stubs,  │ only; one     │
 updates flow     │ pipeline, and │ canonical     │
 with npm update  │ assets once;  │ copy — drift  │
                  │ consumer owns │ is impossible │
                  │ them; drift ⇒ │               │
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
        │  owned assets:    docs/assets/doikayt-logo.*    │
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
- **Assets** — brand logos seeded once into `docs/assets/` by the postinstall script.
  Same channel-2 treatment as the pipeline: copied if absent, skipped if identical,
  warning (without a text diff) if diverged. Consumer owns the copy; it will not be
  silently overwritten.
- **Policy** — the release process itself, stated once in
  [docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md). Consumers reference it by URL from
  their own contributor docs (as the consumer box shows) — never copied, so it cannot
  drift.

## Enforcement Model

_Phase 2 of 2: keeping a repo **conformant** over time, once delivery has seeded
it. Getting artifacts in is the [Delivery Model](#delivery-model) above._

Delivery gets canonical artifacts into a consuming repo; enforcement keeps that repo aligned
as both it and the upstream evolve. The two phases share machinery:
**`postinstall` is the workhorse of both** — it _delivers_ on first install
(copying absent files) and _enforces_ on every subsequent run that rebuilds this
package into `node_modules` — a fresh `npm install`, an `npm ci` (which always
rebuilds the whole tree), or an `npm update` that bumps this package — warning on
drift and on missing conventions. A no-op `npm install` with an unchanged tree
does not re-trigger it.

Enforcement runs on a spectrum from soft to hard:

- **Soft — install-time warnings (name-level).** On every `npm install` /
  `npm update`, postinstall warns (non-fatal) when a required target
  (`ci`, `update-all-format`) is missing, and prints a diff when a copied
  pipeline or asset file has drifted from its canonical template. See
  [Release Pipeline](#release-pipeline) for the per-file drift behavior and
  [Conventions Every Project Must Adhere To](#conventions-every-project-must-adhere-to)
  for the required targets.
- **Hard — the fail-closed `ci` gate.** The release workflow runs `npm run ci`;
  a repo without a working `ci` gate fails the build and cannot publish. This is
  the only enforcement with real teeth — see
  [The `ci` script](#the-ci-script).

One deliberate limitation: the soft checks are **name-level only**. They verify
a `ci` script _exists_, not that it runs anything meaningful — `"ci": "echo ok"`
satisfies the warning. Guaranteeing that `ci` actually does its job is left to
the fail-closed pipeline, where a broken gate surfaces as a red build. Put
differently: delivery is "deep" (full config seeded) while continuous
enforcement is "shallow" (presence, not behavior) — a gap worth knowing when you
rely on it.

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

## Conventions Every Project Must Adhere To

Every project that installs this package must implement two named entry points.
`postinstall` warns whenever it re-runs (a fresh `npm install`, an `npm ci`, or
an `npm update` that bumps this package) until each is in place.

### The `ci` script

Every project must expose a `ci` script in `package.json`. The release workflow
calls `npm run ci` as its CI gate. A project without a `ci` script will fail
the CI job — the correct signal that the convention has not been met.

`ci` is the single entry point for "everything that must pass before a release":
formatting checks, tests, linting — whatever the project requires. What it
calls internally is up to the project:

```json
{
  "scripts": { "ci": "prettier --check src/ && vitest run && playwright test" }
}
```

`npm run ci` doubles as your local "simulate CI" command.

**Invariant:** if `npm run ci` passes locally, and you commit and push, the
remote CI job will pass.

#### NX projects

`package.json` is the source of truth — it is always present, and the release
workflow calls `npm run ci` directly. So an NX project keeps the **real** `ci`
command in `package.json`, exactly like any other project — it does *not*
delegate package.json to NX. If you want NX orchestration, add NX targets that
delegate **to** npm, never the reverse:

```json
// package.json — the real command lives here
{ "scripts": { "ci": "npm run check-all-format && npm run test" } }
```

```json
// project.json (optional) — an NX target delegates to the npm script
{
  "targets": {
    "ci": {
      "executor": "nx:run-commands",
      "options": { "command": "npm run ci" }
    }
  }
}
```

The release workflow is NX-agnostic — it calls `npm run ci`, never NX directly.

### The `update-all-format` target

Every project must expose an `update-all-format` entry point — either a
`package.json` script or an NX `project.json` target. This is the single
command for "reformat everything before reviewing a diff": run it before
committing to keep diffs clean and reviewable.

The plugin enforces the name only, not the content:

```json
{
  "scripts": {
    "update-all-format": "prettier --write src/ && npm run update-markdown-docs"
  }
}
```

Or as an NX target:

```json
{
  "targets": {
    "update-all-format": {
      "executor": "nx:run-commands",
      "options": { "command": "prettier --write src/" }
    }
  }
}
```

If neither is found, `postinstall` prints a warning (non-fatal) each time it
re-runs (a fresh `npm install`, an `npm ci`, or an `npm update` that bumps this
package) until the target is added.

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

## For Maintainers

### Clone and install

```bash
git clone git@github.com:doikayt/typescript-build-config.git
cd typescript-build-config
npm install
```

The postinstall script detects that it is running inside the plugin repo itself
and exits immediately — no config stubs or pipeline files are copied.

### Run the full CI suite

```bash
npm run ci
```

This is the same entry point mandated for every consumer repo. In this project
it runs a Prettier format check followed by the full test suite:

```
npm run ci  →  prettier --check src/  →  node --test
```

A passing `npm run ci` locally means the remote CI job will pass.

To auto-fix formatting before verifying:

```bash
npm run update-all-format && npm run ci
```

## License

MIT

