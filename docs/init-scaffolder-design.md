# `init` Scaffolder — Design & Vision

> **STATUS: PLANNED — NOT YET IMPLEMENTED.**
> This document describes intended future behavior for review at the outset of
> the work. Nothing here ships today. The current, implemented behavior is
> described in the [README](../README.md) (see
> [Delivery Model](../README.md#delivery-model) and
> [Enforcement Model](../README.md#enforcement-model)). Where the two disagree,
> the README is authoritative for what exists now; this document is the target.

## Why

Two goals drive this package, and they pull in different directions:

1. **Consistency enforcement** — every `@doikayt` TypeScript repo should expose
   the same command surface and share the same lint / format / release policy.
2. **Minimal per-project setup** — standing up a new repo should cost as close
   to zero manual wiring as possible.

They are reconciled by one architectural choice: a single upstream package both
_defines_ the conventions and _distributes_ them. Today, distribution happens
two ways — presets referenced in `node_modules`, and files copied by
`postinstall`. Neither delivers **npm scripts**: the canonical command surface
(`ci`, `update-all-format`, …) has to be written into a consumer's
`package.json`, and no current channel does that. `init` is that missing
channel.

## Delivery vs. enforcement (where `init` fits)

- **`postinstall` stays warn-only and non-destructive.** It copies config /
  pipeline / asset files and warns (name-level) when a required target is
  missing. It never mutates `package.json`.
- **`init` is the opt-in scaffolder** that _writes_ the canonical script set and
  declares the devDeps those scripts need. It runs explicitly, so rewriting
  `package.json` is expected rather than surprising.

Auto-injecting scripts in `postinstall` was **considered and rejected**:
`postinstall` is non-interactive (it can't ask the UI/Playwright question the
`ci` default depends on); silently editing `package.json` on every install
dirties the git tree and can break `npm ci` / clean-tree CI checks; and it would
write a `ci` whose deps aren't installed yet — a broken gate that reads as
"done".

## Usage flow

For a **new** project:

```bash
npm init -y                                               # npm builtin → package.json
npm install --save-dev @doikayt/typescript-build-config   # postinstall: copies configs + warns
npx @doikayt/typescript-build-config init                 # scaffolder: writes scripts + declares devDeps
npm install                                               # fetch the newly declared devDeps
```

For an **existing** project: skip `init`. `postinstall`'s warnings are the
acceptable signal, and the maintainer wires up `ci` / `update-all-format`
manually (or runs `init` deliberately if they want the full set).

## `init` behavior

- **Interactive.** Prompts, with sensible defaults, rather than requiring flags.
- **Detect orchestrator.** `nx.json` / `project.json` present → NX; else plain
  npm. If ambiguous, prompt.
- **Idempotent.** Only writes a script if it is absent; never overwrites a
  customized one. Re-running is safe.
- **Never installs under the hood.** It edits `devDependencies` and tells the
  user to run `npm install`. No `npm install -D` shelled out, no "install now?"
  prompt.
- **Single source of truth = `package.json` scripts.** For NX projects, the NX
  `project.json` targets chain to `npm run <x>`; the release workflow calls
  `npm run ci`, never NX directly.

### Prompts

1. **Orchestrator** (only if ambiguous): npm or NX.
2. **UI project needing Playwright?**
   - **No** (console utility): no Playwright at all.
   - **Yes** (UI): full Playwright setup — see
     [Playwright / e2e (UI projects)](#playwright--e2e-ui-projects) below.

## Canonical script set

`init` writes the full set below. It is deliberately fine-grained: each task is
its own small, single-purpose script (for example `update-code-formatting` runs
only Prettier), and the higher-level scripts just call those smaller ones instead
of inlining commands.

The set has two mirrored sides:

- a **write** side (`update-*`) that reformats files in place, and
- a **check** side (`check-*`, used by `ci`) that verifies them without changing
  anything.

Both sides call the same underlying tasks (code formatting, markdown docs), so
the write and check commands can never drift out of sync:

```json
{
  "scripts": {
    "ci":                     "npm run check-all-format && npm run test",

    "test":                   "vitest run",
    "test:e2e":               "playwright install chromium && playwright test",

    "update-all-format":      "npm run update-code-formatting && npm run update-markdown-docs",
    "update-code-formatting": "prettier --write src/",
    "update-markdown-docs":   "autogen-markdown-doc",

    "check-all-format":       "npm run check-code-formatting && npm run check-markdown-docs",
    "check-code-formatting":  "prettier --check src/",
    "check-markdown-docs":    "autogen-markdown-doc check"
  }
}
```

Notes:

- `test` is **first-class** so both `ci` and the reflexive `npm test` use it.
- `test:e2e` and the `&& npm run test:e2e` in `ci` are added **only** for UI
  projects.
- `test` defaults to **vitest** (the standard). See the dogfooding note below.
- `update/check-markdown-docs` use
  [`@doikayt/autogen-markdown-doc`](https://github.com/doikayt/build-tools/tree/main/javascript/autogen-markdown-doc)
  (`autogen-markdown-doc` for update, `autogen-markdown-doc check` for CI drift).

### devDependencies `init` declares

- `vitest` (always)
- `@doikayt/autogen-markdown-doc` (always — `update/check-markdown-docs` need it)
- `@playwright/test` (UI projects only)

Declared as edits to `devDependencies`; the user runs `npm install` to fetch
them.

## Playwright / e2e (UI projects)

Playwright applies to **UI projects only** — console utilities get none of this.

**e2e stays in the `ci` gate.** For a UI project, `init` folds
`&& npm run test:e2e` into `ci`, so the release gate is honest: `npm run ci`
green means unit *and* e2e passed. This is a deliberate choice — flaky e2e is
treated as a bug to fix, not a reason to move tests off the release path. A
larger, deliberately slower/flakier suite (`e2e++`) can live in its own script
and a separate CI job, kept out of the release `ci` gate.

**Browsers are not npm dependencies.** `npm install` fetches the
`@playwright/test` library, but the browser binaries are downloaded separately
by `playwright install`. So the browser install is **baked into the `test:e2e`
script** rather than left to `npm install`:

```json
"test:e2e": "playwright install chromium && playwright test"
```

`playwright install` is idempotent and cached, so after the first run it is a
fast no-op. This makes browsers appear automatically in every environment with
no extra manual step — locally (first `npm run test:e2e`) and on the CI runner
(via `npm run ci` → `npm run test:e2e`). Crucially, it keeps
[`release.yml`](../src/pipeline/release.yml) uniform: the shared workflow never
has to learn about Playwright — it still just runs `npm run ci`.

**App bring-up lives in the Playwright config, not the workflow.** The seeded
config uses Playwright's `webServer` option to start the app and wait for it
before tests run, so no workflow step is needed to launch a server.

**NixOS dev machines** use the package's
[`nixChromiumLaunchOptions()`](../src/playwright.js) to point Playwright at the
*system* Chromium via `executablePath`, so `playwright install` is effectively
bypassed on Nix. `definePlaywrightConfig()` abstracts this, so one config works
on NixOS locally and Ubuntu in CI.

**OPEN ISSUE — `--with-deps`.** On GitHub's `ubuntu-latest`, Chromium sometimes
needs OS-level libraries that only `playwright install --with-deps` pulls — but
`--with-deps` requires root (fine on CI, wrong for a dev laptop) and is
Linux-only. Baking `--with-deps` into the cross-platform `test:e2e` script is
therefore not safe. Not yet decided how to reconcile: options include keeping
the script as `playwright install chromium` and letting CI add the OS deps
separately, or a CI-only install step. Deferred.

### NX chaining

NX projects still expose everything as `package.json` scripts (the source of
truth). `project.json` targets, if present, delegate to them:

```json
{ "scripts": { "ci": "nx run-many --target=ci --all" } }
```

## Enforcement roadmap

Enforcement runs on a spectrum, and the plan strengthens the shallow end over
time:

- **Now (soft, name-level):** `postinstall` warns when `ci` / `update-all-format`
  are missing. It checks the name exists, not that the script does anything.
- **Now (hard):** the fail-closed `ci` gate — `release.yml` runs `npm run ci`; a
  repo without a working gate can't publish.
- **Planned (`check-conventions`):** a subcommand CI can run to assert both
  **presence and shape** of the canonical targets — turning the soft name-warn
  into a hard gate and closing the "deep setup, shallow enforcement" gap.

## Dogfooding

This repo currently uses `check-format`, `@doikayt/update-markdown-toc`, and
`node --test` for its own build. Migrating it to the canonical set it scaffolds
(vitest + `@doikayt/autogen-markdown-doc` + `check-all-format`) is a **deferred
decision** — desirable for "practice what we preach" consistency, but not a
blocker for shipping `init`.

## Phasing

- **Phase 0 (done):** `postinstall` warns on missing `ci` in addition to
  `update-all-format`, with tests in
  [`tests/postinstall.test.js`](../tests/postinstall.test.js).
- **Phase 1:** build `init` — the interactive scaffolder writing the canonical
  set above, adding a `bin` entry to [`package.json`](../package.json), and
  documenting it in the README once it exists.
- **Phase 2 (hardening):** `check-conventions`; optional dogfooding migration.
