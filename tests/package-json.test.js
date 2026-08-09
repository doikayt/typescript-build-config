import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeAbsent,
  detectIndent,
  applyToPackageJson,
} from "../src/package-json.js";

test("mergeAbsent adds absent keys and skips present ones", () => {
  const { merged, added, skipped } = mergeAbsent({ a: 1 }, { b: 2, a: 9 });
  assert.deepEqual(merged, { a: 1, b: 2 });
  assert.deepEqual(added, ["b"]);
  assert.deepEqual(skipped, ["a"]);
});

test("mergeAbsent tolerates undefined existing", () => {
  const { merged, added } = mergeAbsent(undefined, { a: 1 });
  assert.deepEqual(merged, { a: 1 });
  assert.deepEqual(added, ["a"]);
});

test("detectIndent reads two-space, tab, and defaults", () => {
  assert.equal(detectIndent('{\n  "a": 1\n}'), "  ");
  assert.equal(detectIndent('{\n\t"a": 1\n}'), "\t");
  assert.equal(detectIndent("{}"), "  ");
});

test("applyToPackageJson adds absent scripts and never clobbers existing", () => {
  const raw =
    JSON.stringify({ name: "x", scripts: { test: "vitest run" } }, null, 2) +
    "\n";
  const { text, added, skipped } = applyToPackageJson(raw, {
    scripts: { ci: "npm test", test: "OVERRIDE" },
  });
  const pkg = JSON.parse(text);
  assert.equal(pkg.scripts.ci, "npm test");
  assert.equal(pkg.scripts.test, "vitest run");
  assert.deepEqual(added.scripts, ["ci"]);
  assert.deepEqual(skipped.scripts, ["test"]);
});

test("applyToPackageJson creates devDependencies when absent", () => {
  const raw = JSON.stringify({ name: "x" }, null, 2) + "\n";
  const { text, added } = applyToPackageJson(raw, {
    devDependencies: { vitest: "^2.0.0" },
  });
  const pkg = JSON.parse(text);
  assert.equal(pkg.devDependencies.vitest, "^2.0.0");
  assert.deepEqual(added.devDependencies, ["vitest"]);
});

test("applyToPackageJson preserves tab indentation", () => {
  const raw = '{\n\t"name": "x"\n}\n';
  const { text } = applyToPackageJson(raw, { scripts: { ci: "npm test" } });
  assert.ok(text.includes('\t"scripts"'), "expected tab-indented scripts key");
});

test("applyToPackageJson preserves presence of a trailing newline", () => {
  const withNl = JSON.stringify({ name: "x" }, null, 2) + "\n";
  assert.ok(
    applyToPackageJson(withNl, { scripts: { ci: "x" } }).text.endsWith("}\n"),
  );

  const withoutNl = JSON.stringify({ name: "x" }, null, 2);
  const out = applyToPackageJson(withoutNl, { scripts: { ci: "x" } }).text;
  assert.ok(out.endsWith("}"));
  assert.ok(!out.endsWith("\n"));
});
