# End-to-end verification: `init` a library and an app

A manual runbook to confirm, hands-on, that this package can scaffold and ship
both project archetypes. Each step lists the command and **what to look for**.

There are two depths:

- **Local (safe, default)** — proves the build/pack/publish _mechanics_ without
  writing to npm or GitHub. Uses `npm pack` and `npm publish --dry-run`. Run this
  every time.
- **Full pipeline (optional)** — actually pushes to a GitHub repo and lets
  `release.yml` publish to npm. Only when you want the real thing; it burns a
  version number and (for a library) a public package name.

## Prerequisites

- Node 22+ and npm.
- The version of `@doikayt/typescript-build-config` under test must include the
  **library/app prompt**. Two ways to get it:
  - **Released:** `npm install --save-dev @doikayt/typescript-build-config@latest`
    (once this change is published).
  - **Pre-release (test the working copy):** from this repo, `npm pack` to
    produce `doikayt-typescript-build-config-<ver>.tgz`, then install that
    tarball path in the scratch project below. This is how you verify _before_
    publishing.
- For the **full** path only: a throwaway GitHub repo and an `NPM` token secret
  (see [docs/RELEASE-PROCESS.md](RELEASE-PROCESS.md)), plus — for a library — a
  package name not already taken on npm.

Do each scenario in a fresh empty directory outside this repo.

## Testing publish without cluttering npm

The scenarios keep routine checks off the public registry (`npm pack`,
`npm publish --dry-run`). For the **optional full path (A4 / B4)**, prefer one of
these so you never leave test packages on npm:

