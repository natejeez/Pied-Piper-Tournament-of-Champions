# HMPP 2026 — CURRENT STAGING / NEXT STEP PLAN

**Current candidate:** v2.3 on `feature/v2-auth-voting`.

## v2.3 under test
- atomic matchup submission: one song vote + two submitter guesses submitted together;
- no round-level Submit your Guesses workflow;
- Test Voter developer mode with song IDs;
- one-time Test Voter Round-1 (Round-of-64) reset;
- official result aggregation excluding Test Voter;
- Play-In result preview/publication;
- Round-of-64 matchup preview/publication using the locked Play-In winner slot mapping;
- publication state mirrored to `data/2026/admin/publication-state.json`.

## Current admin controls
On the Round-of-64 page, Test Voter receives four controls once Play-In results are complete:
1. View results for previous round
2. Show results for previous round
3. View new matchups
4. Publish New Matchups

The controls remain disabled until all nine official participants have voted every Play-In matchup. New matchup preview/publication also requires no unresolved ties.

## Important source boundary
The repository currently provides authoritative slot wiring through Round of 64 only. Do not invent Round-of-32 or later advancement mappings. Extend publication controls to later rounds only after those mappings are added to the tournament data.

## Production gate
Do not deploy to production until v2.3 hosted acceptance passes. The test branch still targets the test Worker and feature Git branch.
