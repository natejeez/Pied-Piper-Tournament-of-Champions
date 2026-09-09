# HMPP 2026 v2.1 — Deployment Notes

## Scope
v2.1 is a frontend UI/state-management update only.

Unchanged:
- src/worker.js;
- wrangler.jsonc;
- web/data/2026/media.json;
- web/data/2026/matches.json;
- web/data/2026/participants/public.json;
- Durable Object schema and migration;
- authentication secret shape;
- Git vote mirror paths.

Changed:
- web/index.html;
- new archive web/versions/hmpp_v2_1.index.html;
- new versioned documentation.

## Test Worker
The feature branch remains configured for:
- Worker: pied-piper-tournament-of-champions-v2-test
- production branch for that Worker: feature/v2-auth-voting
- Git mirror branch: feature/v2-auth-voting

A push to the feature branch should trigger the test Worker deployment. No new Durable Object migration is introduced by v2.1.

## Required secrets already validated on test Worker
- SESSION_SECRET
- PARTICIPANT_AUTH_JSON
- GITHUB_TOKEN

GitHub token permissions:
- repository scope: natejeez/Pied-Piper-Tournament-of-Champions only;
- Contents: Read and write;
- Metadata: Read-only;
- expires December 8, 2026.

Rotate the token before expiration and update the Cloudflare GITHUB_TOKEN secret. Never commit the token value.

## Production release path
Do not merge the test wrangler.jsonc to main unchanged.

After v2.1 passes staging:
1. create release/v2.1-production from feature/v2-auth-voting;
2. in wrangler.jsonc change name from pied-piper-tournament-of-champions-v2-test to pied-piper-tournament-of-champions;
3. change GITHUB_BRANCH from feature/v2-auth-voting to main;
4. leave main, assets, Durable Object binding, and migration configuration intact;
5. verify the production Worker has SESSION_SECRET, PARTICIPANT_AUTH_JSON, and GITHUB_TOKEN secrets;
6. merge the release branch to main;
7. allow the production Worker to run npx wrangler deploy;
8. smoke-test workers.dev before attaching or advertising the custom domain.

## Rollback
The original v2 frontend remains archived at web/versions/hmpp_v2.index.html. The approved v2.1 candidate is archived separately at web/versions/hmpp_v2_1.index.html.
