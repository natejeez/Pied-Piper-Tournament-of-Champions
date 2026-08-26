# 2026 Tournament Data Schema

This schema is designed around the 2026 ruleset's separation of **participant**, **submission**, **song/composition**, **recording/version**, **Spotify track**, **match**, and **vote** concepts.

## Design goals

The data model must support both the tournament itself and future historical/statistical analysis. In particular, it must allow us to answer questions such as:

- Who submitted a song?
- What songs did each participant submit?
- Which songs/recordings advanced furthest?
- How did an individual participant's submissions perform collectively?
- Which artists/compositions/recordings appeared across tournament years?
- What reasons did participants give for submitting songs?
- Which participant was best at predicting match winners?
- What was each participant's winner-pick rate, broken down by round, matchup, or tournament?
- Can the complete history of a song, submission, matchup, and vote be reconstructed after the tournament?

These goals require preserving the original submission evidence and maintaining stable relationships rather than relying on presentation-layer data.

## ID conventions

IDs are stable, human-readable administrative IDs. They are not derived from Spotify IDs and should never be reused.

| Entity | Format | Example | Meaning |
|---|---|---|---|
| Tournament | `HMPP-YYYY` | `HMPP-2026` | One tournament year |
| Participant | `PYY-NN` | `P26-01` | Participant within the tournament |
| Submission | `SUBYY-NNN` | `SUB26-001` | One submitted slot; remains historical even if rejected |
| Song/composition | `SONGYY-NNN` | `SONG26-001` | Underlying musical work |
| Recording/version | `RECYY-NNN` | `REC26-001` | Specific recording/version submitted |
| Match | `MATCHYY-NNN` | `MATCH26-001` | One matchup |
| Vote | `VOTEYY-NNN` | `VOTE26-001` | One retained vote/pick record |

## Entity relationships

The core relationship is:

`Participant → Submission → Recording → Song/Composition`

A submission also references its source metadata, such as a Spotify track ID or YouTube URL.

A match references **submissions**, not merely songs or artists. This is important because the tournament contest is between specific submitted recordings and because a composition may have multiple eligible recordings.

A vote references a **match** and the **submission selected by the voter**. This permits prediction statistics without changing the authoritative match result.

## Important distinction

`submission_id` is the immutable record of **who submitted what and when**.

`song_id` identifies the underlying composition. Two recordings of the same composition may therefore share a `song_id` if they are eventually determined to be the same composition, while having different `recording_id` values.

`recording_id` identifies the actual performance/version entered into the tournament. This is the key object for the ruleset's substantially-different-recording and cover analysis.

`spotify_track_id` is an external identifier and is never used as the tournament's primary key.

## Submission lifecycle

Recommended status values:

- `pending_review`
- `valid`
- `rejected_duplicate`
- `rejected_invalid`
- `replacement_pending`
- `replaced`
- `withdrawn`

A rejected submission is retained. A replacement receives a new `submission_id` and points back to the original with `replacement_for_submission_id`.

## Duplicate review fields

Each submission should retain:

- `status`
- `duplicate_of_submission_id`
- `replacement_for_submission_id`
- `duplicate_review_status`
- `duplicate_review_notes`
- `reviewed_at`
- `reviewed_by`

Do not silently merge or delete duplicate records.

## Normalization fields

For automated duplicate detection and statistical grouping, maintain normalized values separately from display values:

- `artist_normalized`
- `title_normalized`
- `composition_key`
- `recording_key`
- `spotify_track_id`
- `source_url`

The display artist/title should preserve the participant's original submission wording. Normalized values are for matching, aggregation, and analysis.

### Why artist/title are first-class fields

Artist and title must be stored independently rather than treated as an opaque submission string. This enables future statistics such as:

- most-submitted artists
- artists with the most tournament wins
- artists with the highest average advancement
- participant preferences by artist/genre/era, if metadata is later enriched
- repeat artists across years
- song-title/composition frequency

## Submission rationale

`rationale` is a first-class historical field and must be retained verbatim from the participant's submission whenever possible.

It should not be discarded after validation. The rationale can later support features such as:

- participant submission galleries
- tournament commentary
- "why this song was picked" displays
- thematic analysis
- fun retrospective statistics

The raw rationale should remain separate from any future administrator/editorial interpretation.

## Participant mapping

Every submission must contain `participant_id` and every participant must have a stable record in `participants.csv`.

This means all future performance statistics can be calculated by joining:

`participant_id → submission_id → match_id → result`

No statistic should depend on display names being unique or unchanged.

## Match/result model

A match should reference the two competing submissions:

