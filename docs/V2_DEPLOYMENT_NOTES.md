# HMPP 2026 v2.9 — Deployment Notes

## Environments

### Production
- Branch: `main`
- Worker: `pied-piper-tournament-of-champions`
- Entrypoint: `src/worker-v213-prod.js`
- Current vote backend: Durable Objects until controlled D1 migration

### Staging
- Branch: `feature/v2-auth-voting`
- Worker: `pied-piper-tournament-of-champions-v2-test`
- Git mirror branch: `feature/v2-auth-voting`

Keep production and staging Durable Object state separate.

## Required Cloudflare secrets
The Worker requires two runtime secrets:
- `SESSION_SECRET`
- `PARTICIPANT_AUTH_JSON`

Do not commit their values to Git.

`SESSION_SECRET` should be a strong random value used to sign sessions.

`PARTICIPANT_AUTH_JSON` must contain one verifier entry for all 9 official participants plus Test Voter. The public participant directory remains `web/data/2026/participants/public.json` and contains names/IDs only.

## Runtime persistence
Runtime GitHub mirroring is disabled. `VOTE_STORAGE_BACKEND` remains `durable-objects` until the D1 database is provisioned, the production `VOTES_DB` binding is configured, and the live data migration is reconciled. The D1 schema stores each vote and both guesses in one matchup row. See `D1_MIGRATION.md` for exact staging and cutover steps.

No R2 bucket is configured. Establish a private D1 backup/export and restore procedure before considering the migration operationally complete.

## Listening and draft state
Listening completion and unsubmitted matchup drafts are browser-local and participant-scoped. They are convenience state only. Submitted votes/guesses always come from the server-side participant store.

A reset of another participant cannot remotely erase that participant's browser-local listening cache. It does remove the selected round's server-side vote/guess records.

## Deployment procedure
1. Make and validate changes on staging first.
2. Verify participant login, listening, atomic submit, refresh restore, logout/login, Test Voter isolation, reset behavior, publication gating, and concurrent submissions in staging.
3. Prepare one consolidated release commit where practical.
4. For production, ensure `wrangler.jsonc` targets the production Worker and the intended D1 binding/backend flag.
5. Confirm both production secrets and D1 migrations are configured.
6. Merge/promote to `main`.
7. Wait for the Cloudflare Worker build to report success.
8. Run a production smoke test with Test Voter and one official participant.

Do not delete the Durable Object binding or migration inputs until D1 reads, writes, aggregation, resets, and the rollback decision have been verified.

## Current publication gate
Result and Round-of-64 publication controls must remain unavailable until 72 official Play-In votes are present. Test Voter is excluded. Advancement must remain blocked when any Play-In is tied.
