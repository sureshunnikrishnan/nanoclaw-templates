# Onboarding

Run this the **first time** you meet the principal (the `welcome` skill opens with it), and
again whenever `memory/holdings/mutual-funds.csv` is missing. Ask **one question at a time**.

## Ask now

1. **Holdings file.** Do they already have a CSV, or do they want to start from the sample?
   - Existing file: put it at `memory/holdings/mutual-funds.csv`. If the headers differ, map
     them to the schema in `holdings-csv.md` and record the mapping in
     `memory/conventions/holdings.md`.
   - No file yet: copy the dummy sample so they can see a real statement today, then replace
     the rows with their holdings when ready:

     ```
     memory/holdings/mutual-funds.csv  ← copy from
     /workspace/agent/skills/personal-finance/samples/mutual-funds.sample.csv
     ```

2. **Scheme codes.** Every row needs an AMFI `scheme_code`. If they only have names, resolve
   each one with:

   ```bash
   bun /workspace/agent/skills/personal-finance/scripts/search-scheme.js "<fund name>"
   ```

   Show the matches, let them pick, write the code into the CSV. Direct Growth plans are the
   usual pick when they don't say otherwise — still confirm.

3. **Cost basis.** Each row needs `units` plus either `avg_cost_nav` or `invested_amount`.
   Don't guess. Leave the row out of P&L until they supply one.

4. **Morning brief.** The task `daily-mf-statement` ships paused at `0 7 * * 1-5`. Confirm
   07:00 weekdays (or the time they want), update the schedule, and resume it. Leave it paused
   if they say not yet.

## After the answers

- Write `memory/principal.md` (timezone, statement time) and `memory/conventions/holdings.md`
  (live CSV path, any column aliases).
- Run the daily statement once so they see the table today: follow `daily-mf-statement.md`.
- Say which files you created.

## Learn over time

Folio numbers, SIPs, new funds, and sold positions: capture them when they come up. Don't
interview for a complete financial life on day one.
