import { execFileSync } from "child_process";

export function toCaretRange(version) {
  return `^${version}`;
}

// Default view: ask npm for a package's latest published version. Injectable so
// resolveVersions stays unit-testable without shelling out.
export function npmView(name) {
  return execFileSync("npm", ["view", name, "version"], {
    encoding: "utf8",
  }).trim();
}

// Resolve each package name to a caret range on its latest version. If the
// lookup fails (offline) or returns nothing, fall back to "latest" so the
// declared devDependency is still installable once the user runs `npm install`.
export function resolveVersions(names, view = npmView) {
  const out = {};
  for (const name of names) {
    try {
      const version = view(name);
      out[name] = version ? toCaretRange(version) : "latest";
    } catch {
      out[name] = "latest";
    }
  }
  return out;
}
