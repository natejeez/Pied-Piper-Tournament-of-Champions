# V2.32 R64 End-to-End QA Checklist

1. Deploy `feature/v2-auth-voting` to the V2 test Worker.
2. Log in as Test Voter.
3. Publish/preview the R64 matchups.
4. Open an R64 matchup containing a Play-In winner.
5. Listen to both songs until the voting buttons are enabled.
6. Select either song.
7. Confirm both Harry Man dropdowns begin blank and enabled.
8. Select a Harry Man for the first song.
9. Select a Harry Man for the second song.
10. Confirm `Submit Matchup` enables only after the song and both guesses are chosen.
11. Open the confirmation modal and submit.
12. Refresh the page.
13. Confirm the submitted matchup remains submitted and both R64 guesses are restored for that round.
14. Confirm a Play-In guess for the same advancing song does not appear in or lock an R64 dropdown.
15. Log out and back in; confirm the same submitted R64 state persists.

Regression test: `node tests/v32-round64-regression.mjs`
