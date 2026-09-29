# Personal Finance Agent Template

A NanoClaw agent template for personal financial analysis. First capability: a weekday
morning mutual-fund statement — refresh latest NAVs from mfapi.in, update a local holdings
CSV, and post a gain/loss table.

## Layout

```
personal-finance/
├── plugin.json
├── ai.nanoco.nanoclaw/
│   ├── context/
│   │   ├── instructions.md
│   │   └── additional_context/
│   │       └── memory-structure.md
│   └── tasks/
│       └── daily-mf-statement.md      # weekdays 07:00, created PAUSED
├── skills/
│   ├── welcome/
│   │   └── SKILL.md
│   └── personal-finance/
│       ├── SKILL.md
│       ├── references/
│       │   ├── onboarding.md
│       │   ├── holdings-csv.md
│       │   ├── mfapi.md
│       │   └── daily-mf-statement.md
│       ├── scripts/
│       │   ├── update-nav.js          # fetch NAV, write CSV + statement
│       │   └── search-scheme.js       # name → AMFI scheme code
│       └── samples/
│           ├── mutual-funds.sample.csv
│           └── mf-statement.sample.md
└── README.md
```

There is no `mcp.json`. mfapi.in is a free, unauthenticated REST API. The scripts call it
with `curl` so OneCLI's HTTPS proxy applies; they own every NAV and rupee figure so the
agent does not invent P&L.

## Stamp an agent

```bash
ncl groups create --template finance/personal-finance --name "Personal Finance"
```

Then wire it to a channel (`/manage-channels`). On first contact the agent onboards: holdings
CSV path, scheme codes, and whether to resume the morning brief.

## Holdings CSV

The live file is `memory/holdings/mutual-funds.csv` (writable workspace, not the template).
Copy the dummy sample to try the flow:

```
skills/personal-finance/samples/mutual-funds.sample.csv
```

Columns: `scheme_code`, `scheme_name`, `units`, `avg_cost_nav`, `invested_amount`,
`latest_nav`, `nav_date`, `current_value`, `gain_loss`, `gain_loss_pct`. The script
overwrites only the last five plus `scheme_name` on a successful fetch. Real holdings stay
out of git.

`scheme_code` is the AMFI code mfapi.in uses. Look one up with:

```bash
bun /workspace/agent/skills/personal-finance/scripts/search-scheme.js "UTI Nifty 50 Direct Growth"
```

## Recurring task

`daily-mf-statement` ships paused at `0 7 * * 1-5` (07:00 weekdays). The morning brief uses
the last published NAV (mfapi.in updates through the evening after market close). Enable it
with `ncl tasks resume <task-id>` after onboarding confirms the time.

## Credentials

**None.** [mfapi.in](https://www.mfapi.in/docs/) requires no API key and has no paid tier.
Do not add a secret for it. The API host is `api.mfapi.in`.
