# HMPP round statistics prototype

## Purpose

This test-only prototype compares several presentation patterns for a statistics page that can be reused for every tournament round. It uses deterministic simulated Play-in ballots, synthetic songs and participant aliases, and is excluded from official totals.

## Candidate round statistics

### Always useful after a round closes

- total ballots, eligible voters, completion rate, matches completed
- vote split and vote count for every matchup
- closest match and largest margin
- winners advancing and eliminated songs
- unanimous wins and ties or exceptional outcomes

### Harry Man guessing

- accuracy leaderboard for the round
- correct guesses out of total guesses
- most recognizable and hardest-to-identify songs
- most frequently guessed submitter
- guess distribution for each song
- participant-by-participant accuracy, only when the publication policy permits it

### Tournament progression

- participant songs entering, advancing, and eliminated in the round
- participant win rate and cumulative record
- song round reached
- Cinderella run / deepest surviving low seed when seeds exist
- biggest upset when meaningful seeding exists

### Historical layer

- cumulative participant win/loss record
- artist performance and repeat appearances
- closest match across the tournament or across years
- prediction accuracy by round
- year-over-year participant performance

## Prototype layout decision points

The prototype intentionally shows four patterns together:

1. **Scoreboard cards** for fast round context.
2. **Head-to-head result bars** for the primary matchup story.
3. **Accuracy leaderboard** for the Harry Man guessing game.
4. **Guess-distribution matrix** for a deeper, optional analysis view.

The recommended production hierarchy is scoreboard -> matchup results -> guessing leaderboard -> expandable deep dive. The matrix is informative but visually dense and should not lead the page.

## Data contract

`stats-prototype.html` expects a JSON document containing:

- `round`: round identity and label
- `participants`: public participant identifiers and display names
- `songs`: song metadata plus ownership truth for post-reveal/test use
- `matches`: any number of two-song matches
- `ballots`: one selected song and two submitter guesses per voter/match

No calculation assumes eight matches, nine voters, or a Play-in round. A future endpoint can emit the same contract or a privacy-safe aggregate derived from it.

## Publication guardrails

- Never publish individual vote choices.
- Current-round ownership and guessing results stay hidden until the tournament reveal policy permits them.
- Production public JSON should contain aggregates, not raw ballots or private administrative fields.
- Test fixtures must retain `visibility: "test-only"` and `excluded_from_official_totals: true`.
- Test fixtures use `Sample Track 01`–`Sample Track 16` and `Harry Man 01`–`Harry Man 09`; they never publish real voter identities, matchups, or song ownership.

## Preview

Open `web/stats-prototype.html?round=play-in`. The page loads `web/data/2026/stats/play-in-sample.json` by default.
