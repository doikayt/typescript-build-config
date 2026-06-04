# @datalackey/typescript-build-config

Shared build configuration presets for TypeScript-based projects.

## Purpose

This package centralises common build tooling configuration across all
TypeScript projects maintained under the `@datalackey` scope. The goal is a
single source of truth for settings that should be held constant across
projects, avoiding drift between repos over time.

## Current Contents

    - ESLint Config
    - Prettier Config



**Requirements:**

Install dependencies

```bash
npm install --save-dev @datalackey/typescript-build-config
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install --save-dev prettier
```


**Usage:**

```js
// eslint.config.js
import baseConfig from '@datalackey/typescript-build-config/eslint';

export default [
    ...baseConfig,
    // project-specific overrides here
];
```

The config expects a `tsconfig.eslint.json` at the root of the consuming
project. See [typescript-eslint type-aware linting](https://typescript-eslint.io/getting-started/typed-linting)
for details.

## Planned Additions

- Base `tsconfig.json` compiler options preset
- Prettier formatting config

## License

MIT
