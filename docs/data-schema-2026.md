# 2026 Tournament Data Schema

This schema is designed around the 2026 ruleset's separation of **participant**, **submission**, **song/composition**, **recording/version**, **Spotify track**, **match**, and **vote** concepts.

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
| Vote | `VOTEYY-NNN` | `VOTE26-001` | One retained vote/result record |

### Important distinction

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

For automated duplicate detection, maintain normalized values separately from display values:

- `artist_normalized`
- `title_normalized`
- `composition_key`
- `recording_key`
- `spotify_track_id`
- `source_url`

The display artist/title should preserve the participant's original submission wording until administrative review is complete. Normalized values are for matching and analysis.

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
- `source_url`
- `source_type`
- `spotify_track_id`
- `rationale`
- `duplicate_of_submission_id`
- `replacement_for_submission_id`
- `metadata_status`
- `review_flags`

## Audit principle

The raw submission should be preserved as submitted. Cleaning, metadata enrichment, duplicate decisions, and replacement decisions should be represented as additional fields or linked records rather than overwriting the original evidence.

## 2026 intake status

The first imported dataset contains 72 submissions from 9 participants. All nine participant records contain exactly eight submission slots, satisfying the raw intake count requirement.

Initial import should not be treated as final duplicate validation. Any missing metadata or unresolved version/composition question remains explicitly flagged for review.
