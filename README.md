# @datalackey/typescript-build-config

Shared build configuration presets for TypeScript-based projects.

## Purpose

This package centralises common build tooling configuration across all
TypeScript projects maintained under the `@datalackey` scope. The goal is a
single source of truth for settings that should be held constant across
projects, avoiding drift between repos over time. Beyond configuration, it
also encapsulates the common build **policy** and release **workflow logic**
— the pipeline files it installs into each consumer repo and the canonical
release process in
[docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md) — for reuse by every
current and future project that depends on this base package.

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
