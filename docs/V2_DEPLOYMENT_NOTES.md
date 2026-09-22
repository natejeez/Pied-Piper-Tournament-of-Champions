# HMPP 2026 v2.14 — Deployment Notes

## Environments

### Production
- Branch: `main`
- Worker: `pied-piper-tournament-of-champions`
- Git mirror branch: `main`
- Candidate entrypoint: `src/worker-v214-prod.js`

### Stabilization branch
- Branch: `feature/stabilize-ballot-logout`
- Purpose: validate durable-first, non-blocking logout before promotion to `main`

Existing V2 experimental/staging branches are reference history and should not be merged wholesale into production.

Keep production and test Durable Object state separate.

## Required Cloudflare secrets
The Worker requires three runtime secrets:
- `SESSION_SECRET`
- `PARTICIPANT_AUTH_JSON`
- `GITHUB_TOKEN`

Do not commit their values to Git.

`SESSION_SECRET` should be a strong random value used to sign sessions.

`PARTICIPANT_AUTH_JSON` must contain one verifier entry for all 9 official participants plus Test Voter. The public participant directory remains `web/data/2026/participants/public.json` and contains names/IDs only.

`GITHUB_TOKEN` should be a fine-grained GitHub token scoped only to `natejeez/Pied-Piper-Tournament-of-Champions` with repository Contents read/write permission. Metadata read access is implicit.

## Runtime persistence
Submitted matchup data is written immediately to a participant Durable Object. One atomic matchup submission contains:
- one song vote;
- two submitter guesses;
- a shared `matchup_submission_id`.

GitHub is an audit/export mirror, not the request-time authority or participant logout gate.

A successful matchup submission schedules the normal five-minute Git mirror alarm. Logout also starts an immediate best-effort mirror, but the session closes without waiting for GitHub. If that immediate mirror fails, the Durable Object ballot remains authoritative and the existing alarm remains scheduled because the `flush` action deletes the alarm only on successful mirror completion.

Official snapshots:
`data/2026/votes/by-participant/<participant-id>.json`

Test Voter snapshot:
`data/2026/test-votes/by-participant/test-voter.json`

Admin publication state is mirrored separately.

## Listening and draft state
Listening completion and unsubmitted matchup drafts are browser-local and participant-scoped. They are convenience state only. Submitted votes/guesses always come from the server-side participant store.

A reset of another participant cannot remotely erase that participant's browser-local listening cache. It does remove the selected round's server-side vote/guess records.

## Pre-merge automated gate
Pull requests to `main` run `.github/workflows/pre-merge.yml`.

The v2.14 candidate gate runs:
- JavaScript syntax checks for the current base Worker, v2.13 production wrapper, v2.14 candidate wrapper, and `web/guessing.js`;
- `tests/v27-participant-regression.mjs`;
- `tests/v28-participant-regression.mjs`;
- `tests/v29-regression.mjs`;
- `tests/v213-production-regression.mjs`;
- `tests/v214-ballot-logout-regression.mjs`.

A failing required check blocks merge.

## Hosted staging acceptance
Before v2.14 can merge/promote:
1. log in with an approved test identity;
2. complete both listening requirements for one matchup;
3. choose one song and both Harry Man guesses;
4. submit once and verify the matchup locks;
5. refresh and verify the submitted vote plus both guesses restore;
6. log out normally and verify logout completes;
7. log back in or use a second browser and verify the ballot restores;
8. verify the Git mirror is eventually updated;
9. deliberately exercise a mirror-failure condition in the staging environment;
10. verify logout still completes while the Durable Object ballot remains restorable;
11. restore mirror access and verify the audit snapshot can catch up without changing the ballot.

## Production promotion
1. Confirm the exact candidate commit SHA.
2. Confirm the pre-merge workflow is green.
3. Confirm hosted staging acceptance is complete.
4. Confirm `wrangler.jsonc` points to `src/worker-v214-prod.js` and `GITHUB_BRANCH` is `main`.
5. Confirm all three production secrets are set.
6. Confirm the rollback target is the current v2.13 production state.
7. Merge the approved pull request to `main`.
8. Wait for the Cloudflare Worker build to report success.
9. Run the critical production smoke test with Test Voter and one approved official-participant path where practical.
10. Verify no test data entered official vote paths.

## Current publication gate
Result and Round-of-64 publication controls must remain unavailable until 72 official Play-In votes are present. Test Voter is excluded. Advancement must remain blocked when any Play-In is tied.
