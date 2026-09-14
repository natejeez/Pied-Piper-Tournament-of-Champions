# HMPP 2026 — Current Project Context

## Status
HMPP 2026 is in production on v2.9. The authenticated participant workflow has passed hosted testing for login, listening gates, song selection, submitter guessing, atomic matchup submission, submitted-state restoration, Test Voter isolation, scoped resets, and pre-completion publication gating.

## Production runtime
- Branch: `main`
- Worker: `pied-piper-tournament-of-champions`
- Git mirror branch: `main`
- Static app: `web/index.html`
- Production entrypoint: `src/worker-v29.js`
- Durable Object class: `ParticipantVoteStore`

Staging remains available on `feature/v2-auth-voting` / `pied-piper-tournament-of-champions-v2-test` for future work.

## Tournament constants
- 9 official participants
- 8 songs per participant
- 72 songs total
- 8 Play-In matchups / 16 Play-In songs
- 8 Play-In winners + 56 direct entries = 64-song main bracket
- Round of 64 has 32 matchups
- Test Voter is excluded from official totals and official guess statistics

## Voting workflow
Both songs must satisfy the listening requirement before voting unlocks. External Spotify and YouTube launches count as listened; embedded YouTube playback also counts when the player reports PLAYING.

After listening, the participant chooses a preferred song, guesses the submitter of both entries, and submits the entire matchup in one atomic request. Nothing is durably recorded until final Submit Matchup succeeds.

Submitted matchups restore from server state and display the participant's two submitter guesses as text. Unsubmitted selections and guesses are participant-scoped browser drafts; they restore after refresh/login but remain non-authoritative.

## Data model
Official participant snapshots:
`data/2026/votes/by-participant/<participant-id>.json`

Test Voter snapshot:
`data/2026/test-votes/by-participant/test-voter.json`

Each submitted matchup links one vote and two guesses through a shared `matchup_submission_id`. Test records are explicitly separated and excluded from official statistics.

GitHub is the audit/export mirror. The Durable Object is authoritative at request time. Logout forces a Git flush and aborts logout if the sync fails.

## Test Voter admin workflow
Test Voter receives:
- DEV MODE song IDs;
- participant-login readiness status;
- Reset Round Data controls;
- result preview/publication controls;
- next-round preview/publication controls.

Reset scopes are Test Only, selected User, and All Users. A reset deletes the selected round's current vote/guess records from the targeted Durable Object(s). A later re-vote creates new submission IDs. Git history remains the audit trail.

## Publication state
The Play-In publication workflow is intentionally locked until 72 official Play-In votes exist. Test Voter does not count.

Once complete, the intended order is:
1. preview previous-round results privately;
2. optionally publish previous-round results;
3. preview Round-of-64 matchups with Play-In winners inserted into locked slots;
4. publish Round of 64.

Round-of-64 slot wiring is authoritative. Do not invent Round-of-32 or later mappings until those mappings are added to tournament data.

## Known accepted behavior
A brief first-paint/layout flash can still occur during some refresh/logout paths. It was accepted for v2.9 because it does not expose another participant's authenticated state and does not alter data.

## Immediate next operational milestone
Wait for all nine official participants to complete all eight Play-Ins, then validate the publication workflow against live complete results. After that, extend later-round bracket wiring and analytics.
