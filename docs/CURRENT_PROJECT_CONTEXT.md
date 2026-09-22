# HMPP 2026 — Current Project Context

## Status
HMPP 2026 production currently runs the authenticated v2 stack. The v2.14 candidate preserves the existing atomic matchup submission workflow and changes logout so that Durable Object persistence remains authoritative even when the GitHub audit mirror is temporarily unavailable.

The v2.14 candidate has passed the repository pre-merge syntax/regression workflow. Hosted staging acceptance is still required before merge to `main`.

## Production runtime
- Branch: `main`
- Worker: `pied-piper-tournament-of-champions`
- Git mirror branch: `main`
- Static app: `web/index.html`
- Candidate production entrypoint: `src/worker-v214-prod.js`
- Durable Object class: `ParticipantVoteStore`

The v2.14 feature branch is `feature/stabilize-ballot-logout`. Existing V2 experimental branches remain historical/reference sources and are not the basis for this stabilization merge.

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

The Durable Object is authoritative at request time. GitHub is the audit/export mirror.

A successful matchup submission schedules the normal Git mirror alarm. Logout now starts an immediate best-effort mirror and clears the participant session without waiting for GitHub. If the immediate mirror fails, the saved Durable Object ballot remains valid and the existing alarm remains available for later mirror retry because `flush` deletes the alarm only after a successful mirror.

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

## Known V2 lessons carried forward
The useful V2 behaviors are being ported selectively rather than merging the V2 branch wholesale.

Do not carry forward:
- layered V31-V37-style Worker patch chains as the final architecture;
- core correctness implemented through runtime source-string patching;
- competing published-result renderers;
- broad DOM MutationObserver repair loops;
- simulated ballots stored in normal participant ballot state.

Round-scoped guess identity is specifically required before later-round voting is generalized. The Play-In compatibility key may remain song-based, but reused songs in later rounds must not collide with prior-round guesses.

## Immediate next operational milestone
1. complete hosted staging acceptance for v2.14 ballot/logout stabilization;
2. merge v2.14 only after the merge gate passes;
3. port the approved compact published-results card as a separate feature/PR;
4. validate the resulting `main` as the stable base before creating the future V4 branch.
