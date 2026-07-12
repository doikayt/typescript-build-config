import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const PREFIX = '[@datalackey/typescript-build-config]';

console.log(`${PREFIX} Running postinstall...`);

const projectRoot = process.env.INIT_CWD ?? process.cwd();
const srcDir = new URL('top-level', import.meta.url).pathname;
const pipelineDir = new URL('pipeline', import.meta.url).pathname;

// --- Top-level config files: all-or-nothing ---

const configFiles = [
  { src: 'gitignore',           dest: '.gitignore' },
  { src: 'tsconfig.json',        dest: 'tsconfig.json' },
  { src: 'tsconfig.test.json',   dest: 'tsconfig.test.json' },
  { src: 'tsconfig.eslint.json', dest: 'tsconfig.eslint.json' },
  { src: 'eslint.config.js',     dest: 'eslint.config.js' },
  { src: 'prettier.config.js',   dest: 'prettier.config.js' },
];

const alreadyExist = configFiles
  .map(({ dest }) => resolve(projectRoot, dest))
  .filter(destPath => existsSync(destPath));

if (alreadyExist.length > 0) {
  console.log(`${PREFIX} Skipping config files — the following already exist:`);
  for (const destPath of alreadyExist) console.log('  ' + destPath);
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

const projectPkg = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const projectName = projectPkg.name;

const pipelineFiles = [
  { src: 'release.yml',           dest: '.github/workflows/release.yml' },
  { src: 'changeset-config.json', dest: '.changeset/config.json' },
  { src: 'auto-changeset.sh',     dest: 'scripts/auto-changeset.sh' },
];

for (const { src, dest } of pipelineFiles) {
  const srcPath = resolve(pipelineDir, src);
  const destPath = resolve(projectRoot, dest);

  let canonical = readFileSync(srcPath, 'utf8');

  if (src === 'auto-changeset.sh') {
    canonical = canonical.replace('PACKAGES=("__PACKAGE_NAME__")', `PACKAGES=("${projectName}")`);
  }

  if (!existsSync(destPath)) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, canonical);
    console.log(`${PREFIX} Copied ${src} -> ${dest}`);
    continue;
  }

  const existing = readFileSync(destPath, 'utf8');
  if (existing === canonical) continue;

  console.warn(`${PREFIX} WARNING: ${dest} differs from canonical version — skipping. Review the diff:`);
  const tmpPath = join(tmpdir(), `tbc-canonical-${src}`);
  writeFileSync(tmpPath, canonical);
  try {
    execSync(`diff "${tmpPath}" "${destPath}"`, { stdio: 'inherit' });
  } catch {
    // diff exits 1 when files differ — output already printed via stdio: inherit
  }
}

console.log(`${PREFIX} Postinstall complete.`);
