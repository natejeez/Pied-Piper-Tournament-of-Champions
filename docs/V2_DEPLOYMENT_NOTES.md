# HMPP 2026 v2.9 — Deployment Notes

## Environments

### Production
- Branch: `main`
- Worker: `pied-piper-tournament-of-champions`
- Git mirror branch: `main`
- Entrypoint: `src/worker-v29.js`

### Staging
- Branch: `feature/v2-auth-voting`
- Worker: `pied-piper-tournament-of-champions-v2-test`
- Git mirror branch: `feature/v2-auth-voting`

Keep production and staging Durable Object state separate.

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

GitHub is an audit/export mirror, not the request-time authority. The Worker debounces routine Git mirrors and logout forces an immediate flush. Logout is refused if the forced mirror fails.

Official snapshots:
`data/2026/votes/by-participant/<participant-id>.json`

Test Voter snapshot:
`data/2026/test-votes/by-participant/test-voter.json`

Admin publication state is mirrored separately.

## Listening and draft state
Listening completion and unsubmitted matchup drafts are browser-local and participant-scoped. They are convenience state only. Submitted votes/guesses always come from the server-side participant store.

A reset of another participant cannot remotely erase that participant's browser-local listening cache. It does remove the selected round's server-side vote/guess records.

## Deployment procedure
1. Make and validate changes on staging first.
2. Verify participant login, listening, atomic submit, refresh restore, logout/login, Test Voter isolation, reset behavior, and publication gating.
3. Prepare one consolidated release commit where practical.
4. For production, ensure `wrangler.jsonc` targets the production Worker and `GITHUB_BRANCH` is `main`.
5. Confirm all three production secrets are set.
6. Merge/promote to `main`.
7. Wait for the Cloudflare Worker build to report success.
8. Run a production smoke test with Test Voter and one official participant.

## Current publication gate
Result and Round-of-64 publication controls must remain unavailable until 72 official Play-In votes are present. Test Voter is excluded. Advancement must remain blocked when any Play-In is tied.
