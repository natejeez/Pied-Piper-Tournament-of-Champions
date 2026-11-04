# HMPP 2026 — Current Project Context

## Status
HMPP 2026 is deployed on Cloudflare. The existing Durable Objects remain the vote source until the D1 database is provisioned and live state is migrated. The Worker no longer mirrors runtime vote or publication data to GitHub. See `D1_MIGRATION.md` for the gated cutover checklist.

## Production runtime
- Branch: `main`
- Worker: `pied-piper-tournament-of-champions`
- Static app: `web/index.html`
- Configured Worker entrypoint: `src/worker-v213-prod.js`
- Durable Object class: `ParticipantVoteStore`
- Target vote database: Cloudflare D1 binding `VOTES_DB` (not provisioned/configured yet)

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
The target D1 schema stores one vote and its two guesses together in one matchup row with a unique `(participant_id, match_id)` key. Retries with identical choices are idempotent; competing choices for the same participant/match return a conflict. Production continues to read/write Durable Objects until the controlled migration and backend switch are complete.

Participant/admin source data and vote snapshots are ignored by Git. Existing Git history may still expose previously committed records; history cleanup and any participant notification require a coordinated response.

## Test Voter admin workflow
Test Voter receives:
- DEV MODE song IDs;
- participant-login readiness status;
- Reset Round Data controls;
- result preview/publication controls;
- next-round preview/publication controls.

Reset scopes are Test Only, selected User, and All Users. During the D1 cutover these delete the selected participant/round matchup rows. A later re-vote creates new submission IDs.

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
