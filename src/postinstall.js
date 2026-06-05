// src/postinstall.js
// Run from: project root (where package.json lives)
import { existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

console.log('[@datalackey/typescript-build-config] Running postinstall...');

const projectRoot = process.env.INIT_CWD ?? process.cwd();
const srcDir = new URL('top-level', import.meta.url).pathname;

const files = [
  { src: 'gitignore',           dest: '.gitignore' },
  { src: 'tsconfig.json',        dest: 'tsconfig.json' },
  { src: 'tsconfig.test.json',   dest: 'tsconfig.test.json' },
  { src: 'tsconfig.eslint.json', dest: 'tsconfig.eslint.json' },
  { src: 'eslint.config.js',     dest: 'eslint.config.js' },
  { src: 'prettier.config.js',   dest: 'prettier.config.js' },
];

const alreadyExist = files
  .map(function({ dest: dest }) { return resolve(projectRoot, dest); })
  .filter(function(destPath) { return existsSync(destPath); });

if (alreadyExist.length > 0) {
  console.log('[@datalackey/typescript-build-config] Skipping — the following files already exist:');
  for (const destPath of alreadyExist) {
    console.log('  ' + destPath);
  }
  console.log('[@datalackey/typescript-build-config] Delete them manually to re-run postinstall.');
  process.exit(0);
}

for (const { src: src, dest: dest } of files) {
  const srcPath = resolve(srcDir, src);
  const destPath = resolve(projectRoot, dest);

  if (!existsSync(srcPath)) {
    console.error('[@datalackey/typescript-build-config] Missing source: ' + srcPath);
    process.exit(1);
  }

  copyFileSync(srcPath, destPath);
  console.log('[@datalackey/typescript-build-config] Copied ' + src + ' -> ' + dest);
}

console.log('[@datalackey/typescript-build-config] Postinstall complete.');
