import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

const demoDir = fileURLToPath(
  new URL("../src/templates/demo/", import.meta.url),
);
const at = (rel) => new URL(rel, `file://${demoDir}`);
const read = (rel) => readFileSync(at(rel), "utf8");

test("demo template ships the minimal source tree", () => {
  for (const rel of [
    "README.md",
    "project.json",
    "src/index.ts",
    "src/math-engine/MathEngine.ts",
    "src/math-engine/_COMPONENT_INFO.md",
    "src/math-engine/MathEngine.test.ts",
  ]) {
    assert.ok(existsSync(at(rel)), `missing ${rel}`);
  }
});

test("demo template carries no package.json or tooling configs", () => {
  // These belong to the consumer (init/postinstall set them up); shipping them
  // in the demo would duplicate and distract.
  for (const rel of [
    "package.json",
    "tsconfig.json",
    "eslint.config.js",
    "prettier.config.js",
    "vitest.config.ts",
  ]) {
    assert.ok(!existsSync(at(rel)), `should not ship ${rel}`);
  }
});

test("demo README exposes every autogen marker", () => {
  const readme = read("README.md");
  for (const name of [
    "TOC",
    "NX_GRAPH",
    "UML:components",
    "UML:components-table",
    "UML:component-details",
  ]) {
    assert.match(readme, new RegExp(`<!-- ${name}:START -->`), `no ${name}`);
    assert.match(readme, new RegExp(`<!-- ${name}:END -->`), `no ${name} end`);
  }
});

test("demo is one component: math-engine only, no cli folder", () => {
  assert.ok(existsSync(at("src/math-engine/")));
  assert.ok(!existsSync(at("src/cli/")));
});
