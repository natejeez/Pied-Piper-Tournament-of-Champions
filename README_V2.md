# HMPP 2026 — Production v2.14

Harry Men Pied Piper Tournament of Champions uses the authenticated v2 voting stack with Durable Object-authoritative matchup submissions and a non-blocking Git audit mirror on logout.

## Current production
- Git branch: `main`
- Cloudflare Worker: `pied-piper-tournament-of-champions`
- Runtime: Cloudflare Worker + Durable Objects + static assets
- Production entrypoint: `src/worker-v214-prod.js`
- Git mirror: `main`
- Tournament: 9 official participants, 72 songs, 8 Play-In matchups, 64-song main bracket
- Test identity is excluded from official totals.

## Participant workflow
1. Log in.
2. Listen to both songs in a matchup.
3. Select a song; the choice can be changed until final submission.
4. Guess which Harry Man submitted each song.
5. Submit one song vote and two submitter guesses atomically.
6. Submitted state is durable and restored from the participant Durable Object. GitHub is the audit/export mirror.
7. Logout clears the participant session after the ballot is already durable. The immediate Git mirror is best-effort and does not invalidate the saved ballot if GitHub is temporarily unavailable.

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
- `docs/PRODUCTION_RELEASE_V2_14.md`
- `docs/SOURCE_INDEX.md`

Version-specific documents under `docs/` are retained as historical implementation records and are not the current source of truth unless explicitly referenced.

## Current release gate
The v2.14 candidate must pass the repository pre-merge regression workflow and hosted staging acceptance before merge to `main`. Hosted acceptance must verify atomic submission, refresh restoration, normal logout, deliberate Git-mirror failure during logout, and cross-session restoration from the Durable Object.

After v2.14 is stable, the next planned stabilization feature is the approved compact published-results card. Round-scoped guess identity for songs reused across rounds remains a required guardrail for the later V4 rebuild.
