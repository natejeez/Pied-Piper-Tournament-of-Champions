# HMPP 2026 Frontend Feature Roadmap

## Phase 1 — Visual framework
Status: implemented prototype
- Purdue-inspired visual system
- song-vs-song matchup cards
- play-in / Round of 64 navigation
- song/artist search
- responsive layout
- participant anonymity in public UI

## Phase 2 — Listening
Status: implemented / hosted validated
- Spotify embeds for Spotify entries
- YouTube embeds for YouTube-only entries
- compact collapsed player state
- lazy player mounting only after Listen is selected
- one active player at a time to reduce clutter and mobile load
- graceful pending state for unresolved play-in winners
- provider-aware media helper and generated public media manifest

## Phase 3 — Voting
Status: implemented / hosted validated
- one vote per matchup per eligible voter
- locked selection after Submit
- totals hidden until voting closes
- clear open / submitted / closed states
- server-side vote persistence
- Durable Object authoritative state
- five-minute Git mirror plus logout flush
- test-voter isolation from official totals

## Phase 4 — Results and advancement
Status: planned for final pre-production build
- administrator-controlled result publication
- winner/loser styling
- vote totals after close/publication
- advancement to next bracket slot only when administrator publishes
- immutable result history
- matchup detail view
- auditable publication state and timestamp

## Phase 5 — Submitter guessing
Status: v2.2 test implementation
- after a participant submits a head-to-head vote, both songs in that matchup become eligible for submitter guessing
- each submitted song card asks `Which Harry Man Submitted...`
- participant chooses from the nine official Harry Men; Test Voter is never a guess option
- guesses are separate records from head-to-head match votes
- guessing requires the participant to have already voted on that matchup
- guesses are participant-linked and song-linked for later accuracy analytics
- a round-level `Submit your Guesses` action appears when all currently available unsaved guess dropdowns in that round are complete
- submitted guesses are immutable/idempotent like match votes
- guess records are mirrored to the same participant audit JSON under a separate `guesses` object

## Phase 6 — Submission rationale
- “Why this song?” reveal
- rationale remains anonymous until the rules permit participant reveal
- rationale attached to the song card or matchup detail, not participant identity

## Phase 7 — Statistics & analytics
Running analytics context is maintained in `docs/ANALYTICS_ROADMAP.md`.

Planned examples:
- song wins / losses
- round reached
- artist performance
- closest matchup
- biggest upset
- Cinderella run
- participant submission performance in private/appropriate views
- winner-pick accuracy leaderboard
- prediction accuracy by round
- submitter-guess accuracy overall and by round
- which submitters were easiest / hardest to identify
- confusion matrix: guessed Harry Man vs actual submitter
- relationship between the song a voter picked and who they guessed submitted it
- **Who was the best at guessing each entry's Daddy**

## Phase 8 — Historical tournaments
- year selector
- past champions
- cross-year artist/song statistics
- participant history
- archived brackets

## Phase 9 — Accounts & durable participant state
Status: implemented for voting and guessing
- participant login/authentication
- stable account identity independent of browser cookies/cache
- server-backed voting and guessing records
- ability to resume on another device
- browser cache/localStorage is never authoritative for submitted votes
- session expiration and secure re-authentication
- public bracket remains anonymous even when an authenticated participant is viewing it
- administrative identity mappings remain separated from public frontend payloads

## Phase 10 — Final pre-production build
Status: PLANNED — do not implement remaining items until the tournament administrator explicitly says to begin.

### Test-only developer mode
- Test Voter login enables a clearly labeled developer mode.
- Developer mode surfaces internal song numbers / song IDs for QA and troubleshooting.
- Song numbers remain hidden for normal participants.

### Administrator-controlled round publication
- completing voting does not automatically publish results
- administrator explicitly publishes a round
- results and advancement remain hidden until publication
- publication populates winners into the next round and makes that round live
- publication state and timing are auditable

### Analytics foundation
- preserve clean data separation among official votes, test votes, official guesses, and test guesses
- validate guessing workflow and publication workflow before building the public analytics presentation
