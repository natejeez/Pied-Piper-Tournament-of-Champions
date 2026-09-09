# HMPP 2026 v2 — Deployment Notes

## What changed

This version keeps the existing Spotify/YouTube media mapping and adds authenticated, participant-linked voting.

- Spotify counts as listened only when the voter clicks **Open in Spotify**.
- YouTube counts as listened when the embedded player reports a `PLAYING` state.
- Both songs in a matchup must satisfy the listening gate before either vote button activates.
- A vote requires explicit Submit confirmation.
- Confirmed votes are immutable per participant/matchup and are stored immediately in a Cloudflare Durable Object.
- The Durable Object resets a five-minute alarm after each vote. When the alarm fires, that participant's vote snapshot is mirrored to GitHub.
- Logging out forces an immediate GitHub mirror before the session is closed.
- The browser keeps only listening-completion UI state; it is not the authoritative vote store.

## Repository files

```text
src/worker.js
wrangler.jsonc
web/index.html
web/versions/hmpp_v2.index.html
web/data/2026/media.json
web/data/2026/matches.json
web/data/2026/participants/public.json
```

Vote snapshots are created at runtime under:

```text
data/2026/votes/by-participant/<participant_id>.json
```

No email addresses are written to those vote files.

## Required Cloudflare secrets

Set these with Wrangler. Do not commit their values to Git.

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put PARTICIPANT_AUTH_JSON
npx wrangler secret put GITHUB_TOKEN
```

`SESSION_SECRET` should be a long random value.

`PARTICIPANT_AUTH_JSON` contains only SHA-256 hashes of normalized participant emails. A ready-to-paste secret file was generated separately from the GitHub-ready package as `HMPP_PARTICIPANT_AUTH_SECRET.json`; do **not** add that file to the repository.

`GITHUB_TOKEN` needs permission to read/write repository contents for the HMPP repository. Prefer a fine-grained token scoped only to this repository.

## Public participant list

The first-login dropdown is sourced from the Git-tracked file:

```text
web/data/2026/participants/public.json
```

This file contains display names and stable participant IDs only. It intentionally contains no emails and no participant-to-song ownership.

## Important authentication note

Using a participant's email address as a password is convenient but is not strong authentication. This implementation honors the requested flow while keeping the email verifier server-side as a one-way hash. For a future tournament, replace this with a one-time code or magic-link login.

## Deploy

1. Archive the current production `web/index.html` if it is not already archived.
2. Copy this package into the repository root.
3. Set the three required secrets.
4. Commit on the feature branch.
5. Run or allow the Cloudflare Git build.
6. Test login, listening gates, vote cancellation, vote submission, refresh, five-minute mirror, logout flush, and cross-device restore.
7. Promote only after the smoke test passes.

Suggested commit:

```text
Deploy HMPP v2 authenticated listening-gated voting
```

## Built-in test account

Public participant list includes `Test Voter` (`test-voter`). Its login email is `hmpp-test@example.com`; the private auth secret contains SHA-256 `cbdb1ce947fbdf44bbf67e349af5344aad0941346c999e88b3ba41c004721784`.

Test votes are hard-separated from official vote mirrors:

```text
data/2026/test-votes/by-participant/test-voter.json
```

Each test vote receives a `TESTVOTE-...` `vote_submission_id`, `vote_pool: "test"`, and `excluded_from_official_totals: true`. The official mirror path is never used by the test account.