- `match_id`
- `tournament_id`
- `round`
- `bracket_position`
- `submission_a_id`
- `submission_b_id`
- `winner_submission_id`
- `status`
- `completed_at`

This allows song performance to be derived without duplicating win/loss statistics into submission records.

Recommended derived statistics include:

- matches played
- wins
- losses
- win percentage
- round reached
- average advancement
- tournament champion
- participant-level aggregate performance

The authoritative result remains the match record; statistics should be calculated from it.

## Vote / winner-prediction model

Votes should retain enough information to distinguish **voting for a matchup winner** from the eventual match result.

Recommended fields:

- `vote_id`
- `match_id`
- `tournament_id`
- `voter_participant_id` (nullable if anonymous/non-participant voting is allowed)
- `picked_submission_id`
- `actual_winner_submission_id` (populated after the match is finalized, or derived by join)
- `is_correct`
- `submitted_at`
- `round`

This supports future statistics such as:

- participant winner-pick rate
- correct picks / total picks
- winner-pick rate by round
- winner-pick rate on another participant's songs
- upset prediction rate
- best predictor by tournament
- best predictor across tournament history

`is_correct` should be treated as a derived/auditable value based on `picked_submission_id == winner_submission_id`; it should never override the authoritative match result.

## Song performance model

Do not permanently store a single `wins` or `losses` number on the song itself. Those values can become stale.

Instead, calculate performance from match records using the chain:

`submission_id → match records → winners → round reached`

A future analytics layer can materialize statistics such as:

- `matches_played`
- `wins`
- `losses`
- `win_rate`
- `highest_round`
- `championship_winner`
- `play_in_winner`

This keeps the historical data normalized while making the website free to display rich statistics.

## Recommended files

```text
docs/
  data-schema-2026.md
  rules/
    Harry_Men_Pied_Piper_2026_Ruleset.md

data/
  2026/
    admin/
      participants.csv
      submissions.csv
      duplicate-review.csv
      audit-log.csv
      submissions/
        P26-01.csv ... P26-09.csv
    public/
      participants.csv
      submissions.csv
      songs.csv
      recordings.csv
    bracket/
      matches.csv
      bracket-positions.csv
    votes/
      votes.csv
```

The `admin` layer may contain private information such as email addresses. The `public` layer should contain only information intended for the website.

## Submission schema

Core fields:

- `submission_id`
- `tournament_id`
- `participant_id`
- `submission_slot`
- `submitted_at`
- `status`
- `song_id`
- `recording_id`
- `artist`
- `title`
- `artist_normalized`
- `title_normalized`
- `composition_key`
- `recording_key`
- `source_url`
- `source_type`
- `spotify_track_id`
- `rationale`
- `duplicate_of_submission_id`
- `replacement_for_submission_id`
- `metadata_status`
- `review_flags`

## Raw-vs-enriched data principle

The raw submission should be preserved as submitted. Cleaning, metadata enrichment, duplicate decisions, and replacement decisions should be represented as additional fields or linked records rather than overwriting the original evidence.

When a participant initially omits a title but later supplies it, retain the fact that it was supplied later in the audit/review metadata rather than pretending it was present in the original intake.

## 2026 intake status

The first imported dataset contains 72 submission slots from 9 participants. All nine participant records contain exactly eight submission slots, satisfying the raw intake count requirement.

The dataset is **not considered tournament-ready until duplicate/version review is complete** and any rejected duplicate has been replaced with a valid submission.

Current known issue: Danny McGees' Song 1 and Song 2 were supplied with the **same Spotify track ID** despite different titles. This is explicitly flagged for duplicate review and should not be silently treated as two valid songs.

Jack O Connell's previously missing title has now been supplied as **The Rocky Road to Dublin** and is retained as the administrative correction to the incomplete intake record.

## Future analytics

The schema intentionally leaves room for a separate analytics/materialized layer. It should be possible to generate historical leaderboards without changing the underlying tournament records.

Potential future dashboards include:

- Participant performance
- Submission performance
- Artist performance
- Song/composition performance
- Bracket progression
- Play-in performance
- Voting accuracy
- Best winner picker
- Most accurate picker by round
- Upset prediction leaderboard
- Historical participant records

These should all be derived from the authoritative participant, submission, match, and vote records.

## Audit principle

The tournament database should be capable of reconstructing the full history of any entry:

`participant → original submission → rationale → normalized metadata → duplicate review → replacement (if any) → bracket placement → matches → votes → result → final advancement`

That chain is the foundation for both tournament integrity and future fun/statistical features.
