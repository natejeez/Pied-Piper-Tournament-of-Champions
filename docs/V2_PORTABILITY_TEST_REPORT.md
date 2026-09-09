# HMPP 2026 v2 — Portability / Integrity Test Report

## Static package validation

All automated checks passed: **26 / 26**.

- PASS — HTML doctype, charset, and viewport present
- PASS — 40 total matchup cards retained
- PASS — 8 Play-In matchups retained
- PASS — 32 Round-of-64 matchups retained
- PASS — 72 real song cards retained
- PASS — 72 listening controls present
- PASS — 72 initial disabled vote controls present
- PASS — seven sticky-header round selectors present
- PASS — old round selector beside search removed
- PASS — Rules / Stats / About targets present
- PASS — Copy Link actions removed
- PASS — required Spotify success copy present
- PASS — required YouTube success copy present
- PASS — “All votes submitted for this round.” modal present
- PASS — dynamic `<Round> Bracket` title logic present
- PASS — login and vote confirmation dialogs present
- PASS — song IDs are absent from visible matchup-card text
- PASS — no email addresses are present in public HTML
- PASS — no email addresses are present in the public participant list
- PASS — 72 media records preserved
- PASS — `SONG26-057` uses corrected Spotify track `2m1hi0nfMR9vdGC8UcrnwU`
- PASS — YouTube embed URLs enable JavaScript player-state events
- PASS — frontend inline JavaScript parses with Node
- PASS — Cloudflare Worker JavaScript parses with Node

## What cannot be fully proven offline

These require a deployed Cloudflare preview because they depend on provider/browser/network behavior:

1. YouTube `PLAYING` events arriving from the cross-origin iframe in the production browser.
2. Spotify external-tab behavior on each target device/browser.
3. Durable Object persistence in the deployed Cloudflare account.
4. the five-minute Durable Object alarm firing and mirroring to GitHub.
5. logout forcing a Git mirror before the session cookie is cleared.
6. GitHub token permissions and branch protection behavior.

## Required hosted smoke test

- log in as a test participant;
- open Song A YouTube and press Play; verify listening check appears;
- open Song B Spotify, then click Open in Spotify; verify listening check appears;
- confirm both `Tap to vote` controls unlock only after both checks;
- Cancel a vote and verify no submitted state appears;
- Submit a vote and verify the selected card turns green and the matchup locks;
- refresh and verify the vote restores from the server session;
- wait at least five minutes and verify the participant vote JSON is mirrored to Git;
- submit another vote, choose Log out, and verify Git updates immediately before logout completes;
- log in from a second browser/device and verify submitted matchups restore.
