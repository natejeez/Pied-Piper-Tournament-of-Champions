# HMPP 2026 v2.3 — Test Voter Dev / Publication Controls

## Dev mode
Test Voter is the current administrator identity for staging. Only Test Voter sees:
- song IDs on song cards;
- the DEV MODE banner;
- publication controls.

## Play-In -> Round of 64
The repository currently contains authoritative bracket wiring through Round of 64 only. Play-In winner slots map as follows:

- PI01 -> M003
- PI02 -> M013
- PI03 -> M005
- PI04 -> M026
- PI05 -> M032
- PI06 -> M014
- PI07 -> M019
- PI08 -> M024

Later-round slot wiring is not present in the current bracket source and is intentionally not invented in this build. The publication state model is reusable when those mappings are added.

## Completion rule
Official results are complete only when all nine non-test participants have voted in every matchup in the source round. Test Voter never contributes to official completeness or totals.

## Controls on Round of 64
When Play-In voting is complete, Test Voter can use:
1. **View results for previous round** — modal with compact Play-In match cards, song, artist, vote count, and bold winner.
2. **Show results for previous round** — publishes Play-In vote totals/winners onto the Play-In page for all authenticated users.
3. **View new matchups** — fills the eight Play-In-winner slots on Test Voter's Round-of-64 page without publishing the round.
4. **Publish New Matchups** — makes the resolved Round of 64 available to all authenticated participants.

Ties may be viewed/published as results, but new matchups cannot be previewed/published until ties are resolved.

Publication state is stored server-side and mirrored to `data/2026/admin/publication-state.json` with audit events.
