# Packaging concepts: libraries, apps, and what `init` sets

Background for the choices `init` makes about building and publishing. If terms
like "publish fields" or "ship compiled `dist/`" are unfamiliar, start here. For
_how_ to run `init`, see the [README Usage](../README.md#usage); this doc is the
_why_.

## TypeScript isn't a runnable artifact

You write `.ts`; Node runs `.js`. TypeScript is compiled (by `tsc`, the
`build` script) into plain JavaScript plus type-declaration files:

```
src/index.ts   ──tsc──▶   dist/index.js     (runnable JavaScript)
                          dist/index.d.ts   (types, for editors/consumers)
```

That output folder is `dist/` (short for "distribution"). Node — and anyone who
installs your package — can run `dist/index.js` directly; they generally
**cannot** run your raw `.ts` without extra tooling. So anything meant to run
elsewhere ships the compiled `dist/`, not the source.

(Aside: this very package is the exception that proves the rule — it's authored
in plain `.js`, so its source already _is_ the runnable artifact and it needs no
build. A `.ts` project always needs the compile step.)

## The "publish fields"

These are top-level `package.json` keys that describe your package to whoever
installs it. `init` sets them (only when absent):

| Field | What it does | Who needs it |
| --- | --- | --- |
| `type: "module"` | Marks the package as ESM, so `.js` is treated as ES modules | Both (any ESM project) |
| `main` | The file a consumer loads on `import "your-pkg"` — your entry point | Library only |
| `types` | Where TypeScript finds your `.d.ts` declarations | Library only |
| `exports` | Modern replacement for `main`: a map of what's importable and how types/runtime resolve | Library only |
| `files` | Allow-list of what goes into the published npm tarball (here: just `dist/`) | Publish only |

`main` / `types` / `exports` only matter when _someone else imports your code_.
An app that nobody `npm install`s has no use for them.

## Two archetypes: library vs app

`init` asks whether the project is a **publishable library**. That one answer
changes the build/publish setup:

| | Library | App / CLI |
| --- | --- | --- |
| Compiles to `dist/` (`build`) | ✅ to publish | ✅ to run/deploy |
| `prepack` (build before packing) | ✅ so `changeset publish` ships fresh `dist/` | ❌ |
| `main` / `types` / `exports` / `files` | ✅ | ❌ |
| `private: true` | ❌ | ✅ — so `changeset publish` never publishes it |
| What "release" means | version bump + git tag **+ `npm publish`** | version bump + git tag only |

Both archetypes still get the universal command surface (`ci`, `test`,
`update-all-format`, `build`) — see
[The canonical script set](../README.md#the-canonical-script-set). Only the
publish half differs.

### Why an app is marked `private`

`private: true` tells npm the package must never be published. The release
pipeline's [`changeset publish`](../src/pipeline/release.yml) step honors that
and skips private packages, so an app still gets versioned and tagged on release
— it just isn't pushed to the npm registry. (A future Google Apps Script app
deploys via `clasp`, not npm, which is another reason apps carry no publish
config.)

## Which should I pick?

- **Library** — other code (in this repo or elsewhere) will `import` it. The
  foundational packages are libraries: this config package, `build-tools`, the
  doc-generator plugins, shared framework components.
- **App / CLI** — an end product you run or deploy, not something others import.
  This is the default; `init` marks it `private`.

Unsure? Pick **app** (the default). You can turn a project into a library later
by re-running `init` and answering yes, or by setting the publish fields by hand
— `init` never overwrites fields you've already set.
