import {
  existsSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { resolve, dirname } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

const PREFIX = "[@doikayt/typescript-build-config]";

console.log(`${PREFIX} Running postinstall...`);

const projectRoot = process.env.INIT_CWD ?? process.cwd();
const projectPkgPath = resolve(projectRoot, "package.json");

// Installed via `npx @doikayt/... new` into a bare dir (or otherwise before a
// consuming project has a package.json) — nothing to configure. Postinstall is
// warn-only, so no-op instead of crashing.
if (!existsSync(projectPkgPath)) {
  console.log(
    `${PREFIX} No package.json in ${projectRoot} — nothing to configure. Skipping.`,
  );
  process.exit(0);
}

const projectPkg = JSON.parse(readFileSync(projectPkgPath, "utf8"));

if (projectPkg.name === "@doikayt/typescript-build-config") {
  console.log(`${PREFIX} Self-install detected — postinstall is a no-op.`);
  process.exit(0);
}

const srcDir = new URL("top-level", import.meta.url).pathname;
const pipelineDir = new URL("pipeline", import.meta.url).pathname;

// --- Top-level config files: all-or-nothing ---

const configFiles = [
  { src: "gitignore", dest: ".gitignore" },
  { src: "tsconfig.json", dest: "tsconfig.json" },
  { src: "tsconfig.test.json", dest: "tsconfig.test.json" },
  { src: "tsconfig.eslint.json", dest: "tsconfig.eslint.json" },
  { src: "eslint.config.js", dest: "eslint.config.js" },
  { src: "prettier.config.js", dest: "prettier.config.js" },
];

const alreadyExist = configFiles
  .map(({ dest }) => resolve(projectRoot, dest))
  .filter((destPath) => existsSync(destPath));

if (alreadyExist.length > 0) {
  console.log(`${PREFIX} Skipping config files — the following already exist:`);
  for (const destPath of alreadyExist) console.log("  " + destPath);
  console.log(`${PREFIX} Delete them manually to re-run postinstall.`);
} else {
  for (const { src, dest } of configFiles) {
    const srcPath = resolve(srcDir, src);
    const destPath = resolve(projectRoot, dest);
    if (!existsSync(srcPath)) {
      console.error(`${PREFIX} Missing source: ${srcPath}`);
      process.exit(1);
    }
    copyFileSync(srcPath, destPath);
    console.log(`${PREFIX} Copied ${src} -> ${dest}`);
  }
}

// --- Pipeline files: per-file copy/warn/diff ---

const pipelineFiles = [
  { src: "release.yml", dest: ".github/workflows/release.yml" },
  { src: "changeset-config.json", dest: ".changeset/config.json" },
  { src: "auto-changeset.sh", dest: "scripts/auto-changeset.sh" },
  {
    src: "verify-npm-token.yml",
    dest: ".github/workflows/verify-npm-token.yml",
  },
];

for (const { src, dest } of pipelineFiles) {
  const srcPath = resolve(pipelineDir, src);
  const destPath = resolve(projectRoot, dest);

  const canonical = readFileSync(srcPath, "utf8");

  if (!existsSync(destPath)) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, canonical);
    console.log(`${PREFIX} Copied ${src} -> ${dest}`);
    continue;
  }

  const existing = readFileSync(destPath, "utf8");
  if (existing === canonical) continue;

  console.warn(
    `${PREFIX} WARNING: ${dest} differs from canonical version — skipping. Review the diff:`,
  );
  const tmpPath = join(tmpdir(), `tbc-canonical-${src}`);
  writeFileSync(tmpPath, canonical);
  try {
    execSync(`diff "${tmpPath}" "${destPath}"`, { stdio: "inherit" });
  } catch {
    // diff exits 1 when files differ — output already printed via stdio: inherit
  }
}

// --- Asset files: seeded into docs/assets/, same per-file copy/warn as pipeline ---

const assetDir = new URL("../assets/image", import.meta.url).pathname;

const assetFiles = [
  { src: "doikayt-logo.png", dest: "docs/assets/doikayt-logo.png" },
  { src: "doikayt-logo.svg", dest: "docs/assets/doikayt-logo.svg" },
];

for (const { src, dest } of assetFiles) {
  const srcPath = resolve(assetDir, src);
  const destPath = resolve(projectRoot, dest);

  if (!existsSync(destPath)) {
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(srcPath, destPath);
    console.log(`${PREFIX} Copied ${src} -> ${dest}`);
    continue;
  }

  const canonical = readFileSync(srcPath);
  const existing = readFileSync(destPath);
  if (canonical.equals(existing)) continue;

  console.warn(
    `${PREFIX} WARNING: ${dest} differs from canonical version — skipping. ` +
      `To resync: cp node_modules/@doikayt/typescript-build-config/assets/image/${src} ${dest}`,
  );
}

// --- Convention checks: ci + update-all-format ---

const missingTargets = [];

// ci: package.json scripts only — NX projects must expose it as a thin shim
// there, since the release workflow calls `npm run ci`, never NX directly.
if (!projectPkg.scripts?.["ci"]) {
  missingTargets.push({
    name: "ci",
    hint: '  "ci": "prettier --check src/ && npm test"',
    nxNote: false,
  });
}

// update-all-format: package.json script OR NX project.json target.
let hasUpdateAllFormat = !!projectPkg.scripts?.["update-all-format"];

if (!hasUpdateAllFormat) {
  const projectJsonPath = resolve(projectRoot, "project.json");
  if (existsSync(projectJsonPath)) {
    try {
      const projectJson = JSON.parse(readFileSync(projectJsonPath, "utf8"));
      if (projectJson.targets?.["update-all-format"]) hasUpdateAllFormat = true;
    } catch {
      // malformed project.json — treat as absent
    }
  }
}

if (!hasUpdateAllFormat) {
  missingTargets.push({
    name: "update-all-format",
    hint: '  "update-all-format": "prettier --write src/"',
    nxNote: true,
  });
}

for (const { name, hint, nxNote } of missingTargets) {
  console.warn(`${PREFIX} Missing target: ${name}`);
  console.warn(`Add to package.json scripts:`);
  console.warn(hint);
  if (nxNote) console.warn(`Or add an NX target with the same name.`);
}

console.log(`${PREFIX} Postinstall complete.`);
