#!/usr/bin/env node
// Parses aliases.sh's own doc comments to print a grouped summary table.
// Convention this relies on:
//   - a group header is a single comment line like "# --- Group Name ---"
//   - each alias/function's doc comment sits directly above its definition,
//     with no blank line in between (a blank line ends the comment block)
//   - a pure border line ("# ---...---" or "# ===...===", no other text)
//     inside a doc comment is decorative and skipped, not real text
// Summary extraction: join the comment's text across lines, strip a leading
// "name (...): " / "name <args> : " prefix if present, then take up to and
// including the first "." — or, if no "." appears anywhere, just the first
// comment line.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALIASES_PATH = join(__dirname, "aliases.sh");

const DEF_RE = /^([A-Za-z_][A-Za-z0-9_-]*)\(\)\s*\{/;
const ALIAS_RE = /^alias\s+([A-Za-z_][A-Za-z0-9_-]*)=/;
const GROUP_RE = /^#\s*-{2,}\s+(\S.*\S)\s+-{2,}\s*$/;
const BORDER_RE = /^#\s*[-=]+\s*$/;

function extractSummary(name, commentLines) {
  const text = commentLines
    .map((l) => l.replace(/^#\s?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  let body = text;
  const colonIdx = text.indexOf(":");
  if (colonIdx !== -1) {
    const head = text.slice(0, colonIdx).trim();
    if (head.toLowerCase().startsWith(name.toLowerCase())) {
      body = text.slice(colonIdx + 1).trim();
    }
  }

  const periodIdx = body.indexOf(".");
  if (periodIdx !== -1) {
    return body.slice(0, periodIdx + 1).trim();
  }
  return commentLines[0].replace(/^#\s?/, "").trim();
}

export function parseAliases(source) {
  const lines = source.split("\n");
  const groups = new Map();
  let currentGroup = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const groupMatch = line.match(GROUP_RE);
    if (groupMatch) {
      currentGroup = groupMatch[1];
      continue;
    }

    const defMatch = line.match(DEF_RE) || line.match(ALIAS_RE);
    if (!defMatch) continue;
    const name = defMatch[1];

    const commentLines = [];
    let j = i - 1;
    while (j >= 0) {
      const prev = lines[j];
      if (BORDER_RE.test(prev)) {
        j--;
        continue;
      }
      if (/^#/.test(prev)) {
        commentLines.unshift(prev);
        j--;
        continue;
      }
      break;
    }
    if (commentLines.length === 0) continue;

    const summary = extractSummary(name, commentLines);
    const group = currentGroup ?? "Other";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ name, summary });
  }

  return groups;
}

function main() {
  const source = readFileSync(ALIASES_PATH, "utf8");
  const groups = parseAliases(source);

  const allEntries = [...groups.values()].flat();
  const nameWidth = Math.max(...allEntries.map((e) => e.name.length));

  for (const [group, entries] of groups) {
    console.log(`\n${group}`);
    console.log("-".repeat(group.length));
    for (const { name, summary } of entries) {
      console.log(`  ${name.padEnd(nameWidth)}  ${summary}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
