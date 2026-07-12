import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Each consumer-installed template under src/pipeline/ has a live twin in this repo (this repo
// runs the same pipeline it distributes — see CONTRIBUTING.md, "Adding New Pipeline
// Files"). These tests fail on drift between a template and its twin.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const pairs = [
  { template: 'src/pipeline/release.yml', live: '.github/workflows/release.yml' },
  {
    template: 'src/pipeline/verify-npm-token.yml',
    live: '.github/workflows/verify-npm-token.yml',
  },
  { template: 'src/pipeline/changeset-config.json', live: '.changeset/config.json' },
  {
    template: 'src/pipeline/auto-changeset.sh',
    live: 'scripts/auto-changeset.sh',
    // The live copy differs only by the postinstall package-name substitution.
    substitute: (s) =>
      s.replace(
        'PACKAGES=("__PACKAGE_NAME__")',
        'PACKAGES=("@datalackey/typescript-build-config")'
      ),
  },
];

for (const { template, live, substitute } of pairs) {
  test(`${live} matches its template ${template}`, () => {
    let expected = readFileSync(join(repoRoot, template), 'utf8');
    if (substitute) expected = substitute(expected);
    const actual = readFileSync(join(repoRoot, live), 'utf8');
    assert.equal(actual, expected);
  });
}
