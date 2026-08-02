#!/usr/bin/env node
/**
 * Folds the demo build into a single self-contained index.html.
 *
 * The point is a preview a reviewer can download from a pull request and open
 * with a double click: no web server, no CDN, no module loading. Anything that
 * would need the network at runtime is inlined or dropped.
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = "build-preview";
const htmlPath = join(dir, "index.html");

if (!existsSync(htmlPath)) {
  console.error(`${htmlPath} not found — run the vite preview build first.`);
  process.exit(1);
}

let html = readFileSync(htmlPath, "utf8");

const js = existsSync(join(dir, "app.js"))
  ? readFileSync(join(dir, "app.js"), "utf8")
  : "";
const css = existsSync(join(dir, "app.css"))
  ? readFileSync(join(dir, "app.css"), "utf8")
  : "";

// Drop the external stylesheet and analytics; neither can load from file://.
html = html.replace(/<link[^>]+href="https?:\/\/[^"]*"[^>]*>/g, "");
html = html.replace(/<script[^>]+src="https?:\/\/[^"]*"[^>]*><\/script>/g, "");

// Replace the emitted asset tags with their inlined contents.
html = html.replace(/<link[^>]+href="[^"]*app\.css"[^>]*>/g, "");
html = html.replace(/<script[^>]*src="[^"]*app\.js"[^>]*><\/script>/g, "");

const escape = (code) => code.replace(/<\/script>/gi, "<\\/script>");

// Minimal styling so the page is readable without the Bulma CDN.
const fallbackCss = `
  body { margin: 0; font-family: system-ui, sans-serif; }
  #app { max-width: 1100px; margin: 0 auto; padding: 2rem; }
  h1 { font-size: 2rem; }
  textarea { width: 100%; box-sizing: border-box; padding: .75rem; border-radius: 6px;
    border: 1px solid #8884; background: #0000000d; color: inherit; }
  .block { margin-bottom: 1.25rem; }
  label { display: block; font-weight: 600; margin-bottom: .35rem; }
  .options label { display: inline-flex; align-items: center; gap: .5rem; font-weight: 500; }
  .options input[type="number"], .options select { padding: .3rem; }
  .preview-banner { background: #ffd86b; color: #222; padding: .6rem 1rem;
    font: 600 14px/1.4 system-ui, sans-serif; text-align: center; }
`;

html = html.replace("</head>", `<style>${fallbackCss}\n${css}</style></head>`);
html = html.replace("</body>", `<script>${escape(js)}</script></body>`);

const label = process.env.PREVIEW_LABEL;
if (label) {
  html = html.replace(
    /<body[^>]*>/,
    (tag) => `${tag}<div class="preview-banner">${label}</div>`,
  );
}

writeFileSync(htmlPath, html);

for (const leftover of ["app.js", "app.css"]) {
  rmSync(join(dir, leftover), { force: true });
}

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`Wrote self-contained ${htmlPath} (${kb} kB)`);
