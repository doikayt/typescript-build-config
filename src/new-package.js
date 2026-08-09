import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";
import { scopeName } from "./scope-name.js";

// Default `npm init -y` runner. Injectable so runNew is testable without npm.
function npmInitY(cwd) {
  const res = spawnSync("npm", ["init", "-y"], { cwd, stdio: "inherit" });
  if (res.error) throw res.error;
  if (res.status !== 0)
    throw new Error(`npm init -y exited with ${res.status}`);
}

// Run `npm init -y`, then scope the generated package name to @doikayt unless it
// is already scoped (any @scope/ is left alone). Writes package.json back and
// returns the final name plus whether it changed.
export function runNew({
  cwd = process.cwd(),
  npmInit = npmInitY,
  log = console.log,
} = {}) {
  npmInit(cwd);

  const pkgPath = resolve(cwd, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const before = pkg.name || "package";
  const scoped = scopeName(before);

  if (scoped !== pkg.name) {
    pkg.name = scoped;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    log(`Scoped package name: ${before} → ${scoped}`);
  } else {
    log(`Package name already scoped: ${scoped}`);
  }

  return { name: scoped, changed: scoped !== before };
}
