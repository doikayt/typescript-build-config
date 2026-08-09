import {
  readFileSync,
  writeFileSync,
  existsSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import {
  canonicalScripts,
  devDependencyNames,
  packageFields,
} from "./canonical-scripts.js";
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

// Recursively copy a template directory tree into the project.
function copyDir(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const from = resolve(srcDir, entry.name);
    const to = resolve(destDir, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFileSync(from, to);
  }
}

function dirIsEmpty(dir) {
  return !existsSync(dir) || readdirSync(dir).length === 0;
}

// Default interactive prompt. Buffers input lines as they arrive and lets each
// question pull the next one, so it works with both a live terminal and piped /
// non-interactive stdin (scripts, CI). `rl.question` alone drops lines that
// arrive before the next call — with a pipe every line lands at once, which made
// init silently no-op. On EOF, unanswered prompts default to No. Injectable, so
// runInit stays testable without stdin.
function createAskYesNo() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lines = []; // input lines not yet consumed by a prompt
  const waiters = []; // prompt resolvers waiting for the next line
  let closed = false;
  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else lines.push(line);
  });
  rl.on("close", () => {
    closed = true;
    while (waiters.length) waiters.shift()("");
  });
  const ask = (question) =>
    new Promise((res) => {
      process.stdout.write(question);
      const answer = (line) => res(/^y(es)?$/i.test(line.trim()));
      if (lines.length) answer(lines.shift());
      else if (closed) answer("");
      else waiters.push(answer);
    });
  ask.close = () => rl.close();
  return ask;
}

export async function runInit({
  cwd = process.cwd(),
  prompt,
  resolveDevVersions = resolveVersions,
  log = console.log,
} = {}) {
  // One readline interface for all prompts (see createAskYesNo); close it even
  // on error so a leftover interface never keeps the process alive.
  const ownAsk = prompt ? null : createAskYesNo();
  const ask = prompt ?? ownAsk;
  try {
    return await collectAndScaffold({ cwd, ask, resolveDevVersions, log });
  } finally {
    ownAsk?.close();
  }
}

async function collectAndScaffold({ cwd, ask, resolveDevVersions, log }) {
  const pkgPath = resolve(cwd, "package.json");
  const raw = readFileSync(pkgPath, "utf8");

  // Collect every answer up front, before doing any work or printing next
  // steps, so the flow reads: ask everything → act → report.
  const ui = await ask(
    "Is this a UI project that needs Playwright (e2e)? Default is No. [y/N] ",
  );

  const library = await ask(
    "Is this a publishable library (published to npm)? Default is No\n" +
      "  — a non-library (an app/CLI) is marked private so it is never published. [y/N] ",
  );

  const wantDemo = await ask(
    "Scaffold a starter demo (minimal src module + README + project.json) so\n" +
      "you can build, test, and release immediately? Default is No; existing\n" +
      "files are never overwritten. [y/N] ",
  );

  const scripts = canonicalScripts({ ui, library });
  const devDependencies = resolveDevVersions(devDependencyNames({ ui }));

  const { text, added, skipped } = applyToPackageJson(raw, {
    scripts,
    devDependencies,
    fields: packageFields({ library }),
    // `npm init -y` seeds these placeholders; treat them as unset so the
    // canonical `test` script and (for a library) `main` replace them instead of
    // shadowing them.
    replaceDefaults: {
      scripts: { test: 'echo "Error: no test specified" && exit 1' },
      fields: { main: "index.js" },
    },
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

  const demo = wantDemo
    ? scaffoldDemo({ cwd })
    : {
        scaffolded: false,
        reason: "declined",
        wrote: [],
        skipped: [],
        paths: [],
      };

  const report = (label, keys) => {
    if (keys.length) log(`${label}: ${keys.join(", ")}`);
  };
  report("Added scripts", added.scripts);
  report("Kept existing scripts", skipped.scripts);
  report("Declared devDependencies", added.devDependencies);
  report("Kept existing devDependencies", skipped.devDependencies);
  report("Set package fields", added.fields);
  report("Kept existing package fields", skipped.fields);
  report("Seeded config files", seededConfigs);
  report("Kept existing config files", keptConfigs);
  report("Demo seeded", demo.wrote);
  report("Demo kept existing", demo.skipped);

  log("");
  if (demo.scaffolded) {
    log(
      "Next: `npm install`, then `npm test` and `npm run update-all-format`, " +
        "then commit and push to cut a release.",
    );
    log(`To remove the starter files later: rm -r ${demo.paths.join(" ")}`);
  } else {
    log("Next: run `npm install` to fetch the newly declared devDependencies.");
  }

  return { added, skipped, seededConfigs, keptConfigs, demo };
}

// Seed a minimal starter into a new project: a src/ module, a README with
// doc-generator markers, and a project.json — each independently and only when
// its slot is empty, so nothing a consumer already has is overwritten. Writes
// files only and returns what it did; the caller reports and prints next steps.
function scaffoldDemo({ cwd }) {
  const demoTemplate = resolve(templatesDir, "demo");
  const wrote = [];
  const skipped = [];
  const paths = [];

  // src/: seed the module only when src/ has no files, so starter code never
  // gets mixed into a project that already has source.
  const srcDir = resolve(cwd, "src");
  if (dirIsEmpty(srcDir)) {
    copyDir(resolve(demoTemplate, "src"), srcDir);
    for (const entry of readdirSync(resolve(demoTemplate, "src"))) {
      paths.push(`src/${entry}`);
    }
    wrote.push("src/ module");
  } else {
    skipped.push("src/ (already has files)");
  }

  // README.md and project.json: single files, seeded only when absent.
  for (const name of ["README.md", "project.json"]) {
    if (existsSync(resolve(cwd, name))) {
      skipped.push(name);
    } else {
      copyFileSync(resolve(demoTemplate, name), resolve(cwd, name));
      wrote.push(name);
      paths.push(name);
    }
  }

  return { scaffolded: paths.length > 0, reason: null, wrote, skipped, paths };
}
