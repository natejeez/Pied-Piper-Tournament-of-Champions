# HMPP 2026 — Analytics Roadmap

This is the running context for statistics and analytics we want the platform to support later. It should evolve as new voting and publication workflows are added.

## Head-to-head voting analytics
- total votes cast by round and participant
- participation/completion rate by round
- song win/loss record
- round reached
- artist performance
- closest matchup
- largest margin / strongest consensus
- biggest upset
- Cinderella run
- participant submission performance
- voter agreement / divergence from the field
- winner-pick accuracy leaderboard
- prediction accuracy by round
- how often a participant voted for or against songs they submitted, when identity reveal rules allow that analysis

## Submitter-guess analytics
- overall submitter-guess accuracy
- accuracy by round
- accuracy by guessing participant
- accuracy by actual submitter
- which Harry Man was easiest to identify
- which Harry Man was hardest to identify
- which songs were easiest / hardest to attribute correctly
- confusion matrix: guessed Harry Man vs actual submitter
- self-recognition rate: how often someone correctly identifies their own submission
- misdirection rate: which submitter's songs are most often attributed to someone else
- relationship between the song a participant voted for and who they guessed submitted that song
- guess confidence/trend opportunities if a confidence field is added later
- **Who was the best at guessing each entry's Daddy** — leaderboard for total and percentage of correct submitter guesses

## Tournament operations analytics
- votes submitted vs expected votes
- guesses submitted vs expected guesses
- round completion timing
- publication timing
- missing-vote / missing-guess audit
- test activity clearly separated from official activity
- ability to reconstruct the complete tournament state from immutable records

## Data required for submitter-guess stats
Every guess should preserve:
- guess submission ID
- batch submission ID
- authenticated guessing participant via the enclosing participant record
- tournament year
- round
- match ID
- song ID
- guessed participant ID
- head-to-head song choice for that matchup at time of guess
- head-to-head vote submission ID
- submission timestamp
- official vs test guess pool
- test-exclusion flag

The correct submitter should remain in the administrative ownership mapping, not in the public guessing payload. Analytics can join guesses to that private mapping after reveal/analysis is appropriate.

## Presentation ideas for later
- leaderboard cards
- round-by-round trend charts
- submitter confusion matrix
- "hardest Daddy to identify" ranking
- song attribution heatmap
- matchup consensus vs attribution-confidence comparison
- participation/audit dashboard for the tournament administrator
