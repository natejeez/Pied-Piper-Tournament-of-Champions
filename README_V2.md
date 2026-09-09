# HMPP 2026 — GitHub-ready v2

This package upgrades the hosted HMPP bracket from listening-only media cards to authenticated, listening-gated voting while preserving the existing 72-song Spotify/YouTube media mapping.

## Key files

- `web/index.html` — live Cloudflare asset
- `web/versions/hmpp_v2.index.html` — archive copy of the same approved frontend
- `src/worker.js` — login/session/vote API and Git mirror logic
- `wrangler.jsonc` — Cloudflare Worker + static assets + Durable Object configuration
- `web/data/2026/participants/public.json` — Git-tracked participant dropdown names only
- `web/data/2026/media.json` — public media manifest
- `web/data/2026/matches.json` — public locked match map
- `docs/V2_DEPLOYMENT_NOTES.md` — required secrets and release procedure
- `docs/V2_ARCHITECTURE.md` — persistence/auth design
- `docs/V2_UI_UX_REVIEW.md` — five UI/UX improvements implemented
- `docs/V2_PORTABILITY_TEST_REPORT.md` — automated test results and hosted smoke test

## Security boundary

Participant emails are **not** present in any public HTML or JSON. Login compares a SHA-256 email verifier stored in a Cloudflare secret. The separate `HMPP_PARTICIPANT_AUTH_SECRET.json` supplied with this delivery is intentionally outside the GitHub-ready folder and must not be committed.

## Vote durability

A confirmed vote is written immediately to a per-participant Durable Object. The Durable Object resets a five-minute alarm and mirrors its vote snapshot to GitHub when that debounce period expires. Logout forces the mirror immediately and refuses to finish if the mirror fails.

See `docs/V2_DEPLOYMENT_NOTES.md` before deploying.

## Acceptance-test identity

A `Test Voter` account is included for feature validation. It is visibly labeled TEST in the login/UI and its votes are isolated from official totals and Git vote files. See `docs/V2_LAUNCH_PLAN.md`.
