---
name: personal-finance
description: >
  Personal finance analyst for Indian mutual-fund holdings. Refreshes latest NAV from mfapi.in,
  updates the holdings CSV, and returns a gain/loss statement. Use for morning briefs, "how are
  my funds doing", adding or correcting a holding, looking up an AMFI scheme code, or any
  portfolio P&L question. Trigger even on implicit asks — "what's my MF statement", "update NAVs",
  "did this fund gain", "what's the code for UTI Nifty 50 Direct".
---

## Tools

No MCP servers and no API keys. Holdings are a local CSV. Latest NAVs come from the free
mfapi.in REST API. **Scripts own every number** — run them; do not re-compute NAV or P&L
yourself.

| Script | What it's for |
|--------|----------------|
| `scripts/update-nav.js` | Read holdings CSV, fetch latest NAV, write CSV + statement |
| `scripts/search-scheme.js` | Resolve a fund name to AMFI `scheme_code` |

Both run with `bun` inside the agent container. Calls go through `curl` so OneCLI's proxy
applies. Endpoint details: `references/mfapi.md`.

## The capabilities → references

Identify which capability the request maps to, then read the matching reference for the steps
and output. The body here is the routing; the references are the mechanics.

| Capability | What it's for | Reference |
|------------|---------------|-----------|
| **onboarding** | first run: find or create the holdings CSV, map scheme codes, confirm the morning brief | `references/onboarding.md` |
| **daily-mf-statement** | refresh NAVs and post today's gain/loss table; fires each weekday morning, also on ask | `references/daily-mf-statement.md` |
| **holdings-csv** | schema, path, what the script may overwrite | `references/holdings-csv.md` |

Scheme-code lookup is a step inside onboarding and holdings edits, not its own capability:
`bun /workspace/agent/skills/personal-finance/scripts/search-scheme.js "<query>"`.

## Scheduled runs

The weekday morning statement ships **paused**. At onboarding, confirm the time, update the
schedule, and resume it rather than creating a duplicate. List current tasks before creating
anything. Act only on a clear yes.

## Output style

- Lead with totals (invested, current value, gain/loss, %), then the table, then failures.
- Use the script's markdown statement as-is. You may add one or two sentences of context;
  you may not retype the numbers.
- Chunk long output to platform limits (Telegram ~4k chars, Discord ~2k).

## Hard rules

- Never invent a NAV or a rupee figure. If the script flags a row, keep that flag.
- Never overwrite `units`, `avg_cost_nav`, or `invested_amount` unless the principal asks.
- Never share holdings outside the wired channel.
