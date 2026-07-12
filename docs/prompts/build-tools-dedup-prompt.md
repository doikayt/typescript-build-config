# Prompt: de-duplicate release docs and investigate shared release workflow

Paste everything below this line into a Claude session running in the `build-tools` repo.

---

The generic release policy formerly documented only in this repo's
`javascript/docs/CONTRIBUTING.md` has been extracted into the
`@datalackey/typescript-build-config` package, whose repo now hosts the canonical policy
document:

    https://github.com/doikayt/typescript-build-config/blob/main/docs/RELEASE-PROCESS.md

That document covers: how the automated release pipeline works (auto-changeset →
`changeset version` + `[skip ci]` commit-back → `changeset publish` + tag), versioning tiers
and the commit-prefix → bump mapping, forcing a specific bump level, suppressing a release,
handling `changeset status` errors, verifying a release, maintainer rules, troubleshooting
publish auth via `verify-npm-token.yml`, and the coordinated (sideways/`fixed`) version bump
policy for multi-package workspaces.

Do the following two tasks. Task 1 is a concrete edit; task 2 is an investigation whose
deliverable is a written recommendation, not code changes.

## Task 1 — De-duplicate `javascript/docs/CONTRIBUTING.md`

Replace the sections that are now canonical in RELEASE-PROCESS.md with short stubs (2–4
lines each) that state the build-tools-specific facts and link to the corresponding anchor in
the canonical doc. Sections to stub out:

- Versioning Tiers (both tables)
- Forcing a specific bump level
- Suppressing a release
- Handling `changeset status` Errors
- How the Automated Release Pipeline Works
- Verifying a Release
- Rules

Retain in full (they are build-tools-specific, not policy): First-Time Setup, Overall Repo
Structure Model, Build Pipeline / NX / IDE integration, Package Naming Policy, day-to-day
development flow, integration testing via the wrapper package, Packaging and Release Workflow
Details (steps 1–5), Design Principles pointer.

For the Sideways Version Bump Policy section: keep the build-tools specifics (the five-package
`fixed` group in `javascript/.changeset/config.json`) and link to the canonical doc's
"Coordinated (Sideways) Version Bumps" section for the rationale.

For "How the Automated Release Pipeline Works": the stub should note the one build-tools
addition not in the canonical flow — the post-publish smoke test that installs
`@datalackey/autogen-markdown-doc` from the registry and runs it against the `math-cli-nx`
fixture — and link to the canonical doc for the rest.

After editing, regenerate the TOC (`update-markdown-toc` is this repo's own tool) and run the
workspace doc/format targets before committing:

```bash
cd javascript
npx nx run build-tools-workspace:update-all
npx nx run build-tools-workspace:check-all
```

Commit as `docs: replace generic release policy with links to typescript-build-config`.

## Task 2 — Investigate sharing release-workflow logic (report only)

Today `.github/workflows/javascript-ci.yml` has two jobs: `build` (tests) and `release`
(build → `scripts/auto-changeset.sh` → `changeset version` → commit bumps → `changeset
publish` → smoke test). The release steps are hand-maintained copies of logic that
`@datalackey/typescript-build-config` now distributes to consumer repos via postinstall
(`src/pipeline/release.yml`, `auto-changeset.sh`, `verify-npm-token.yml`,
`changeset-config.json`).

Evaluate the following options and end with a single recommendation:

1. **Adopt the postinstall distribution.** Install `@datalackey/typescript-build-config` as a
   devDependency of the `javascript/` workspace so its postinstall manages the pipeline files
   (copy when absent, skip when identical, diff-warn when diverged). Check the blockers:
   - The postinstall-distributed `auto-changeset.sh` template substitutes a single
     `PACKAGES=("__PACKAGE_NAME__")` from the consumer's `package.json` name. build-tools
     needs a five-package array. Does the template need multi-package parameterization
     upstream first (e.g. derive the array from the workspace globs or the `fixed` group in
     `.changeset/config.json`)?
   - The postinstall-distributed `release.yml` assumes repo root as working directory and no
     build step;
     build-tools needs `working-directory: javascript`, an NX build, and the smoke test.
     Would the copy immediately diff-warn forever, defeating the purpose?

2. **Reusable workflow.** typescript-build-config publishes a `workflow_call` workflow
   (inputs: working-directory, node-version, build command, optional smoke-test hook) and
   build-tools' release job becomes a one-line
   `uses: doikayt/typescript-build-config/.github/workflows/<name>.yml@<ref>`. Weigh: central
   fixes propagate instantly to all consumers, but a breaking change in the shared workflow
   breaks every consumer's releases at once; pinning to a tag mitigates but reintroduces
   drift.

   Design constraint: the shared workflow's publish job must be callable standalone, with
   the caller supplying its own test-gating job via `needs:` (build-tools keeps
   `nx run build-tools-workspace:ci` as job 1). The shared ci job's `npm test --if-present`
   gate is for simple consumers with no other CI — build-tools should not adopt it, as it
   would duplicate the NX build/test job.

3. **Status quo plus.** Keep hand-maintained copies but adopt only the pieces that fit
   cleanly today (e.g. `verify-npm-token.yml`, which is fully generic — note it currently
   reads `secrets.NPM_TOKEN` in build-tools vs `secrets.NPM` in the shared version; the org
   convention is `NPM`).

The recommendation should state: which option (or sequence), what changes are needed in
**typescript-build-config** to enable it (file these as a list to feed back to that repo —
e.g. multi-package template support, adding `workflow_call` to the shipped `release.yml`),
and what changes are needed in **build-tools**. Do not implement anything in task 2 — produce
the report.
