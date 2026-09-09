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
Status: implementation branch
- Spotify embeds for Spotify entries
- YouTube embeds for YouTube-only entries
- compact collapsed player state
- lazy player mounting only after Listen is selected
- one active player at a time to reduce clutter and mobile load
- graceful pending state for unresolved play-in winners
- provider-aware media helper and generated public media manifest

## Phase 3 — Voting
- one vote per matchup per eligible voter
- locked selection after submit unless rules allow editing
- totals hidden until voting closes
- clear open / submitted / closed states
- tie handling workflow
- server-side vote persistence rather than browser-only storage

## Phase 4 — Results and advancement
- winner/loser styling
- vote totals after close
- automatic advancement to next bracket slot
- immutable result history
- matchup detail view

## Phase 5 — Submission rationale
- “Why this song?” reveal
- rationale remains anonymous until the rules permit participant reveal
- rationale attached to the song card or matchup detail, not participant identity

## Phase 6 — Statistics
- song wins / losses
- round reached
- artist performance
- closest matchup
- biggest upset
- Cinderella run
- participant submission performance in private/appropriate views
- winner-pick accuracy leaderboard
- prediction accuracy by round

## Phase 7 — Historical tournaments
- year selector
- past champions
- cross-year artist/song statistics
- participant history
- archived brackets

## Phase 8 — Accounts & durable participant state
Design now; implement when voting/backend work begins.
- participant login/authentication
- stable account identity independent of browser cookies/cache
- server-backed listening progress / matchup-seen state
- server-backed voting records and submission confirmation
- ability to resume on another device
- cache/localStorage may improve responsiveness but must never be the authoritative record
- session expiration and secure re-authentication
- public bracket remains anonymous even when an authenticated participant is viewing it
- administrative identity mappings remain separated from public frontend payloads


## Phase 9 — Final pre-production build
Status: PLANNED — do not implement until the tournament administrator explicitly says to begin the next build.

This is the next build before production deployment.

### Test-only developer mode
- Logging in as `Test Voter` should enable a clearly labeled developer mode.
- Developer mode may surface internal song numbers / song IDs on matchup cards for QA and troubleshooting.
- Song numbers remain hidden for normal participants.
- Developer-only diagnostics must not change official vote behavior or public anonymity.

### Administrator-controlled round publication
- Completing voting for a round must not automatically publish results to participants.
- The tournament administrator explicitly decides when a round is published.
- Until publication, results and next-round advancement remain hidden from participants.
- Publishing a round should lock/finalize that round's result set and populate the appropriate winners into the next round.
- The next round becomes live only when the administrator publishes it.
- Preserve an auditable record of publication state and timing.

### Post-round submitter guessing vote
- After a new round is published, the immediately previous round opens a secondary guessing activity.
- Participants guess who submitted each song from that completed round.
- Guess records must be separate from tournament winner votes.
- Guessing data should remain participant-linked so accuracy and trends can be analyzed later.
- The reveal/close timing for submitter identities should be administrator-controlled and finalized during implementation.

### Analytics foundation
- Build the data outputs needed to showcase tournament organization and behavior.
- Planned analytics include vote trends, participant voting patterns, submitter-guess accuracy, song/artist performance, round progression, and auditability.
- Keep official match votes, test votes, and submitter guesses as separate data concepts/pools.
- Analytics presentation will be designed after the publication and guessing workflows are validated.
