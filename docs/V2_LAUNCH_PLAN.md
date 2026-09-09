# HMPP 2026 v2 — Low-Noise Launch Plan

## Purpose
Deploy and test v2 without overwriting the current production version until the new build is proven.

## Test account
- Display name: `Test Voter`
- Participant ID: `test-voter`
- Login email: `hmpp-test@example.com`
- SHA-256: `cbdb1ce947fbdf44bbf67e349af5344aad0941346c999e88b3ba41c004721784`
- Vote pool: `test`
- Git mirror path: `data/2026/test-votes/by-participant/test-voter.json`

Every test vote receives a `vote_submission_id` beginning with `TESTVOTE-`. Test records contain `excluded_from_official_totals: true` and never write to the official `data/2026/votes/...` path.

## A. ChatGPT project context
1. Keep the existing 2026 ruleset as the rules authority.
2. Upload the new v2 documentation files from `docs/` to the ChatGPT project.
3. Upload `README_V2.md` as the current build snapshot.
4. Do **not** upload or store `HMPP_PARTICIPANT_AUTH_SECRET.json` as normal project documentation; treat it as a deployment secret.
5. For later changes, tell ChatGPT to use this v2 package as the starting point and increment the archive name (`hmpp_v3.index.html`, etc.).

## B. GitHub — version without replacing production
1. Create a branch from current production, recommended: `feature/v2-auth-voting`.
2. Upload this package's files to that branch, preserving paths.
3. Keep the current production HTML archived. This package includes `web/versions/hmpp_v2.index.html`.
4. Commit with: `Add HMPP v2 authenticated test-gated voting`.
5. Do not merge to the production branch yet.
6. Confirm the branch contains `src/worker.js`, `wrangler.jsonc`, `web/index.html`, `web/versions/hmpp_v2.index.html`, and `web/data/2026/*`.
7. Never commit `HMPP_PARTICIPANT_AUTH_SECRET.json` or any GitHub token.

## C. Cloudflare — configure and test v2
1. In Workers & Pages, open `pied-piper-tournament-of-champions`.
2. Under Settings > Build > Branch control, keep your existing production branch unchanged. Enable non-production branch builds if desired.
3. Important: this Worker uses a Durable Object. Cloudflare currently states that preview URLs are not generated for Workers implementing Durable Objects. The safest isolated test is therefore a separate Worker/environment (for example `pied-piper-tournament-of-champions-v2-test`) using the v2 branch, rather than promoting the production Worker.
4. Add secrets to the test Worker: `SESSION_SECRET`, `PARTICIPANT_AUTH_JSON`, `GITHUB_TOKEN`.
5. For `PARTICIPANT_AUTH_JSON`, paste the contents of the separately generated secret file.
6. Make sure the GitHub token can write only to this repository.
7. Deploy the test Worker.
8. Log in as Test Voter and submit one vote.
9. Confirm the UI shows a green submitted state and a `TEST MODE` banner.
10. Confirm Git receives `data/2026/test-votes/by-participant/test-voter.json`.
11. Confirm the test vote has a `TESTVOTE-...` submission ID and `excluded_from_official_totals: true`.
12. Only after all tests pass, merge the v2 branch to the production branch / deploy the production Worker.

## D. Public domain
1. Put the domain you want to use into Cloudflare as an active zone.
2. Open Workers & Pages > your production Worker > Settings > Domains & Routes.
3. Select Add > Custom Domain.
4. Recommended hostname: `vote.<your-domain>` or `hmpp.<your-domain>`.
5. Cloudflare will create the needed DNS record and certificate.
6. Do this for the production Worker only after v2 passes testing.
7. Send that custom URL to participants. They only need the website URL plus the email they used for submission.

## E. One test-vote acceptance check
- [ ] Test Voter appears in login dropdown as TEST ACCOUNT
- [ ] `hmpp-test@example.com` authenticates
- [ ] wrong email fails
- [ ] Spotify requires Open in Spotify before listened state
- [ ] YouTube playback marks listened
- [ ] both songs listened unlocks both vote buttons
- [ ] Cancel records nothing
- [ ] Submit returns success
- [ ] selected card turns green
- [ ] refresh restores vote
- [ ] vote has a `TESTVOTE-...` ID
- [ ] test vote writes only to `data/2026/test-votes/...`
- [ ] official vote folder remains unchanged by test account
- [ ] logout forces sync
