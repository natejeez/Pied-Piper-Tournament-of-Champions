# HMPP 2026 v2.3 — Combined Matchup + Dev Publication Release Notes

This staging build changes one matchup into a single submission transaction: preferred song + both submitter guesses. It also introduces Test-Voter-only development and Play-In-to-Round-of-64 publication controls.

## Runtime layout
- `src/worker.js` remains the previously validated v2.2 backend for rollback/reference.
- `src/worker-v23.js` is the v2.3 entry point and extends the existing Worker/Durable Object behavior.
- `wrangler.jsonc` points staging to `src/worker-v23.js`.
- `web/guessing.js` contains the v2.3 combined matchup and dev/publication UI.
- `web/guessing.css` contains the corresponding UI styles.
- `web/index.html` remains the validated v2.1.1 bracket shell.

## Test boundary
Only Play-In -> Round of 64 advancement is wired because that is the only downstream slot mapping currently present in authoritative repo data. Later rounds are intentionally not guessed or synthesized.

## Production status
STAGING ONLY. Do not promote until hosted acceptance passes.
