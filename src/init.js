import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { canonicalScripts, devDependencyNames } from "./canonical-scripts.js";
import { applyToPackageJson } from "./package-json.js";
import { resolveVersions } from "./dep-versions.js";

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

  const report = (label, keys) => {
    if (keys.length) log(`${label}: ${keys.join(", ")}`);
  };
  report("Added scripts", added.scripts);
  report("Kept existing scripts", skipped.scripts);
  report("Declared devDependencies", added.devDependencies);
  report("Kept existing devDependencies", skipped.devDependencies);
  log("");
  log("Next: run `npm install` to fetch the newly declared devDependencies.");

  return { added, skipped };
}
