# HMPP 2026 v2.2 — Submitter Guessing Architecture

## Product decision
Submitter guessing opens immediately after an authenticated participant submits their head-to-head vote for a matchup. It no longer waits for the next round to be published.

## User flow
1. Listen to both songs.
2. Submit one matchup vote.
3. The completed matchup collapses to the compact winner/loser state.
4. Each song card adds `Which Harry Man Submitted...` above the title and artist.
5. The participant selects one of the nine official Harry Men from each dropdown.
6. When every currently available unsaved guess dropdown in the selected round has a value, a visible `Submit your Guesses` action appears.
7. Submitted guesses become durable and restore on refresh/login.

## Public anonymity
The public frontend receives only participant display names/IDs needed as guess choices. It does not receive song ownership. Test Voter is excluded from the guessing list.

Correct ownership remains administrative and is joined later for analytics/reveal.

## Server validation
The Worker validates:
- authenticated participant;
- match exists and has two active songs;
- round matches the locked match map;
- song belongs to that match;
- guessed participant is one of the nine official participants;
- the guessing participant has already submitted a head-to-head vote for that matchup;
- one immutable guess per participant/song.

## Durable Object storage
Guesses are stored separately from match votes under a `guesses` object keyed by song ID.

Each guess records:
- `guess_submission_id`
- `guess_batch_id`
- `match_id`
- `round`
- `song_id`
- `guessed_participant_id`
- `match_vote_song_id_at_submission`
- `match_vote_submission_id`
- `submitted_at`
- `guess_pool`
- `excluded_from_official_guess_stats`

The enclosing participant Durable Object/file identifies who made the guess.

## Git audit mirror
Participant JSON advances to schema version 3 and contains both:

```json
{
  "votes": {},
  "guesses": {}
}
```

Test Voter continues to write only to `data/2026/test-votes/by-participant/test-voter.json` and is tagged out of official vote and guess statistics.

## Frontend packaging
v2.2 keeps the validated v2.1.1 `web/index.html` intact and adds modular assets:
- `web/guessing.js`
- `web/guessing.css`

The Cloudflare Worker injects these assets into the live `/` and `/index.html` responses. This isolates the new experimental guessing UI from the staging-approved core bracket while we test it.

## Future analytics
See `docs/ANALYTICS_ROADMAP.md`.
