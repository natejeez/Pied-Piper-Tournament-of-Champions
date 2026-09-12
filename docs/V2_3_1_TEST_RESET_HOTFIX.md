# HMPP 2026 v2.3.1 — Test Voter reset hotfix

## Hosted issue
The v2.3 Test Voter still loaded previously submitted Play-In votes. Those legacy votes exposed the compatibility Daddy-guess controls, but they were not a clean test of the new atomic matchup workflow.

## Fix
- Added a Test-Voter-only reset endpoint for Play-In and Round of 64.
- Added a visible Test Voter reset control that follows the currently selected supported round.
- Reset removes only Test Voter votes and guesses for that round; official participant records are untouched.
- Reset performs an immediate Git mirror flush.
- A one-time v2.3.1 Test Voter reset clears all existing Test Voter votes/guesses on the next session-state load so this deployment starts from a clean slate.
- Browser listening cache for Test Voter is cleared when the manual reset button is used.
- The stale test-voter Git mirror was deleted before retest.

## Publication controls
The four publication controls on Round of 64 are intentionally disabled while official Play-In voting is incomplete. Test Voter is excluded from completeness calculations. With 9 official participants and 8 Play-In matchups, the controls require 72/72 official votes before results can be previewed or published. Advancement preview/publication also requires no tied Play-In matchup.

A helper note and disabled-button tooltip now make this gating explicit in Dev Mode.

## Regression focus
Retest in this order:
1. Login as Test Voter and confirm Play-In loads with no submitted Test Voter selections.
2. Listen to both songs in one Play-In matchup.
3. Pick a song; confirm both Daddy-guess dropdowns open and are interactive.
4. Select both guesses and submit the matchup once.
5. Confirm the vote + both guesses collapse together and survive refresh.
6. Press Reset Test Voting for Play-In; confirm the matchup returns to fresh state after reload.
7. Verify the Test Voter Git mirror contains no Play-In records after reset.
8. On Round of 64, confirm publication buttons remain disabled while the official counter is below 72/72 and the explanatory note is visible.

## Backend boundary
No official participant data is reset by the test endpoint. No publication state is altered by Test Voter round reset.
