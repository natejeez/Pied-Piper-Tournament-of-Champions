# HMPP 2026 v2.8 — Release QA

## Release intent
v2.8 is a participant-readiness pass on the staging branch. It does not publish the tournament to production.

## Five management-review fixes
1. **Login readiness becomes observable.** Test Voter sees configured/total participant login coverage. The API never returns hashes or emails.
2. **External listening is interaction-independent.** Spotify/YouTube external links count on left click, middle click, keyboard activation, and browser focus return. A temporary local pending record prevents a fast external launch from racing session lookup.
3. **Logout clears draft presentation safely.** A logged-in-to-logged-out transition forces a reload so unfinished visual state cannot leak into another account.
4. **Reset behavior is clearer and faster to reason about.** Reset-for-user only shows the participant selector when needed; Reset All reports accounts checked, accounts changed, Git sync count, and elapsed time.
5. **Real-participant parity is tested explicitly.** Static regression checks verify participant-facing selection, guess display, external launch handling, and admin-only reset/auth controls. A separate auth validator verifies every public participant has a secret entry without committing the secret.

## Reset semantics
Reset deletes the selected round's current vote and guess records from the targeted Durable Object(s). It does not create replacement records at reset time. If that participant votes again, the new submission receives new unique vote/guess/matchup submission IDs.

The Git mirror is a current-state snapshot. After a changed account is reset, its participant JSON is rewritten with that round's records absent. Historical pre-reset content remains recoverable through Git commit history. Unchanged accounts do not receive a no-op Git sync in v2.7+.

Paths:
- Test Voter: `data/2026/test-votes/by-participant/test-voter.json`
- Real participant: `data/2026/votes/by-participant/<participant-id>.json`
- Reset Test Only: affects Test Voter snapshot only.
- Reset for User: affects only the selected participant's snapshot.
- Reset All Users: checks all 10 identities; only identities whose data changed are flushed to Git.

Listening progress is browser-local. The admin can clear Test Voter listening state on the browser performing the reset. A remote real participant's browser-local listening cache cannot be erased remotely by the server; their submitted vote/guess state is reset server-side.

## Auth configuration
Participant email hashes stay in Cloudflare secret `PARTICIPANT_AUTH_JSON`; they must never be committed to Git.

Validate a candidate secret locally:

```bash
node scripts/validate-participant-auth.mjs web/data/2026/participants/public.json /path/to/HMPP_PARTICIPANT_AUTH_SECRET.json
```

Expected: `Participant auth coverage: 10/10`.
