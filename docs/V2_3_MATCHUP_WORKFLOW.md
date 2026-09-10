# HMPP 2026 v2.3 — Atomic Matchup Workflow

## Product change
A matchup is now one smooth transaction. The participant listens to both songs, chooses the song they prefer, guesses the submitter for both songs, then presses **Submit Matchup**. The head-to-head vote and both submitter guesses are written together.

There is no round-level **Submit your Guesses** button.

## Data model
Each new atomic submission shares a `matchup_submission_id` across the vote and both guess records. Guess records also retain `match_vote_submission_id` and `match_vote_song_id_at_submission`, preserving the link needed for later analytics.

Participant audit mirrors advance to schema version 4 and continue to separate `votes` and `guesses`. Test Voter remains excluded from official totals and guess statistics.

## Legacy test data
Previously submitted matchup votes without guesses are not deleted. They render as legacy incomplete matchups that allow both guesses to be added against the already-locked vote. New matchups always use the atomic workflow.
