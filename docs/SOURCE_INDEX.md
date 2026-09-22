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
- `docs/PRODUCTION_RELEASE_V2_14.md` — current stabilization/release record

Project engineering guardrails are also maintained in the project context and should be applied to every feature branch: development guidelines, branching/release policy, and testing/acceptance policy.

## Historical implementation records
Files whose names contain earlier version numbers such as `V2_1`, `V2_2`, `V2_3`, `V2_9`, or older UI/deployment reviews are retained as historical records. They may describe staging states, superseded workflows, or deployment cautions that are no longer current.

When a historical document conflicts with a canonical current source, the canonical current source wins. Active runtime configuration remains the highest-confidence source for the currently deployed entrypoint.

## Runtime sources of truth
- participant-facing app: `web/index.html` plus current injected UI assets
- production candidate Worker entrypoint: `src/worker-v214-prod.js`
- canonical base session/persistence Worker: `src/worker.js`
- Cloudflare configuration: `wrangler.jsonc`
- public participant directory: `web/data/2026/participants/public.json`
- public media/match data: `web/data/2026/`
- official participant snapshots: `data/2026/votes/by-participant/`
- Test Voter snapshots: `data/2026/test-votes/by-participant/`
- pre-merge automated gate: `.github/workflows/pre-merge.yml`

## V2 rebuild references
The V2 experimentation branch is not a merge source. Preserve successful behaviors selectively while avoiding the failure modes documented in the project-context V2 rebuild notes.

Two current carry-forward rules are especially important:
- preserve atomic matchup submission and durable-first/non-blocking logout;
- preserve the approved compact results-card layout, but rebuild it through one canonical renderer rather than V2 repair/watchdog scripts.

Before later-round voting is generalized, implement round-scoped guess identity so reused songs cannot inherit guesses from prior rounds.

## Project-source refresh policy
When production behavior changes, update `CURRENT_PROJECT_CONTEXT.md`, the affected architecture/deployment/roadmap document, the current release record, and this index in the same release or documentation commit. Avoid treating old version-specific documents as the active project brief.
