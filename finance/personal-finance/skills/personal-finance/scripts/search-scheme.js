#!/usr/bin/env bun
/**
 * search-scheme.js: resolve a mutual-fund name to AMFI scheme codes via mfapi.in.
 *
 * Usage:  bun search-scheme.js "<query>"
 *
 * Prints a JSON array of { schemeCode, schemeName }. No auth; curl so OneCLI's
 * HTTPS_PROXY applies.
 */
import { spawnSync } from "child_process";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error('usage: bun search-scheme.js "<fund name>"');
  process.exit(1);
}

const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`;
const r = spawnSync("curl", ["-sS", "-L", "--max-time", "20", url], {
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
});
if (r.status !== 0) {
  console.error((r.stderr || r.stdout || "curl failed").trim().slice(0, 300));
  process.exit(1);
}

let body;
try {
  body = JSON.parse(r.stdout);
} catch {
  console.error(`non-JSON from mfapi.in: ${(r.stdout || "").slice(0, 200)}`);
  process.exit(1);
}

if (!Array.isArray(body)) {
  console.error("unexpected response:", JSON.stringify(body).slice(0, 300));
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
if (body.length === 0) process.exit(2);
