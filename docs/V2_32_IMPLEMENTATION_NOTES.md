# V2.32 Implementation Notes

Scope is limited to `feature/v2-auth-voting`; production `main` is untouched.

## Fixed
- Harry Man guesses are round-scoped for R64 onward (`round:song_id`) so an advancing Play-In song cannot inherit/lock its prior-round dropdown.
- Compact published-results cards use the screenshot-3 layout for authenticated voters and Test Voter.
- Test simulation is one production-aware workflow: preserve available production submissions, simulate only missing ballots, simulate all if the round has no production submissions.
- Test preview mode and voter mode are stored per round in session storage; refresh preserves Test Voter's selected view unless authoritative results are published.
- Publication controls now support submitted-voter status, publish/unpublish results, and publish/unpublish next-round matchups.
- View-results preview uses the same compact result layout vocabulary as published results.
- Existing V3 standalone simulation controls are superseded in V2.32.

## Safety
- V2 test Worker remains pointed at `feature/v2-auth-voting` for Git mirrors.
- Production `main` is not modified.
- Play-In guess storage remains backwards compatible with legacy song-ID keys.
- A client patch guard fails closed if expected round-safe voting/publication patches are missing from the served `guessing.js`.
