import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { canonicalScripts, devDependencyNames } from "./canonical-scripts.js";
import { applyToPackageJson } from "./package-json.js";
import { resolveVersions } from "./dep-versions.js";

const templatesDir = fileURLToPath(new URL("templates/", import.meta.url));

// Copy a template into the project only when the destination is absent, so a
// consumer's existing config is never overwritten. Returns what happened.
function seedFile(src, destPath) {
  if (existsSync(destPath)) return "skipped";
  copyFileSync(resolve(templatesDir, src), destPath);
  return "seeded";
}

// Default interactive prompt. Injectable so runInit is testable without stdin.
async function askYesNo(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise((res) => rl.question(question, res));
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export async function runInit({
  cwd = process.cwd(),
  prompt = askYesNo,
  resolveDevVersions = resolveVersions,
  log = console.log,
} = {}) {
  const pkgPath = resolve(cwd, "package.json");
  const raw = readFileSync(pkgPath, "utf8");

  const ui = await prompt(
    "Is this a UI project that needs Playwright (e2e)? [y/N] ",
  );

  const scripts = canonicalScripts({ ui });
  const devDependencies = resolveDevVersions(devDependencyNames({ ui }));

  const { text, added, skipped } = applyToPackageJson(raw, {
    scripts,
    devDependencies,
  });
  writeFileSync(pkgPath, text);

  const configs = [{ name: "vitest.config.ts" }];
  if (ui) configs.push({ name: "playwright.config.ts" });
  const seededConfigs = [];
  const keptConfigs = [];
  for (const { name } of configs) {
    const result = seedFile(name, resolve(cwd, name));
    (result === "seeded" ? seededConfigs : keptConfigs).push(name);
  }

  const report = (label, keys) => {
    if (keys.length) log(`${label}: ${keys.join(", ")}`);
  };
  report("Added scripts", added.scripts);
  report("Kept existing scripts", skipped.scripts);
  report("Declared devDependencies", added.devDependencies);
  report("Kept existing devDependencies", skipped.devDependencies);
  report("Seeded config files", seededConfigs);
  report("Kept existing config files", keptConfigs);
  log("");
  log("Next: run `npm install` to fetch the newly declared devDependencies.");

  return { added, skipped, seededConfigs, keptConfigs };
}
