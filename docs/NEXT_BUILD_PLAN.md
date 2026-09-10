# HMPP 2026 — NEXT BUILD REMINDER

**Release intent:** One final pre-production build remains after the v2.2 submitter-guessing test.

## Implemented in v2.2 test
Submitter guessing is now available immediately after a participant submits a head-to-head matchup vote.

Behavior under test:
- each completed matchup exposes `Which Harry Man Submitted...` on both song cards;
- each song gets a dropdown of the nine official participants;
- Test Voter is excluded from guess choices;
- guesses are separate from head-to-head match votes;
- guesses are durable, participant-linked, song-linked, match-linked, and mirrored to Git;
- `Submit your Guesses` becomes available after all currently available unsaved guesses in the selected round are completed;
- test guesses remain excluded from official guessing analytics.

This replaces the earlier idea that guessing only opens after the next round is published. The current product decision is: **guessing opens as soon as that participant has voted on the matchup.**

## 1. Test-only developer mode — still planned
When logged in as **Test Voter**, enable a clearly labeled developer mode that surfaces internal song numbers / song IDs on matchup cards for QA and troubleshooting.

Requirements:
- developer mode only for Test Voter;
- normal participants never see song IDs;
- test mode remains excluded from official totals and official guessing analytics;
- developer display must not alter tournament behavior.

## 2. Administrator-controlled round publication — still planned
Round completion and round publication are separate events.

Required behavior:
- voting can close without immediately revealing results;
- results remain hidden until the tournament administrator chooses **Publish Round**;
- publishing finalizes the result set used for advancement;
- winners are populated into the next-round bracket;
- the next round becomes visible/live only after administrator publication;
- publication state and timestamp should be auditable;
- normal participants cannot publish or alter a round.

## 3. Analytics foundation
Maintain clean data for:
- official head-to-head votes;
- test head-to-head votes;
- official submitter guesses;
- test submitter guesses;
- future round-publication events.

See `docs/ANALYTICS_ROADMAP.md` for the running stats list.

## Next-session instruction
If a future chat starts without this conversation in view, read this file, `docs/frontend-feature-roadmap.md`, and `docs/ANALYTICS_ROADMAP.md` before proposing the final pre-production build.

Do not start developer mode or publication controls until Nathan explicitly says it is time.
