# HMPP 2026 v2.3 — Regression / Test Report

## Static regression checks
- Worker JavaScript syntax parses successfully.
- Frontend workflow JavaScript syntax parses successfully.
- Existing bracket HTML remains unchanged.
- 40 existing match cards remain in `web/index.html`.
- 8 Play-In matchups remain.
- 32 Round-of-64 slots remain.
- No Durable Object migration change is required.
- Round-level `Submit your Guesses` UI/logic is removed from the injected frontend.
- New public vote endpoint is blocked from creating partial song-only submissions.
- Atomic `/api/matchup-submission` validates one song vote plus exactly two submitter guesses.
- Test Voter one-time Round-1 reset removes only Round-of-64 test votes/guesses and preserves Play-In history.
- Publication APIs require the Test Voter session.
- Official result aggregation excludes Test Voter.

## Local durable-state unit checks
PASS — atomic vote + two guesses are stored together.
PASS — vote and both guesses share one `matchup_submission_id`.
PASS — five-minute debounce alarm is set.
PASS — changing a submitted song vote returns 409.
PASS — changing a submitted submitter guess returns 409.
PASS — one-time Test Voter Round-of-64 reset preserves Play-In records.
PASS — administrator tournament-state storage works.

## Hosted checks required
1. Test Voter login shows DEV MODE and song IDs.
2. Existing Play-In votes without guesses allow legacy guess completion.
3. Fresh Round-of-64 test flow does not submit after merely choosing a song.
4. Two submitter dropdowns appear after song choice.
5. Submit Matchup remains disabled until both guesses are selected.
6. Submit confirmation writes vote + two guesses and then collapses the matchup.
7. Refresh restores the completed matchup.
8. Logout Git sync writes schema v4 with linked vote/guess records.
9. Test Voter Round of 64 is fresh after the one-time reset.
10. Round of 64 remains hidden from normal users until published.
11. Dev result controls remain disabled until all nine official participants complete Play-Ins.
12. Once complete, View Results shows vote counts and bold winners.
13. Show Results makes Play-In totals visible to normal users.
14. View New Matchups resolves the eight Play-In winner slots for Test Voter only.
15. Publish New Matchups exposes the resolved Round of 64 to normal users.

## Browser-test note
The automated browser mock did not complete reliably in the local environment, so this report does not claim hosted/browser acceptance for v2.3. Cloudflare staging remains the authoritative UI regression check.