- **Local registry (recommended)** — run [verdaccio](https://verdaccio.org), a
  throwaway npm proxy, and publish to it instead of npm:

  ```bash
  npx verdaccio &                                # serves http://localhost:4873
  npm publish --registry http://localhost:4873   # goes to the local registry
  ```

  Confirm it appears at `http://localhost:4873`, then wipe everything by stopping
  verdaccio and deleting its storage dir (`~/.config/verdaccio/storage` by
  default). Nothing ever reaches public npm.

- **Publish to real npm, then unpublish the same day** — if you must hit the real
  registry with a throwaway `@your-scope/junk`:
  - Unpublish within **72 hours**; after that npm restricts it (needs no
    dependents / low downloads, or npm support):

    ```bash
    npm unpublish @your-scope/junk --force         # the whole package
    npm unpublish @your-scope/junk@0.0.1           # one version
    ```

  - A name@version you unpublish is **burned for 24 h** — you can't republish that
    exact version. Bump the version or use a fresh name between runs.
  - A public **scoped** publish needs `--access public` (or
    `publishConfig.access: "public"`); otherwise npm attempts a *private* publish,
    which requires a paid org.

---

## Pushing to a reusable scratch repo

The full-pipeline steps (A4 / B4) push to a real GitHub repo to watch
`release.yml` run. Rather than a new repo each run, keep **one throwaway repo**
(e.g. `doikayt/scratch-pad`) and overwrite it each time with a force push.

From the scaffolded project directory:

```bash
# green CI needs generated docs + a lockfile
npm install                       # writes package-lock.json (CI's `npm ci` needs it)
npm run update-all-format         # fills README markers so check-markdown-docs passes

git init && git branch -M main
git add -A
git status                        # confirm node_modules/ is NOT staged (.gitignore covers it)
git commit -m "chore: scratch-pad test scaffold"   # chore: = CI runs, nothing publishes;
                                                    # use feat: to test the publish path

git remote add origin git@github.com:doikayt/scratch-pad.git   # set-url if origin exists
git push -u origin main --force   # first push: sets upstream + overwrites the scratch repo
```

Notes:

- **The first push must be explicit.** A pull-first alias (e.g. `gp`) fails with
  _"no tracking information for the current branch"_ — `main` has no upstream yet,
  and it would try to rebase onto the scratch repo's old history. Run
  `git push -u origin main --force` once; afterward `main` tracks `origin/main`
  and `gp` works.
- **`--force` is required** because your scaffold and the existing scratch repo
  have unrelated histories (a normal push is rejected as non-fast-forward). It
  overwrites the scratch repo — which is the point.
- **`git remote -v` prints nothing** → no remote is set; run the `git remote add`
  line above (or `git remote set-url origin …` if one already points elsewhere).
- **`chore:` vs `feat:`** — `chore:` lands the code and runs CI but publishes
  nothing (no `NPM` secret needed); `feat:` / `fix:` trigger the release job.
- **Never commit `node_modules/`** — the seeded `.gitignore` covers it; the
  `git status` check is your guard.

---

## Scenario A — Library (publishes to npm)

### A1. Scaffold

```bash
rm -rf /tmp/verify-lib && mkdir /tmp/verify-lib && cd /tmp/verify-lib
npm init -y
npm install --save-dev @doikayt/typescript-build-config   # or the .tgz path
npx @doikayt/typescript-build-config init
#   Playwright?          → n
#   Publishable library? → y
#   Scaffold demo?       → y
npm install
```

**Look for** in `package.json`:

- `"type": "module"`, and **no** `"private"` key
- `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`, `"files": ["dist"]`,
  and an `exports` map (not just the string `"dist"`):
  ```json
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }
  ```
  Note `main` is `dist/index.js`, **not** the `index.js` that `npm init -y`
  seeded — `init` replaces that placeholder.
- `"scripts".test` is `"vitest run"` — **not** npm's
  `echo "Error: no test specified"` stub (`init` replaces that too)
- scripts include `build`, `prepack`, `ci`, `test`, `update-all-format`
- devDependencies include `vitest`, `typescript`, `@doikayt/autogen-markdown-doc`
- `src/` has the demo module (`index.ts`, `math-engine/…`, incl. `MathEngine.test.ts`),
  plus a `README.md` and `project.json`

### A2. Build, test, docs

```bash
npm test                    # Look for: vitest reports the demo tests passing
npm run build               # Look for: dist/index.js and dist/index.d.ts created
node dist/index.js 2>/dev/null; echo "exit $?"   # module has no CLI output; just confirms it loads
npm run update-all-format   # Look for: README markers filled with Mermaid (graph TD / classDiagram)
```

### A3. Verify the published artifact — **local, no registry write**

```bash
npm pack                    # runs prepack → build, then packs
tar -tzf *.tgz | sort
```

**Look for:** the tarball contains **only** `package/dist/**` (`.js` + `.d.ts`)
and `package/package.json` — **no** `src/`, no `.ts`, no test files. That proves
`prepack` compiled and `files: ["dist"]` scoped the tarball.

```bash
npm publish --dry-run
```

**Look for:** it reports what it *would* publish (same `dist/` contents) and
exits 0. No error about the package being private.

### A4. Full publish via the pipeline — **optional, writes to npm**

1. Set a unique `"name"` in `package.json` (a scope you control) and make sure the
   repo's `NPM` secret is set.
2. Push to your scratch repo per
   [Pushing to a reusable scratch repo](#pushing-to-a-reusable-scratch-repo) —
   but commit with **`feat:`** so the release job fires.
3. Watch the **Actions** run (`CI / Release`).

**Look for:** the `ci` job passes; the `release` job runs `changeset version`
(bumps to a patch), commits `chore: release`, then `changeset publish` **uploads
to npm**; a `v0.0.x` tag appears. Confirm the package page on npmjs.com shows
your version with only `dist/` files.

---

## Scenario B — App / CLI (never publishes)

### B1. Scaffold

```bash
rm -rf /tmp/verify-app && mkdir /tmp/verify-app && cd /tmp/verify-app
npm init -y
npm install --save-dev @doikayt/typescript-build-config   # or the .tgz path
npx @doikayt/typescript-build-config init
#   Playwright?          → n
#   Publishable library? → n        (this is the default)
#   Scaffold demo?       → y
npm install
```

**Look for** in `package.json`:

- `"type": "module"` **and** `"private": true`
- **no** `main` / `types` / `exports` / `files` keys — `init` even drops the
  placeholder `main: "index.js"` that `npm init -y` seeded (an app has no entry
  point to publish)
- `"scripts".test` is `"vitest run"`, not npm's `echo` stub
- scripts include `build`, `ci`, `test` — but **no** `prepack`
- devDependencies still include `vitest`, `typescript`,
  `@doikayt/autogen-markdown-doc`

### B2. Build and test (same as a library — an app still compiles)

```bash
npm test                    # Look for: demo tests pass
npm run build               # Look for: dist/ compiled
npm run update-all-format   # Look for: README diagrams filled
```

### B3. Verify it will **not** publish — the key check

```bash
npm publish --dry-run
```

**Look for:** npm **refuses** with an error like
`This package has been marked as private`. That's the app archetype working —
`private: true` makes publishing impossible.

### B4. Full pipeline — **optional**

Same push flow —
[Pushing to a reusable scratch repo](#pushing-to-a-reusable-scratch-repo), commit
with **`feat:`** — but:

**Look for:** the `release` job still runs `changeset version` and pushes the
`chore: release` commit and tag — but `changeset publish` **skips** the private
package (log says nothing was published), and **nothing appears on npm**. Release
= version + tag only, exactly as intended for an app.

---

## Pass criteria at a glance

| Check | Library | App |
| --- | --- | --- |
| `package.json` `private` | absent | `true` |
| `main`/`exports`/`files` | present (→ `dist`) | absent |
| `prepack` script | present | absent |
| `npm pack` tarball | only `dist/` | (n/a — not published) |
| `npm publish --dry-run` | succeeds | refuses (private) |
| Pipeline release | version + tag + **npm publish** | version + tag, **no publish** |
