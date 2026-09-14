# HMPP 2026 — Production Release v2.9

## Release status
v2.9 is deployed to production from `main` on Cloudflare Worker `pied-piper-tournament-of-champions`.

Production promotion followed staging acceptance of participant login, listening, editable song selection, submitter guessing, atomic matchup submission, submitted-state restoration, Test Voter isolation, scoped resets, and publication gating.

## Final release behavior
- External Spotify and YouTube launches satisfy listening; embedded YouTube PLAYING also satisfies listening.
- Both songs must satisfy listening before voting unlocks.
- Selected song and both submitter guesses are submitted together as one atomic matchup transaction.
- Submitted vote and guesses restore after refresh/login.
- Unsubmitted matchup drafts restore per participant/browser and remain non-authoritative.
- Test Voter receives QA/admin controls and is excluded from official totals.
- Reset scopes are Test Only, selected User, and All Users.
- Publication controls remain disabled until all nine official participants complete all eight Play-In matchups.

## Publication gate
72 official Play-In votes are required before results or Round-of-64 advancement can be previewed/published. Test Voter is excluded. Ties must block advancement.

Once complete, validate:
1. private result preview;
2. public result reveal;
3. private Round-of-64 preview with locked winner-slot placement;
4. public Round-of-64 publication.

## Production configuration
- Git branch/mirror: `main`
- Worker: `pied-piper-tournament-of-champions`
- Worker entrypoint: `src/worker-v29.js`
- required runtime secrets: `SESSION_SECRET`, `PARTICIPANT_AUTH_JSON`, `GITHUB_TOKEN`

The GitHub token should be repository-scoped and have Contents read/write permission. Runtime secret values are not committed.

## Accepted deferred polish
A brief initial-layout flash is still observable in some refresh/logout paths. It is accepted because it does not alter voting data or expose another participant's authenticated state.

## Next milestone
Wait for 72/72 official Play-In submissions and complete the deferred publication acceptance test before generalizing advancement to later rounds.
