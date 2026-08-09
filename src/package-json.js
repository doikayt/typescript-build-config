// Idempotent helpers for editing a consumer's package.json: add keys only when
// absent, never overwrite what the consumer already has, and preserve the
// file's original indentation and trailing-newline style.

export function mergeAbsent(existing = {}, additions = {}) {
  const merged = { ...existing };
  const added = [];
  const skipped = [];
  for (const [key, value] of Object.entries(additions)) {
    if (Object.prototype.hasOwnProperty.call(merged, key)) {
      skipped.push(key);
    } else {
      merged[key] = value;
      added.push(key);
    }
  }
  return { merged, added, skipped };
}

export function detectIndent(text) {
  const m = text.match(/\n([\t ]+)/);
  return m ? m[1] : "  ";
}

export function applyToPackageJson(
  rawText,
  { scripts = {}, devDependencies = {} } = {},
) {
  const pkg = JSON.parse(rawText);
  const indent = detectIndent(rawText);

  const s = mergeAbsent(pkg.scripts, scripts);
  const d = mergeAbsent(pkg.devDependencies, devDependencies);

  const next = { ...pkg };
  if (Object.keys(s.merged).length) next.scripts = s.merged;
  if (Object.keys(d.merged).length) next.devDependencies = d.merged;

  const trailingNewline = rawText.endsWith("\n") ? "\n" : "";
  const text = JSON.stringify(next, null, indent) + trailingNewline;

  return {
    text,
    added: { scripts: s.added, devDependencies: d.added },
    skipped: { scripts: s.skipped, devDependencies: d.skipped },
  };
}
