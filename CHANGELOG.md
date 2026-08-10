# @datalackey/typescript-build-config

## 0.1.22

### Patch Changes

- - fix: no-op postinstall when project package.json is absent

## 0.1.21

### Patch Changes

- - feat: add team shell aliases + installer (base dev setup)
  - feat: add 'new' subcommand — scoped npm init

## 0.1.20

### Patch Changes

- - feat: prompt for a scoped package name on the library path
  - fix: read package name from package.json at runtime in the release pipeline

## 0.1.19

### Patch Changes

- - fix: declare @changesets/cli so the release pipeline can run

## 0.1.18

### Patch Changes

- - fix: make init's prompts work with piped/non-interactive stdin

## 0.1.17

### Patch Changes

- - fix: replace npm init placeholders; reorder init prompts
  - fix: state the default explicitly in the library/app init prompt

## 0.1.16

### Patch Changes

- - feat: gate publish config behind a library/app init prompt

## 0.1.15

### Patch Changes

- - feat: add init demo scaffold and build/publish wiring

## 0.1.14

### Patch Changes

- - feat: ship init scaffolder with usage docs
  - feat: add doikayt-playwright-install wrapper bin

## 0.1.13

### Patch Changes

- - feat: warn on missing ci target in postinstall convention check

## 0.1.12

### Patch Changes

- - fix: just force the build to publish

## 0.1.11

### Patch Changes

- - feat: copy brand assets to docs/assets/ on postinstall; update delivery model diagram
  - feat: add Playwright NixOS launch-options helper and brand assets

## 0.1.10

### Patch Changes

- - fix: swap @datalackey/update-markdown-toc for @doikayt/update-markdown-toc

## 0.1.9

### Patch Changes

- - fix: allow workflow_dispatch to trigger the release job

## 0.1.8

### Patch Changes

- - feat: add auto-generated TOC and wire update-markdown-toc into ci
  - feat: add format check to ci, self-install no-op, and consolidate README conventions

## 0.1.7

### Patch Changes

- - feat: add optional post-publish hook to release workflow

## 0.1.6

### Patch Changes

- a65149c: Warn when a consuming project is missing the `update-all-format` target.

## 0.1.5

### Patch Changes

- - feat: require npm run ci as the mandatory release CI gate

## 0.1.4

### Patch Changes

- 893259e: undo test of breaking chng

## 0.1.3

### Patch Changes

- - fix: push release tags to origin after publish

## 0.1.2

### Patch Changes

- - fix: bump GitHub actions to v5 in workflow templates
  - feat: require handwritten changeset for major releases
  - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.1.1

### Patch Changes

- - fix: bump GitHub actions to v5 in workflow templates
  - feat: require handwritten changeset for major releases
  - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.1.0

### Minor Changes

- fa42ac4: test of minor and what happens

## 0.0.30

### Patch Changes

- - feat: require handwritten changeset for major releases
  - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.29

### Patch Changes

- - feat: require handwritten changeset for major releases
  - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.28

### Patch Changes

- - feat: require handwritten changeset for major releases
  - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.27

### Patch Changes

- - feat: require handwritten changeset for major releases
  - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.26

### Patch Changes

- - feat: require handwritten changeset for major releases
  - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.25

### Patch Changes

- - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.24

### Patch Changes

- - feat: distribute verify-npm-token.yml diagnostic workflow
  - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.23

### Patch Changes

- - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.22

### Patch Changes

- - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.21

### Patch Changes

- - feat: distribute pipeline files via postinstall
  - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.20

### Patch Changes

- - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.19

### Patch Changes

- - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.18

### Patch Changes

- - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.17

### Patch Changes

- - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.16

### Patch Changes

- - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4

## 0.0.15

### Patch Changes

- - feat: add Changesets automated publish pipeline and Node 22 upgrade
  - fix: pin @typescript-eslint peer deps to ^8.57.1 to avoid ts-api-utils crash on TS 5.4
