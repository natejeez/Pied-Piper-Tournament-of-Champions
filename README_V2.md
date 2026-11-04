# HMPP 2026 — Production

Harry Men Pied Piper Tournament of Champions runs on the authenticated Cloudflare Worker.

## Current production
- Git branch: `main`
- Cloudflare Worker: `pied-piper-tournament-of-champions`
- Runtime: Cloudflare Worker + Durable Objects + static assets; D1 is the target authority for vote/guess records
- Storage cutover: pending Cloudflare D1 provisioning and live-state migration
- Tournament: 9 official participants, 72 songs, 8 Play-In matchups, 64-song main bracket
- Test identity is excluded from official totals.

## Participant workflow
1. Log in.
2. Listen to both songs in a matchup.
3. Select a song; the choice can be changed until final submission.
4. Guess which Harry Man submitted each song.
5. Submit one song vote and two submitter guesses atomically.
6. Vote and both guesses are stored together and restored from server state. GitHub is not a runtime data store or mirror.

Unsubmitted drafts are browser-local per participant and restore after refresh/login. They are never authoritative tournament records.

## Administration
The test administrator identity receives QA and publication controls. Publication controls remain gated until all 9 official participants complete all 8 Play-In matchups: 72 official Play-In votes.

## Canonical documentation
- `docs/CURRENT_PROJECT_CONTEXT.md`
- `docs/V2_ARCHITECTURE.md`
- `docs/V2_DEPLOYMENT_NOTES.md`
- `docs/NEXT_BUILD_PLAN.md`
- `docs/frontend-feature-roadmap.md`
- `docs/ANALYTICS_ROADMAP.md`
- `docs/PRODUCTION_RELEASE_V2_9.md`
- `docs/SOURCE_INDEX.md`

Version-specific documents under `docs/` are retained as historical implementation records and are not the current source of truth unless explicitly referenced.

## Data privacy and migration
Participant/admin data and vote snapshots are excluded from Git tracking. Historical public commits may still contain previously committed data; deleting it from the current tree does not erase public history. See `docs/D1_MIGRATION.md` for the staged D1 rollout and migration procedure. No R2 backup is configured.

## Current release gate
Production remains on the existing Durable Object vote store until a D1 database is provisioned, live state is reconciled, and the controlled cutover is completed. Do not enable D1 by changing the backend flag before following `docs/D1_MIGRATION.md`.
