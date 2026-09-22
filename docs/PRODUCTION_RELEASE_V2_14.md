# HMPP 2026 — Production Release v2.14

## Purpose

Stabilize participant logout without changing the authoritative ballot model.

The v2.14 candidate preserves the current atomic matchup submission contract and removes GitHub mirror availability as a requirement for ending an authenticated session.

## Behavior retained

A submitted matchup remains:

- one selected song;
- two Harry Man guesses;
- one shared `matchup_submission_id`;
- one Durable Object-authoritative submission;
- idempotent on identical resubmission;
- immutable without an authorized reset.

The successful V2 behavior is preserved without merging the V2 development branch wholesale.

## Logout change

Before v2.14, `/api/logout` synchronously called the participant `flush` action. A GitHub mirror failure returned HTTP 503 and left the participant logged in even though the ballot was already safely stored in the Durable Object.

v2.14 changes the sequence to:

```text
submitted ballot already durable
        |
        v
logout request
        |
        +--> schedule immediate best-effort Git mirror
        |
        +--> clear authenticated session immediately
```

A failed immediate mirror:

- does not invalidate the ballot;
- does not block logout;
- is logged for observability;
- does not delete the existing mirror alarm, because `flush` deletes that alarm only after a successful Git mirror.

## Runtime files

- canonical base persistence/session logic: `src/worker.js`
- release entrypoint: `src/worker-v214-prod.js`
- Cloudflare configuration: `wrangler.jsonc`
- automated gate: `.github/workflows/pre-merge.yml`
- candidate regression: `tests/v214-ballot-logout-regression.mjs`

Historical v2.13 files remain unchanged.

## Automated acceptance

The PR gate must pass:

```text
node --check src/worker.js
node --check src/worker-v213-prod.js
node --check src/worker-v214-prod.js
node --check web/guessing.js
node tests/v27-participant-regression.mjs
node tests/v28-participant-regression.mjs
node tests/v29-regression.mjs
node tests/v213-production-regression.mjs
node tests/v214-ballot-logout-regression.mjs
```

The v2.14 regression verifies:

- atomic matchup submit succeeds;
- both guesses persist with the vote;
- vote and guesses share `matchup_submission_id`;
- guess records link to the saved vote submission;
- official/test flags remain correct;
- successful submission schedules the Git mirror alarm;
- identical resubmission remains idempotent;
- conflicting resubmission is rejected;
- logout dispatches mirror work with `ctx.waitUntil`;
- logout clears the authenticated cookie without waiting for Git;
- Git failure no longer cancels logout;
- Wrangler points at the v2.14 entrypoint.

## Hosted acceptance required before merge

Automated checks are necessary but not sufficient because Cloudflare Durable Objects, cookies, GitHub mirroring, and cross-browser restoration depend on hosted behavior.

Required staging sequence:

1. log in with an approved test identity;
2. listen to both songs in one matchup;
3. select a song and both Harry Man guesses;
4. submit the matchup once;
5. refresh and confirm the complete submitted state restores;
6. log out normally;
7. log back in or use a second browser and confirm the ballot restores;
8. confirm the Git snapshot updates;
9. deliberately make the Git mirror unavailable in staging;
10. submit a separate test matchup and log out;
11. confirm logout still completes;
12. log back in and confirm the Durable Object ballot is intact;
13. restore mirror access and confirm the snapshot can catch up without changing the ballot.

## Privacy / tournament invariants

Do not merge if any test indicates:

- Test Voter data enters official totals;
- participant ownership becomes public before allowed;
- private authentication material enters repository files;
- the vote and two guesses can become partially submitted;
- a repeated identical submission changes the saved ballot;
- GitHub becomes the request-time authority for participant voting.

## Explicitly deferred

This release does not port the compact published-results card. That is the next separate stabilization feature/PR.

This release also does not generalize later-round guess identity. V2 demonstrated that song-only guess keys collide when a song appears again in Round of 64. Round-scoped guess identity is a required V4 prerequisite and must be implemented directly in the canonical data/client model rather than through runtime string patching.

## Rollback

Rollback target is the pre-v2.14 `main` state using the v2.13 production entrypoint.

Do not merge this release until the automated gate and all applicable hosted acceptance checks are complete.
