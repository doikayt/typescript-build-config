# Prerequisites: bring-your-own repo and npm registry

The verification runbook's **full-pipeline** steps (A4 / B4) push to a GitHub repo
and let `release.yml` publish to npm. This page lists what a developer who is
**not** the `@doikayt` maintainer must set up to run those steps against **their
own** GitHub repo and npm account — no access to the `doikayt` org or scope
required.

> **You only need this for the full pipeline.** The local depth (A1–A3, B1–B3) in
> [`verification-runbook.md`](verification-runbook.md) writes to nothing — no repo,
> no tokens. Do those first; set up the below only when you want to watch
> `release.yml` actually publish.

## What the pipeline needs from you

| # | Thing | Why |
| --- | --- | --- |
| 1 | A GitHub repo you can push to | to trigger Actions and watch `release.yml` |
| 2 | An npm scope you control | so the package publishes under a name that's yours |
| 3 | An `NPM` token wired as a repo secret | the credential the release job publishes with |

## 1. A GitHub repo you own

- Create a throwaway repo under your account (e.g. `you/scratch-pad`). Reuse one
  repo each run via force-push — see
  [Pushing to a reusable scratch repo](verification-runbook.md#pushing-to-a-reusable-scratch-repo).
- It must contain the scaffold's
  [`.github/workflows/release.yml`](../.github/workflows/release.yml) — the
  scaffolder seeds it for you.
- **Actions enabled** (Settings → Actions → General → *Allow all actions*).
- **Leave `main` unprotected.** The release job pushes a `chore: release [skip ci]`
  commit and a tag back to `main`; a branch-protection rule requiring PRs or
  reviews blocks that push and fails the release. A throwaway repo needs no
  protection.
- **No workflow-permission toggle needed.** The workflow declares
  `contents: write` and `id-token: write` itself, which overrides a read-only repo
  default. The built-in `GITHUB_TOKEN` is auto-provided — you never create it.
- **Git push auth** from your machine: an SSH key or a PAT/HTTPS credential for
  your repo.

## 2. An npm scope you control

- An npm account (npmjs.com) and a **scope you own** — your username scope
  `@yourname` works for public packages on a free account.
- Set the package name under your scope when you scaffold: at the `init`
  **Package name?** prompt, type `@yourname/verify-lib`. A scoped name is kept
  as-is; a bare name is forced to `@doikayt`, which you can't publish. (The `new`
  command defaults to `@doikayt` — override it at the `init` prompt.)
- Public scoped publishes need `--access public`, which the scaffold sets via
  `publishConfig.access: "public"` in `package.json`. Confirm it's present.
- The library name must be free on npm (`npm view @yourname/verify-lib` should
  return a 404 / "not found").

### Using a different registry (optional)

To publish somewhere other than npmjs (GitHub Packages, a private registry), also:

- point the workflows at it — change `registry-url` in
  [`.github/workflows/release.yml`](../.github/workflows/release.yml) and
  [`.github/workflows/verify-npm-token.yml`](../.github/workflows/verify-npm-token.yml);
- set `publishConfig.registry` in `package.json`;
- issue the token (step 3) from that registry.

Most devs can skip this — the default is npmjs.

## 3. The `NPM` repo secret (the one secret you must configure)

This is the credential the release job publishes with:

- **Name:** `NPM` — must match exactly. The workflow injects it as
  `NODE_AUTH_TOKEN`.
- **Where:** your repo → **Settings → Secrets and variables → Actions → New
  repository secret**.
- **Value:** an npm token that can publish to your scope — use either:
  - a classic **Automation** token, or
  - a **granular access token** with read+write on your scope **and 2FA bypass
    enabled** (set an expiry).

  Interactive 2FA can't be satisfied in CI, so the token must not require an OTP
  at publish time.

### Verify the secret before a real run

The scaffold ships a **Verify NPM Token** workflow so you can confirm the secret
without publishing anything:

- GitHub → **Actions → Verify NPM Token → Run workflow**.
- It runs `npm whoami` with your `NPM` secret. **Green + your username** = the
  token authenticates. **Red** = the token is expired/revoked/malformed, or the
  secret is missing or misnamed.

See the token-troubleshooting section of
[`RELEASE-PROCESS.md`](RELEASE-PROCESS.md) for failure modes in more detail.

## Checklist

| Item | Where | Value / setting |
| --- | --- | --- |
| Scratch repo | your GitHub account | push access; Actions on; `main` unprotected |
| Package name | `init` prompt / `package.json` | `@yourname/…` + `publishConfig.access: "public"` |
| `NPM` secret | repo → Settings → Secrets → Actions | Automation or 2FA-bypass granular publish token |
| Git push auth | your machine | SSH key or PAT for your repo |

Then follow [`verification-runbook.md`](verification-runbook.md), substituting your
repo URL for `doikayt/scratch-pad` and your scope for `@doikayt`.

[![Remember the USS Liberty!](https://badge.techforpalestine.org/ceasefire-now)](https://techforpalestine.org/learn-more)
