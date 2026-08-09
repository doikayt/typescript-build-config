// The canonical npm-script set init writes into every consumer. package.json is
// the single source of truth (it is always present); NX projects, if any, add
// thin targets that delegate to `npm run <x>` — never the reverse. Two axes vary
// the set: UI/console (Playwright e2e) and library/app. `build` is universal
// (both archetypes compile); only a publishable library adds `prepack`, which
// builds dist/ at publish time so `changeset publish` ships compiled output.

export function canonicalScripts({ ui = false, library = false } = {}) {
  const ci = ui
    ? "npm run check-all-format && npm run test && npm run test:e2e"
    : "npm run check-all-format && npm run test";

  const scripts = {
    ci,
    build: "tsc",
    test: "vitest run",
    "update-all-format":
      "npm run update-code-formatting && npm run update-markdown-docs",
    "update-code-formatting": "prettier --write src/",
    "update-markdown-docs": "autogen-markdown-doc",
    "check-all-format":
      "npm run check-code-formatting && npm run check-markdown-docs",
    "check-code-formatting": "prettier --check src/",
    "check-markdown-docs": "autogen-markdown-doc check",
  };

  if (ui) scripts["test:e2e"] = "doikayt-playwright-install && playwright test";
  if (library) scripts.prepack = "npm run build";

  return scripts;
}

export function devDependencyNames({ ui = false } = {}) {
  // @changesets/cli is required by the release pipeline (release.yml runs
  // `npx changeset version` / `publish`), so every consumer needs it installed —
  // otherwise `npx changeset` can't resolve the `changeset` bin and the release
  // job fails with "could not determine executable to run".
  const names = [
    "vitest",
    "@doikayt/autogen-markdown-doc",
    "typescript",
    "@changesets/cli",
  ];
  if (ui) names.push("@playwright/test");
  return names;
}

// Top-level package.json fields init sets (non-destructively). `type: "module"`
// is universal. A publishable **library** also gets the dist/-based entry points
// (main/types/exports) and the tarball allow-list (files), assuming the canonical
// src/index.ts entry. An **app** is instead marked `private` so `changeset
// publish` never publishes it — its release is a version bump + tag only. Either
// way, fields a consumer already set are left untouched by the caller.
export function packageFields({ library = false } = {}) {
  const fields = { type: "module" };
  if (library) {
    fields.main = "dist/index.js";
    fields.types = "dist/index.d.ts";
    fields.exports = {
      ".": {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
    };
    fields.files = ["dist"];
  } else {
    fields.private = true;
  }
  return fields;
}
