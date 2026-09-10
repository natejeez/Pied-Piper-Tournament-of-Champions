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
Status: implemented / hosted validated; v2.3 atomic workflow under test
- one vote per matchup per eligible voter
- listening gate before song selection
- song choice remains editable until final matchup submission
- final submission is locked
- server-side vote persistence
- Durable Object authoritative state
- five-minute Git mirror plus logout flush
- test-voter isolation from official totals
- v2.3 submits the head-to-head vote and both submitter guesses as one matchup transaction

## Phase 4 — Results and advancement
Status: v2.3 test implementation for Play-In -> Round of 64
- administrator-controlled result publication
- official completeness excludes Test Voter
- Play-In vote totals can be previewed privately by Test Voter
- Play-In results can be published separately from the next round
- Play-In winners automatically populate the eight Round-of-64 play-in-winner slots
- Test Voter can preview new matchups before publication
- Round of 64 remains hidden from normal participants until explicitly published
- publication state and timestamp are auditable and mirrored to GitHub
- later-round mappings remain future work because the authoritative repository currently defines bracket wiring only through Round of 64

## Phase 5 — Submitter guessing
Status: v2.3 atomic workflow under test
- after both songs are listened to, participant chooses the preferred song
- both song cards then ask `Which Harry Man Submitted...`
- participant chooses from the nine official Harry Men; Test Voter is never a guess option
- the head-to-head choice and both guesses are submitted together with one `matchup_submission_id`
- there is no round-level `Submit your Guesses` button
- guess records remain separate from match votes while retaining linkage to the same matchup submission
- participant, round, match, song, guessed participant, original vote choice, vote submission ID, timestamp, and test/official pool are preserved

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
Status: v2.3 is the active staging candidate

### Test-only developer mode
- implemented in v2.3
- Test Voter sees a DEV MODE banner and internal song IDs
- normal participants never see song IDs
- Test Voter receives result/publication controls only

### Administrator-controlled round publication
- implemented in v2.3 for Play-In -> Round of 64
- completing voting does not automatically publish results
- results and next-round publication are separate admin actions
- new round publication requires complete, non-tied official results
- later rounds will reuse this model when authoritative slot mappings are added

### Analytics foundation
- preserve clean data separation among official votes, test votes, official guesses, and test guesses
- preserve publication events and matchup-submission linkage
- validate the v2.3 workflow and publication controls before production promotion
