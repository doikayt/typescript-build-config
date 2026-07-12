# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

Patch releases are automated from `fix:` / `feat:` / `perf:` commit prefixes via
`scripts/auto-changeset.sh`. For a minor or major bump, run `npx changeset` locally
before pushing — breaking-change commits without a handwritten changeset fail the
release job.
