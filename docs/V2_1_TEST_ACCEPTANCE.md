# HMPP 2026 v2.1 — Hosted Acceptance Record

## Environment
- Cloudflare Worker: pied-piper-tournament-of-champions-v2-test
- Git branch: feature/v2-auth-voting
- Test identity: Test Voter / test-voter
- Test vote pool: test

## Completed v2 backend acceptance
PASS — TEST MODE banner appears.
PASS — Test Voter authenticates with the configured test email.
PASS — Spotify Open in Spotify action marks listening requirement met.
PASS — YouTube embedded playback marks listening requirement met.
PASS — both songs must be listened to before vote buttons unlock.
PASS — Cancel allows a different choice and records no vote.
PASS — Submit persists the selected song and locks the matchup.
PASS — browser refresh restores the submitted vote from the backend.
PASS — round navigation works and future rounds display Coming Soon.
PASS — logout performs a forced Git sync and returns to login.
PASS — GitHub generated data/2026/test-votes/by-participant/test-voter.json.
PASS — generated JSON match IDs and selected song IDs matched the submitted tests.
PASS — test records remain segregated from official vote totals.

## GitHub token configuration validated
Fine-grained token scope:
- one repository: natejeez/Pied-Piper-Tournament-of-Champions;
- Contents: Read and write;
- Metadata: Read-only (required);
- expiration: December 8, 2026.

The token value is not stored in repository documentation. It is stored as the Cloudflare GITHUB_TOKEN secret.

## v2.1 retest focus
After the UI-only v2.1 deployment, repeat:
1. one Spotify + YouTube listening-gate matchup;
2. Cancel once;
3. Submit once;
4. verify compact completed-match UI;
5. refresh and verify restored checkmark state;
6. logout and verify cleared login fields;
7. log in again and verify only that participant's vote state appears;
8. confirm Git mirror still updates.
