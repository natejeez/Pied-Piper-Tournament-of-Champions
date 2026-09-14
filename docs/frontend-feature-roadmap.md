# HMPP 2026 Frontend Feature Roadmap

## Phase 1 — Visual framework
Status: production
- Purdue-inspired visual system
- song-vs-song matchup cards
- round navigation
- responsive layout
- participant anonymity in public UI

## Phase 2 — Listening
Status: production
- Spotify and YouTube media support
- one active player at a time
- external Spotify/YouTube launch satisfies listening
- embedded YouTube PLAYING satisfies listening
- both songs must satisfy listening before voting unlocks

## Phase 3 — Voting
Status: production
- authenticated participant voting
- editable song choice until final submission
- green selected / red alternate state
- atomic matchup submit
- Durable Object authoritative persistence
- Git audit/export mirror
- Test Voter isolation
- submitted state restored after refresh/login

## Phase 4 — Submitter guessing
Status: production
- two `Which Harry Man Submitted...?` guesses per matchup
- guesses submitted atomically with song vote
- submitted guesses remain visible as text after submit and refresh
- Test Voter excluded from guess options/statistics

## Phase 5 — Draft continuity
Status: production
- listening state persists per participant/browser
- selected song and current guesses persist as a browser-local draft
- draft restores after refresh/login
- drafts are never counted as submitted votes

## Phase 6 — Results and advancement
Status: production implementation, live completion test pending
- Test Voter-only result preview/publication controls
- official completeness excludes Test Voter
- controls disabled before 72/72 official Play-In votes
- ties block advancement
- Play-In winners populate locked Round-of-64 slots
- Round of 64 remains hidden until explicit publication
- live 72/72 publication acceptance is deferred until participants finish voting

## Phase 7 — Admin recovery
Status: production
- Test Voter-only Reset Round Data controls
- Reset Test Only
- Reset for User
- Reset All Users
- changed participant snapshots flushed back to Git
- reset controls hidden after the applicable round is published

## Phase 8 — Statistics and analytics
Status: planned
See `docs/ANALYTICS_ROADMAP.md`.

Planned areas include song/artist performance, participant submission performance, matchup closeness, round progression, submitter-guess accuracy, confusion matrices, self-recognition/misdirection, and vote-vs-guess relationships.

## Phase 9 — Later rounds
Status: pending authoritative bracket data
- add Round-of-32 and later slot mappings
- reuse the same preview/publish model
- do not invent advancement wiring before the data exists

## Phase 10 — Historical tournaments and stronger auth
Status: future
- historical year selector and archived brackets
- cross-year statistics
- consider stronger one-time-code or magic-link authentication for future tournaments

## Accepted deferred polish
A brief initial-layout flash can still occur during some refresh/logout paths. It is accepted for v2.9 because it does not change data or expose another participant's authenticated state.
