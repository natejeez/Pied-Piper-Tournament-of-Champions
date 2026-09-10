# HMPP 2026 v2.3 — Deployment Notes

## Staging branch
`feature/v2-auth-voting`

## Staging Worker
`pied-piper-tournament-of-champions-v2-test`

## Entry point
`wrangler.jsonc` now points to `src/worker-v23.js`.

`src/worker-v23.js` imports and extends the prior validated `src/worker.js`, leaving the earlier backend intact for rollback/reference while adding:
- atomic matchup submission;
- Test Voter Round-of-64 reset;
- tournament/publication state;
- official result aggregation;
- Play-In result publication;
- Round-of-64 preview/publication.

No new Durable Object migration tag is required because the existing `ParticipantVoteStore` class/binding remains in use and only gains new storage keys/actions.

## Existing secrets remain required
- `SESSION_SECRET`
- `PARTICIPANT_AUTH_JSON`
- `GITHUB_TOKEN`

## Git mirror
Participant vote/guess mirrors use schema version 4. Publication state writes to `data/2026/admin/publication-state.json`.

## Deployment
A push to the feature branch triggers the isolated Cloudflare test Worker. Validate the hosted test plan before any production release branch is prepared.
