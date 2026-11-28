#!/usr/bin/env node
/**
 * Keeps new UI on the design system (DESIGN.md). Flags raw values in class names that have
 * a token: hex colors, pixel font sizes, pixel corner radii, hand-written easing curves.
 * Known exceptions (Google's button colors, poster-size display type) live in
 * scripts/design-allowlist.json; run with --update to accept the current state.
 *
 *   npm run lint:design            fail on anything new
 *   npm run lint:design -- --update  record the current exceptions
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const ALLOW = join(ROOT, "scripts/design-allowlist.json");
const SKIP = [/^site\//, /share-cards/, /\.d\.ts$/];

const RULES = [
  { name: "hex color in a class (use text-tungsten, bg-gel-blue...)", re: /\b[a-z-]+-\[#[0-9a-fA-F]{3,8}\]/g },
  { name: "pixel font size (use text-footnote, text-title2...)", re: /\btext-\[\d+(?:\.\d+)?px\]/g },
  { name: "pixel radius (use rounded-card, rounded-sheet...)", re: /\brounded(?:-[a-z]{1,2})?-\[\d+px\]/g },
  { name: "hand-written easing (use ease-standard, ease-spring...)", re: /ease-\[cubic-bezier[^\]]*\]/g },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|ts)$/.test(name)) yield p;
  }
}

/**
 * Rules about meaning, not values. The gel rim is for two peak moments only (Connect and a new
 * connection), and Tungsten is for Create, "playing now" and an opening meant for you. Only the
 * files listed may use them; add a file here on purpose, with a reason, not to quiet the check.
 */
const GEL_RIM_OK = [/^components\/ui\.tsx$/, /^app\/\(app\)\/discover\/today\//, /^app\/\(app\)\/connected\//, /^components\/connect-sheet\.tsx$/, /^app\/design\//];
const TOGGLE_OK = [/^components\/ui\.tsx$/];
const MEANING = [
  { name: "gel rim outside Connect / a new connection (use a plain Button)", re: /\bgel-rim\b|variant="gel"/g, ok: GEL_RIM_OK },
  { name: "hand-built switch (use Toggle from components/ui)", re: /role="switch"/g, ok: TOGGLE_OK },
  { name: "faint placeholder (use the `field` class; it sets a readable one)", re: /placeholder:text-smoke\/(?:[1-7]\d)\b/g, ok: [] },
];

const found = {};
for (const f of files(SRC)) {
  const rel = relative(SRC, f);
  if (SKIP.some((r) => r.test(rel))) continue;
  const text = readFileSync(f, "utf8");
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const key = `${rel} ${m[0]}`;
      found[key] = { rule: rule.name, count: (found[key]?.count ?? 0) + 1 };
    }
  }
  for (const rule of MEANING) {
    if (rule.ok.some((r) => r.test(rel))) continue;
    for (const m of text.matchAll(rule.re)) {
      const key = `${rel} ${m[0]}`;
      found[key] = { rule: rule.name, count: (found[key]?.count ?? 0) + 1 };
    }
  }
}

if (process.argv.includes("--update")) {
  const allow = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.count]));
  writeFileSync(ALLOW, JSON.stringify(allow, null, 2) + "\n");
  console.log(`Recorded ${Object.keys(allow).length} exceptions in scripts/design-allowlist.json`);
  process.exit(0);
}

let allow = {};
try {
  allow = JSON.parse(readFileSync(ALLOW, "utf8"));
} catch {}
const problems = Object.entries(found).filter(([k, v]) => v.count > (allow[k] ?? 0));
if (!problems.length) {
  console.log("Design tokens: all clear.");
  process.exit(0);
}
console.log("Raw values where a design token exists (see DESIGN.md):\n");
for (const [k, v] of problems) console.log(`  ${k}   ${v.rule}`);
process.exit(1);
