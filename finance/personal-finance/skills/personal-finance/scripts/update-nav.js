#!/usr/bin/env bun
// @ts-nocheck
/**
 * update-nav.js: refresh latest NAV and P&L columns on a holdings CSV.
 *
 * Reads the holdings file, fetches each scheme's latest NAV from
 * https://api.mfapi.in/mf/{scheme_code}/latest, writes the CSV back, prints
 * a JSON summary to stdout, and writes a markdown statement.
 *
 * Usage:
 *   bun update-nav.js [--csv <path>] [--statement <path>]
 *
 * Defaults:
 *   --csv        memory/holdings/mutual-funds.csv
 *   --statement  memory/statements/mf-YYYY-MM-DD.md  (today, local date)
 *
 * No auth. Calls go through curl so OneCLI's HTTPS_PROXY applies.
 */
import { spawnSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname } from "path";

const COLUMNS = [
  "scheme_code",
  "scheme_name",
  "units",
  "avg_cost_nav",
  "invested_amount",
  "latest_nav",
  "nav_date",
  "current_value",
  "gain_loss",
  "gain_loss_pct",
];
const REQUIRED = ["scheme_code", "units"];
const SCRIPT_OWNED = ["latest_nav", "nav_date", "current_value", "gain_loss", "gain_loss_pct"];

