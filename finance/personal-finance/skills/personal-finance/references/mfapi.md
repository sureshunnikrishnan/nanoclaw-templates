# mfapi.in

Free Indian mutual-fund API. No authentication, no API key, no paid tier.

- **Host:** `https://api.mfapi.in`
- **Docs:** https://www.mfapi.in/docs/
- **Auth:** none
- **Updates:** about six times a day (including ~21:05 IST after market close). A morning brief
  uses the last published NAV, which is normally yesterday's close.

Do not call these by hand for numbers. Use the scripts; they are the only writers of NAV and P&L.

## Endpoints the scripts use

**Latest NAV for one scheme**

```
GET https://api.mfapi.in/mf/{scheme_code}/latest
```

Read only `status`, `meta.scheme_name`, `data[0].nav`, and `data[0].date`. A non-`SUCCESS`
status or an empty `data` array is a failed fetch: keep the previous NAV.

**Search schemes by name**

```
GET https://api.mfapi.in/mf/search?q={query}
```

Returns `{ schemeCode, schemeName }` objects. Show the list; let the principal pick the code.

## Script commands

```bash
bun /workspace/agent/skills/personal-finance/scripts/update-nav.js \
  --csv memory/holdings/mutual-funds.csv \
  --statement memory/statements/mf-YYYY-MM-DD.md

bun /workspace/agent/skills/personal-finance/scripts/search-scheme.js "UTI Nifty 50 Direct Growth"
```

`--csv` defaults to `memory/holdings/mutual-funds.csv`. `--statement` defaults to
`memory/statements/mf-` plus today's local date.
