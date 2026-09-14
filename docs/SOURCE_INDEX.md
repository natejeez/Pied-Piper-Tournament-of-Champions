# HMPP 2026 — Documentation Source Index

## Canonical current sources
Use these first for current implementation and operations:

- `README_V2.md` — production overview
- `docs/CURRENT_PROJECT_CONTEXT.md` — authoritative current project state
- `docs/V2_ARCHITECTURE.md` — current architecture and state model
- `docs/V2_DEPLOYMENT_NOTES.md` — current production/staging deployment notes
- `docs/NEXT_BUILD_PLAN.md` — next operational and engineering milestones
- `docs/frontend-feature-roadmap.md` — feature status and future phases
- `docs/ANALYTICS_ROADMAP.md` — analytics backlog
- `docs/PRODUCTION_RELEASE_V2_9.md` — production release record

## Historical implementation records
Files whose names contain earlier version numbers such as `V2_1`, `V2_2`, `V2_3`, or older UI/deployment reviews are retained as historical records. They may describe staging states, superseded workflows, or deployment cautions that are no longer current.

When a historical document conflicts with a canonical current source, the canonical current source wins.

## Runtime sources of truth
- participant-facing app: `web/index.html` plus current injected UI assets
- production Worker entrypoint: `src/worker-v29.js`
- Cloudflare configuration: `wrangler.jsonc`
- public participant directory: `web/data/2026/participants/public.json`
- public media/match data: `web/data/2026/`
- official participant snapshots: `data/2026/votes/by-participant/`
- Test Voter snapshots: `data/2026/test-votes/by-participant/`

## Project-source refresh policy
When a production behavior changes, update `CURRENT_PROJECT_CONTEXT.md`, the affected architecture/deployment/roadmap document, and this index in the same release or documentation commit. Avoid treating old version-specific documents as the active project brief.
