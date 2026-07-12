# Contributing

## Development

There is no build step — files under `src/` are published as-is. Edit, then verify:

```bash
npm ci
npm test    # policy enforcement, template/live-copy sync, postinstall behavior
```

The suite (in `tests/`) exercises the templates shipped to consumer repos: the auto-changeset
policy (patch automation, breaking-change enforcement), drift between `src/pipeline/`
templates and this repo's live copies, and postinstall's copy/skip/diff-warn behavior. CI
runs it via `npm test --if-present` before any release.

## Publishing a New Version

Releases are fully automated — never run `npm version` or `npm publish` by hand.

Push a commit with a releasable conventional-commit prefix (`fix:`, `feat:`, `perf:`) to
`main` and CI does the rest: it derives the bump level, runs `changeset version`, commits the
bump back with `[skip ci]`, and publishes to npm.

The complete policy — bump mapping, forcing a minor/major bump, suppressing a release,
handling `changeset status` errors, verifying a release, troubleshooting publish auth — is in
[docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md).

## Adding New Config Presets

Add new files under `src/` and expose them via the `exports` map in
`package.json`. No build step is required — files are published as-is.

## Adding New Pipeline Files

Add the template under `src/pipeline/` and register it in the `pipelineFiles` list in
`src/postinstall.js`. Pipeline files are distributed per-file: copied when absent, skipped
when identical, and diff-warned (never overwritten) when the consumer's copy has diverged.

Note that each pipeline file exists twice: the template under `src/pipeline/` (distributed
to consumers via postinstall) and this repo's own live copy (`.github/workflows/`,
`scripts/`, `.changeset/`) — this repo runs the same pipeline it distributes. When changing
a template, update the live twin to match (for `auto-changeset.sh` the copies differ only
in the substituted package name).
