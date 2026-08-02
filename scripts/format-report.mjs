#!/usr/bin/env node
/**
 * Formats every fixture in `cyphers/` and prints a markdown report.
 *
 * The pull request workflow posts this as a comment so a reviewer can see what
 * a change does to real queries without checking anything out. Run it locally
 * with `npm run build && npm run format-report`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { default: beautifyCypher } = await import(
  pathToFileURL(join(process.cwd(), "dist", "index.js")).href
);

const dir = "cyphers";
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".cypher"))
  .sort();

const lines = [];
let unstable = 0;
let changed = 0;

for (const file of files) {
  const source = readFileSync(join(dir, file), "utf8").trim();
  const formatted = beautifyCypher(source);

  // Formatting an already formatted query must be a no-op.
  const stable = beautifyCypher(formatted) === formatted;
  if (!stable) {
    unstable++;
  }
  const isChanged = formatted !== source;
  if (isChanged) {
    changed++;
  }

  lines.push(`<details${isChanged ? " open" : ""}>`);
  lines.push(
    `<summary><code>${file}</code>${stable ? "" : " — ⚠️ not idempotent"}${
      isChanged ? "" : " — unchanged"
    }</summary>`,
  );
  lines.push("");
  lines.push("**Input**");
  lines.push("");
  lines.push("```cypher");
  lines.push(source);
  lines.push("```");
  lines.push("");
  lines.push("**Formatted**");
  lines.push("");
  lines.push("```cypher");
  lines.push(formatted);
  lines.push("```");
  lines.push("");
  lines.push("</details>");
  lines.push("");
}

const summary =
  `Formatted ${files.length} fixture${files.length === 1 ? "" : "s"}: ` +
  `${changed} reformatted, ${files.length - changed} already canonical` +
  (unstable > 0 ? `, **${unstable} not idempotent**` : "");

console.log(summary);
console.log("");
console.log(lines.join("\n"));

if (unstable > 0) {
  process.exitCode = 1;
}
