# HMPP 2026 v2.2.1 — Submitter Guessing UI Hotfix

## Hosted regression
The v2.2 backend and modular guessing assets deployed, but the browser did not show the secondary submitter-guessing UI on completed matchups.

## Root cause
Cloudflare Static Assets defaults to asset-first routing. Because `web/index.html` matched a static asset, Cloudflare served it directly and did not invoke the Worker first. The v2.2 implementation depended on the Worker running an `HTMLRewriter` that injects `/guessing.css` and `/guessing.js` into the page, so the guessing assets never reached the browser even though they were present in the deployment.

## Fix
`wrangler.jsonc` now sets:

```json
"assets": {
  "directory": "./web",
  "binding": "ASSETS",
  "run_worker_first": true
}
```

This makes the Worker execute before static assets so the existing HTMLRewriter injection can attach the v2.2 guessing UI while still serving assets through `env.ASSETS`.

## Expected hosted behavior after rebuild
- completed matchup cards show `Which Harry Man Submitted...` for both songs;
- each song shows a dropdown of the nine official participants;
- Test Voter is not a guess option;
- after all currently available guess dropdowns in the selected round are filled, `Submit your Guesses` appears;
- submitted guesses persist through the Durable Object and Git mirror;
- the normal `All votes submitted for this round.` popup remains a useful transition point into the guessing phase.

## No data-model change
This hotfix does not change vote records, guess records, participant identity, Durable Object migrations, or Git mirror paths. It only changes Cloudflare asset routing so the already-deployed guessing frontend is actually injected.
