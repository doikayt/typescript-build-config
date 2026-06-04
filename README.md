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


## Current Contents

    - ESLint Config
    - Prettier Config
    - License 
    - Post install script which sets up 'starter' top level config files in your root project folder.
      These configs extend the content of what is installed under node_modules.


## License

MIT
