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
