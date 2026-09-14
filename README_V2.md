# HMPP 2026 — Production v2.9

Harry Men Pied Piper Tournament of Champions is live on the authenticated v2.9 voting stack.

## Current production
- Git branch: `main`
- Cloudflare Worker: `pied-piper-tournament-of-champions`
- Runtime: Cloudflare Worker + Durable Objects + static assets
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

## Current release gate
The participant-facing voting workflow is production-ready. The next live validation occurs only after all 72 official Play-In votes exist: verify result preview, result publication, automatic Play-In winner placement into Round of 64, and Round-of-64 publication.
