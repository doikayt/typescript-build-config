# @datalackey/typescript-build-config

Shared build configuration presets for TypeScript-based projects.

## Purpose

This package centralises common build tooling configuration across all
TypeScript projects maintained under the `@datalackey` scope. The goal is a
single source of truth for settings that should be held constant across
projects, avoiding drift between repos over time.


## Installation 

Install dependencies (using --ignore-engines which prevents bug that stops post-install from running) 

```bash
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install --save-dev prettier
npm install  --ignore-engines  --save-dev @datalackey/typescript-build-config
```

## Support for New Projects Only

This package intentionally lists `eslint`, `prettier`, and the `@typescript-eslint/*` plugins as `dependencies` rather than `peerDependencies`.  This is by design — the package targets new projects only and is not intended for use in existing projects that may have conflicting versions of these tools.


## Current Contents

    - ESLint Config
    - Prettier Config
    - License 
    - Post install script which sets up 'starter' top level config files in your root project folder.
      These configs extend the content of what is installed under node_modules.


## Publishing

Releases are automated via Changesets and GitHub Actions. On every push to `main`:

1. `scripts/auto-changeset.sh` scans commits since the last tag and maps conventional
   commit prefixes to a bump level — `fix:` / `feat:` / `perf:` → patch,
   `feat!:` / `BREAKING CHANGE` → major. `chore:` / `docs:` / `ci:` etc. produce
   no release.
2. `npx changeset version` bumps `package.json` and writes `CHANGELOG.md`.
3. The version commit is pushed back to `main` with `[skip ci]` to avoid a loop.
4. `npx changeset publish` publishes to npm using the `NPM` org-level secret.

**For a patch release** — just push a `fix:` commit to `main`. The workflow handles
the rest.

**For a minor release** — run `npx changeset` locally, commit the generated
`.changeset/*.md` file, then push. The auto-generation step is skipped when a
handwritten changeset is present.

**Manual publish (emergency):**

```bash
npm login          # authenticate to npm as a @datalackey scope member
npm publish
```

## License

MIT
