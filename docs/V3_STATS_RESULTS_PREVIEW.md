# HMPP v3 — Round Results Preview

Branch: `feature/v3-stats-results`
Base: `feature/v2-auth-voting`

## Scope

v3 adds a test-only, round-scoped results preview without changing the stable v2 source branch or `main`.

### Simulate Results

When logged in as `test-voter`, the selected round exposes a **Simulate Results** control.

For each complete two-song matchup in that round, the simulator creates:

- one song vote from each of the 9 tournament participants;
- one Harry Man guess for each song from each participant;
- a separate simulated Test Voter vote and guesses for the personalized `Your vote` / `Your guess` presentation;
- aggregate vote totals and a winner;
- the top three group guesses for each song.

The Test Voter ballot is not included in group totals. With 9 tournament voters, a simulated song matchup cannot tie.

## Round isolation

Simulation data is stored under a round-specific browser key:

`hmpp:v3:simulated-results:<round>`

No cumulative statistics are calculated in v3. Switching rounds displays only the selected round's preview data.

Only currently populated, complete two-song matchup cards are simulated. Future rounds that do not yet have real bracket entries are not fabricated.

## Matchup-card results

When simulated results exist, the existing matchup card becomes a compact results card. Each song shows:

- song and artist;
- group vote count and percentage;
- `Your vote` when applicable;
- `Winner` when applicable;
- the active Test Voter's Harry Man guess;
- the top three Harry Men guessed by the group, with counts.

The actual song submitter is never revealed by this view.

## Round summary

The selected round also exposes a compact summary strip derived only from that round:

- voter count;
- closest matchup;
- widest-margin matchup;
- most frequently guessed Harry Man.

These are intentionally round-level, non-cumulative statistics.

## Reset behavior

The v3 controller watches the existing v2 test reset workflow. When the selected round reports a successful reset, the round's simulated preview key is removed before the existing reset flow reloads the page.

A separate **Clear Preview** action clears only simulated browser data and does not affect tournament data.

## Production path

The simulator and renderer are deliberately separated. `web/js/stats-v3-core.mjs` owns result generation/aggregation, while `web/stats-v3.js` owns DOM presentation. A later production version can replace the simulated payload with a closed-round results API while retaining the same card renderer/data concepts.

## QA

`tests/v3-stats-regression.mjs` verifies:

- deterministic same-seed generation;
- different-seed variability;
- exactly 9 group ballots per matchup;
- Test Voter exclusion from group totals;
- one winner per matchup;
- two guesses per active-user matchup;
- no more than three displayed group guesses per song;
- round summary creation;
- round isolation.
