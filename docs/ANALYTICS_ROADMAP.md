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
- time from first interaction to completed matchup, if interaction timing is added later

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
- whether the winning/losing choice was easier to attribute correctly
- guess accuracy by artist, genre, round reached, and vote margin when those dimensions are available
- **Who was the best at guessing each entry's Daddy** — leaderboard for total and percentage of correct submitter guesses

## Matchup-level combined analytics
v2.3 introduces a shared `matchup_submission_id` across one song vote and both submitter guesses. This supports:
- comparing vote choice with both guesses from the exact same decision event
- measuring whether voters attribute preferred songs differently from rejected songs
- identifying participant-specific taste/attribution patterns
- auditing that a completed matchup contains one vote plus two guesses

## Tournament operations analytics
- votes submitted vs expected votes
- guesses submitted vs expected guesses
- complete matchup submissions vs expected matchup submissions
- round completion timing
- publication timing
- time between official completion, result publication, and next-round publication
- missing-vote / missing-guess audit
- test activity clearly separated from official activity
- publication-event audit trail
- ability to reconstruct the complete tournament state from immutable records

## Data required for submitter-guess stats
Every new atomic guess should preserve:
- guess submission ID
- matchup submission ID / guess batch ID
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

## Results/publication analytics
- official vote totals per song and matchup
- result completeness across the nine official participants
- ties requiring resolution
- exact publication timestamp for each result set
- exact publication timestamp for each new round
- which results were visible before/after each publication event
- audit of the winner IDs used to populate each downstream bracket slot

## Presentation ideas for later
- leaderboard cards
- round-by-round trend charts
- submitter confusion matrix
- "hardest Daddy to identify" ranking
- song attribution heatmap
- matchup consensus vs attribution-confidence comparison
- participation/audit dashboard for the tournament administrator
- publication timeline
