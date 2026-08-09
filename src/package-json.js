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

/**
 * Merge scripts / devDependencies into package.json text, adding only absent
 * keys and preserving the file's indentation and trailing-newline style. Does
 * not touch disk — returns the new text plus a report of what changed.
 *
 * @param {string} rawText - current package.json contents
 * @param {{
 *   scripts?: Record<string,string>,
 *   devDependencies?: Record<string,string>,
 *   fields?: Record<string,unknown>
 * }} additions - `fields` are top-level keys (main, type, files, …)
 * @returns {{
 *   text: string,
 *   added: { scripts: string[], devDependencies: string[], fields: string[] },
 *   skipped: { scripts: string[], devDependencies: string[], fields: string[] }
 * }} new file text, plus keys added vs. skipped (already present)
 *
 * `replaceDefaults` names placeholder values that `npm init -y` inserts (e.g.
 * `scripts.test: 'echo "Error: no test specified" && exit 1'`, `main: "index.js"`).
 * A key whose current value exactly equals its placeholder is treated as unset,
 * so a canonical value can replace it instead of being skipped as "present".
 */
export function applyToPackageJson(
  rawText,
  {
    scripts = {},
    devDependencies = {},
    fields = {},
    replaceDefaults = {},
  } = {},
) {
  const pkg = JSON.parse(rawText);
  const indent = detectIndent(rawText);

  const stripDefaults = (obj, defaults = {}) => {
    if (!obj) return;
    for (const [key, placeholder] of Object.entries(defaults)) {
      if (obj[key] === placeholder) delete obj[key];
    }
  };
  stripDefaults(pkg, replaceDefaults.fields);
  stripDefaults(pkg.scripts, replaceDefaults.scripts);

  const s = mergeAbsent(pkg.scripts, scripts);
  const d = mergeAbsent(pkg.devDependencies, devDependencies);
  const f = mergeAbsent(pkg, fields);

  const next = { ...f.merged };
  if (Object.keys(s.merged).length) next.scripts = s.merged;
  if (Object.keys(d.merged).length) next.devDependencies = d.merged;

  const trailingNewline = rawText.endsWith("\n") ? "\n" : "";
  const text = JSON.stringify(next, null, indent) + trailingNewline;

  return {
    text,
    added: { scripts: s.added, devDependencies: d.added, fields: f.added },
    skipped: {
      scripts: s.skipped,
      devDependencies: d.skipped,
      fields: f.skipped,
    },
  };
}
