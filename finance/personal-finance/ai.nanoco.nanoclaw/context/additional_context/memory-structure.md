# Memory structure for this role

Where this role's learned material lives. Create any of these that are not there yet, keep them
current, and link them from the Map in `memory/index.md`. Skills, tasks, and scripts refer to
these paths, so keep the names exact.

## `memory/principal.md`: who you serve

Name, timezone, preferred statement time, and where the line sits between what you handle and
what comes back to them. Currency is INR unless they say otherwise.

## `memory/holdings/mutual-funds.csv`: the live holdings file

The only writable source of truth for mutual-fund positions. Schema and update rules:
`skills/personal-finance/references/holdings-csv.md`. A dummy starter lives at
`skills/personal-finance/samples/mutual-funds.sample.csv` — copy it here on first run if they
want to try the flow before using real holdings.

Never commit real holdings into the template. This file is workspace state.

## `memory/statements/mf-YYYY-MM-DD.md`: saved morning statements

One file per run, written by `update-nav.js`. Treat them as a history; do not edit after the
script writes them. An illustrative example lives at
`skills/personal-finance/samples/mf-statement.sample.md`.

## `memory/conventions/holdings.md`: file location and column mapping

Record the live CSV path (default above), any column aliases they asked for, and the date the
schema was agreed. If they keep a copy of the CSV somewhere else, that path goes here too.

## `sources/`: the raw record

Uploaded broker statements, CAMS/KFin dumps, and original CSVs live in `sources/`, next to
`memory/`. Never edit or delete what is there. Keep credentials out of anything you write from them.
