# HMPP 2026 v2.3 — Staging Acceptance Checklist

Run on the isolated v2 test Worker after Cloudflare deploys this commit.

1. Test Voter login shows DEV MODE and song IDs.
2. Round of 64 contains no prior Test Voter vote/guess state after the one-time reset.
3. On a fresh matchup, listening to both songs unlocks the two song-choice buttons.
4. Clicking a song does not submit anything; it marks the local choice and shows two submitter dropdowns.
5. The final Submit Matchup action remains disabled until both dropdowns have values.
6. Final confirmation submits one song vote and both guesses together.
7. Matchup collapses only after successful server acknowledgement.
8. Refresh restores the completed matchup.
9. Five-minute debounce or logout mirrors schema-v4 vote/guess data to GitHub.
10. Existing Play-In legacy votes without guesses can be completed by adding the two guesses without changing the locked song vote.
11. On Round of 64, Test Voter sees the four publication controls.
12. Before official completion, those controls are visibly disabled and show official progress.
13. Once all nine official participants have completed Play-In votes, View results shows compact totals with the winner bold.
14. Show results publishes Play-In totals/winners for normal authenticated users.
15. View new matchups privately resolves the eight Play-In-winner slots for Test Voter.
16. Publish New Matchups exposes those resolved Round-of-64 matchups to normal users.
17. Normal users cannot call admin publication APIs.
18. Test Voter is excluded from official result counts.
19. Ties block matchup preview/publication.
20. Play-In/R64 bracket structure and existing media/listening behavior remain intact.