function parseArgs(argv) {
  const out = { csv: "memory/holdings/mutual-funds.csv", statement: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--csv") out.csv = argv[++i];
    else if (a === "--statement") out.statement = argv[++i];
    else if (a === "-h" || a === "--help") {
      console.error("usage: bun update-nav.js [--csv <path>] [--statement <path>]");
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(1);
    }
  }
  if (!out.statement) {
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.statement = `memory/statements/mf-${iso}.md`;
  }
  return out;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, records) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const rec of records) {
    lines.push(headers.map((h) => csvEscape(rec[h] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}

function num(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function pct(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function indianInr(n) {
  const sign = n < 0 ? "-" : "";
  const [whole, frac] = Math.abs(n).toFixed(2).split(".");
  let grouped;
  if (whole.length <= 3) grouped = whole;
  else {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${rest},${last3}`;
  }
  return `${sign}₹${grouped}.${frac}`;
}

function signedInr(n) {
  const body = indianInr(Math.abs(n));
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
}

function signedPct(n) {
  const body = `${pct(Math.abs(n))}%`;
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
}

function curlJson(url) {
  const r = spawnSync("curl", ["-sS", "-L", "--max-time", "20", url], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "curl failed").trim().slice(0, 300));
  }
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error(`non-JSON from ${url}: ${(r.stdout || "").slice(0, 200)}`);
  }
}

function fetchLatest(schemeCode) {
  const body = curlJson(`https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}/latest`);
  if (!Array.isArray(body.data) || !body.data[0]) {
    throw new Error(body.status && body.status !== "SUCCESS" ? `status ${body.status}` : "no NAV data");
  }
  if (body.status && body.status !== "SUCCESS") {
    throw new Error(`status ${body.status}`);
  }
  const nav = num(body.data[0].nav);
  if (nav == null) throw new Error("NAV missing");
  return {
    scheme_name: body.meta?.scheme_name || "",
    latest_nav: String(body.data[0].nav),
    nav_date: body.data[0].date || "",
    nav,
  };
}

function renderStatement(asOf, funds, totals) {
  const failed = funds.filter((f) => f.error);
  const lines = [
    `# Mutual fund statement`,
    ``,
    `As of: ${asOf}`,
    `Funds: ${funds.length} · Fetched: ${funds.length - failed.length} · Failed: ${failed.length}`,
    ``,
    `## Totals`,
    ``,
    `| Invested | Current value | Gain/loss | % |`,
    `|---|---|---|---|`,
    `| ${indianInr(totals.invested)} | ${indianInr(totals.current)} | ${signedInr(totals.gain)} | ${signedPct(totals.pct)} |`,
    ``,
    `## Holdings`,
    ``,
    `| Scheme | Units | Avg cost | Latest NAV | NAV date | Current value | Gain/loss | % |`,
    `|---|---:|---:|---:|---|---:|---:|---:|`,
  ];
  for (const f of funds) {
    if (f.error) {
      lines.push(`| ${f.scheme_name || f.scheme_code} | ${f.units ?? ""} | ${f.avg_cost_nav ?? ""} | — | — | — | — | — |`);
      continue;
    }
    lines.push(
      `| ${f.scheme_name} | ${f.units} | ${indianInr(f.avg_cost_nav)} | ${f.latest_nav} | ${f.nav_date} | ${indianInr(f.current_value)} | ${signedInr(f.gain_loss)} | ${signedPct(f.gain_loss_pct)} |`,
    );
  }
  if (failed.length) {
    lines.push(``, `## Failed fetches`, ``);
    for (const f of failed) {
      lines.push(`- ${f.scheme_name || f.scheme_code} (\`${f.scheme_code}\`): ${f.error}. Previous NAV kept.`);
    }
  }
  lines.push(``);
  return lines.join("\n");
}

const args = parseArgs(process.argv.slice(2));
if (!existsSync(args.csv)) {
  console.error(`holdings file not found: ${args.csv}`);
  console.error("Copy skills/personal-finance/samples/mutual-funds.sample.csv to memory/holdings/mutual-funds.csv, or follow onboarding.");
  process.exit(1);
}

const raw = parseCsv(readFileSync(args.csv, "utf8"));
if (raw.length < 2) {
  console.error(`${args.csv} has no data rows`);
  process.exit(1);
}

const headers = raw[0].map((h) => h.trim());
for (const col of REQUIRED) {
  if (!headers.includes(col)) {
    console.error(`${args.csv} is missing required column "${col}"`);
    process.exit(1);
  }
}
const outHeaders = [...headers];
for (const col of COLUMNS) {
  if (!outHeaders.includes(col)) outHeaders.push(col);
}

const records = raw.slice(1).map((cells) => {
  const rec = {};
  for (let i = 0; i < headers.length; i++) rec[headers[i]] = cells[i] ?? "";
  return rec;
});

const funds = [];
let investedTotal = 0;
let currentTotal = 0;

for (const rec of records) {
  const schemeCode = String(rec.scheme_code || "").trim();
  const units = num(rec.units);
  const avgCost = num(rec.avg_cost_nav);
  let invested = num(rec.invested_amount);
  if (invested == null && units != null && avgCost != null) invested = units * avgCost;

  const fund = {
    scheme_code: schemeCode,
    scheme_name: String(rec.scheme_name || "").trim(),
    units,
    avg_cost_nav: avgCost,
    invested_amount: invested,
  };

  if (!schemeCode) {
    fund.error = "missing scheme_code";
  } else if (units == null) {
    fund.error = "missing units";
  } else if (invested == null) {
    fund.error = "missing avg_cost_nav and invested_amount";
  } else {
    try {
      const latest = fetchLatest(schemeCode);
      const current = units * latest.nav;
      const gain = current - invested;
      const gainPct = invested === 0 ? 0 : (gain / invested) * 100;
      rec.scheme_name = latest.scheme_name || rec.scheme_name;
      rec.invested_amount = money(invested);
      rec.latest_nav = latest.latest_nav;
      rec.nav_date = latest.nav_date;
      rec.current_value = money(current);
      rec.gain_loss = money(gain);
      rec.gain_loss_pct = pct(gainPct);
      Object.assign(fund, {
        scheme_name: rec.scheme_name,
        latest_nav: latest.latest_nav,
        nav_date: latest.nav_date,
        current_value: current,
        gain_loss: gain,
        gain_loss_pct: gainPct,
      });
      investedTotal += invested;
      currentTotal += current;
    } catch (err) {
      fund.error = err.message;
    }
  }

  if (fund.error) {
    for (const col of SCRIPT_OWNED) {
      if (rec[col] == null) rec[col] = "";
    }
  }
  funds.push(fund);
}

mkdirSync(dirname(args.csv), { recursive: true });
writeFileSync(args.csv, toCsv(outHeaders, records));

const gainTotal = currentTotal - investedTotal;
const pctTotal = investedTotal === 0 ? 0 : (gainTotal / investedTotal) * 100;
const asOf = funds.find((f) => f.nav_date)?.nav_date || "unknown";
const statement = renderStatement(asOf, funds, {
  invested: investedTotal,
  current: currentTotal,
  gain: gainTotal,
  pct: pctTotal,
});
mkdirSync(dirname(args.statement), { recursive: true });
writeFileSync(args.statement, statement);

const summary = {
  csv: args.csv,
  statement: args.statement,
  as_of: asOf,
  funds: funds.length,
  fetched: funds.filter((f) => !f.error).length,
  failed: funds.filter((f) => f.error).length,
  totals: {
    invested: Number(money(investedTotal)),
    current_value: Number(money(currentTotal)),
    gain_loss: Number(money(gainTotal)),
    gain_loss_pct: Number(pct(pctTotal)),
  },
  errors: funds.filter((f) => f.error).map((f) => ({ scheme_code: f.scheme_code, error: f.error })),
};
console.log(JSON.stringify(summary, null, 2));
