# HMPP 2026 v2.2 — Submitter Guessing Test Plan

## Static checks completed before commit
- existing Worker source was used as the backend base;
- Worker JavaScript parses with Node;
- new guessing JavaScript parses with Node;
- no Durable Object migration change is required;
- existing 40-matchup bracket HTML is left unchanged;
- existing 8 Play-In / 32 Round-of-64 structure is left unchanged;
- guessing records are separate from head-to-head votes;
- Git mirror schema advances to version 3 with both `votes` and `guesses`.

## Hosted acceptance test
Use Test Voter on `pied-piper-tournament-of-champions-v2-test`.

1. Log in and confirm prior match votes restore normally.
2. On an already-voted matchup, confirm both cards show `Which Harry Man Submitted...`.
3. Confirm each dropdown contains the nine official participants and does not contain Test Voter.
4. Confirm the instruction appears below `Listen to both songs...`.
5. Select only one dropdown and confirm `Submit your Guesses` stays hidden.
6. Complete every currently available unsaved guess dropdown in the selected round and confirm the submit action appears.
7. Submit guesses and confirm each dropdown locks with `✓ Guess saved`.
8. Refresh and confirm the saved guesses restore.
9. Log out and confirm the Git test-voter JSON updates.
10. Verify JSON schema version 3 contains separate `votes` and `guesses` objects.
11. Verify each guess contains song, match, round, guessed participant, head-to-head vote linkage, IDs, timestamp, and test-exclusion metadata.
12. Confirm attempts to guess before voting on a matchup are rejected by the backend.
13. Confirm changing a submitted guess is rejected.
14. Confirm normal match voting remains unchanged.

## Visual review
Pay particular attention to:
- dropdown readability on the subdued losing song card;
- winner checkmark placement after guess controls expand the card;
- mobile dropdown spacing;
- fixed `Submit your Guesses` bar not blocking important content.
