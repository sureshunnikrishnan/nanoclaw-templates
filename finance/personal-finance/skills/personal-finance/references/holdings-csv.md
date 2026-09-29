# Holdings CSV

The live file is `memory/holdings/mutual-funds.csv`. A dummy starter (three well-known Direct
Growth schemes, fictional units and cost) lives at
`skills/personal-finance/samples/mutual-funds.sample.csv`.

## Columns, in this order

| Column | Owner | Required | Notes |
|--------|-------|----------|-------|
| `scheme_code` | principal | yes | AMFI code used by mfapi.in |
| `scheme_name` | principal / script | yes | display name; script refreshes from API `meta.scheme_name` when the fetch succeeds |
| `units` | principal | yes | units held; do not overwrite |
| `avg_cost_nav` | principal | one of these | average purchase NAV |
| `invested_amount` | principal | one of these | cost basis. If empty, script uses `units * avg_cost_nav` |
| `latest_nav` | script | — | last fetched NAV; overwritten each run |
| `nav_date` | script | — | API as-of date (`DD-MM-YYYY`) |
| `current_value` | script | — | `units * latest_nav` |
| `gain_loss` | script | — | `current_value - invested_amount` |
| `gain_loss_pct` | script | — | `gain_loss / invested_amount * 100` |

Extra columns are preserved. The script only writes the owner=`script` columns plus
`scheme_name` on a successful fetch.

## Rules

- The stamped plugin is read-only. Never edit the sample in place as if it were live holdings;
  copy it to `memory/holdings/` first.
- On a failed fetch, leave `latest_nav` / `nav_date` / computed columns as they were and flag
  the row in the statement.
- Do not invent a `scheme_code`. Look it up with `search-scheme.js`.
- Keep real holdings out of the template and out of git.
