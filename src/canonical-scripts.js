// The canonical npm-script set init writes into every consumer. package.json is
// the single source of truth (it is always present); NX projects, if any, add
// thin targets that delegate to `npm run <x>` — never the reverse. So this set
// is identical regardless of orchestrator; only the UI/console distinction
// changes it (Playwright e2e).

export function canonicalScripts({ ui = false } = {}) {
  const ci = ui
    ? "npm run check-all-format && npm run test && npm run test:e2e"
    : "npm run check-all-format && npm run test";

  const scripts = {
    ci,
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

  return scripts;
}

export function devDependencyNames({ ui = false } = {}) {
  const names = ["vitest", "@doikayt/autogen-markdown-doc"];
  if (ui) names.push("@playwright/test");
  return names;
}
