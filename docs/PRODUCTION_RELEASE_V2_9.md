# HMPP 2026 — Production Release v2.9

## Release decision
Promote the authenticated voting build to `main` and the production Cloudflare Worker after staging acceptance of participant voting, submitter guessing, resets, login readiness, listening behavior, and publication gating.

Full publication actions remain intentionally gated until all 9 official participants complete all 8 Play-In matchups (72 official Play-In votes). The controls have been verified to remain unavailable before completion.

## Final production fixes
- Pending matchup drafts now restore on the first refresh. A saved draft itself is proof that both listening requirements had previously been satisfied, so draft hydration re-establishes those two listening states before restoring the selected song and participant guesses.
- Production `wrangler.jsonc` targets `pied-piper-tournament-of-champions` and mirrors Git state to `main`.
- Staging-only official/test vote snapshots used during QA are cleared from the production release snapshot.

## Accepted deferred item
A brief initial-layout flash is substantially reduced but still observable in some refresh/logout paths. It is accepted for this release because it does not expose another participant's authenticated state or alter voting data.

## Production runtime requirements
The production Worker requires these Cloudflare secrets:
- `SESSION_SECRET`
- `PARTICIPANT_AUTH_JSON`
- `GITHUB_TOKEN`

The auth JSON must cover all 10 selectable identities (9 official participants plus Test Voter).
