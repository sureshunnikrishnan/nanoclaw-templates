# Daily mutual fund statement

Weekday morning brief, and on ask any time. Refresh NAVs, update the holdings CSV, and post a
gain/loss table. The script does the fetch, the math, the CSV write, and the statement file.
You post the result; you do not retype the numbers.

## Steps

1. **Confirm the holdings file exists** at `memory/holdings/mutual-funds.csv` (or the path in
   `memory/conventions/holdings.md`). If it is missing, stop and run `onboarding.md`.
2. **Run the updater.** Use today's date in the statement filename:

   ```bash
   bun /workspace/agent/skills/personal-finance/scripts/update-nav.js \
     --csv memory/holdings/mutual-funds.csv \
     --statement memory/statements/mf-YYYY-MM-DD.md
   ```

   The script prints a JSON summary on stdout and writes the markdown statement.
3. **Post the statement** from the file the script wrote. Lead with it. Add at most a line or
   two of context (stale market holiday, first run on the sample file). Do not rebuild the table.
4. **Say what failed.** If the JSON `failed` count is above zero, list those schemes and that
   yesterday's NAV was kept. Do not fill the gap from memory or a web search.
5. **Say which files changed:** the holdings CSV and `memory/statements/mf-YYYY-MM-DD.md`.

## Output

The statement file matches `samples/mf-statement.sample.md`: as-of date, fund counts, totals,
then one row per fund (scheme, units, avg cost, latest NAV + date, current value, gain/loss, %).

## Boundaries

- Never skip the script and "just estimate."
- Never patch a NAV by hand to make the table look complete.
- Never report a run as clean when `failed > 0`.
- On a weekday after a market holiday, a `nav_date` older than yesterday is expected — mention
  it, don't treat it as a fetch failure.
