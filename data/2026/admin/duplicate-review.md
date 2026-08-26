# 2026 Duplicate / Version Review — Initial Intake

## Intake snapshot

- 9 participant records
- 72 submission records
- 8 slots per participant
- Submission IDs `SUB26-001` through `SUB26-072`
- All records initially marked `pending_review`
- Submission order is chronological by the supplied form timestamps; this order is the basis for first-valid-submission precedence under the 2026 ruleset.

## Initial automated checks

### Exact Spotify track ID duplicates

**No exact duplicate Spotify track IDs were found among the supplied Spotify links.**

### Exact normalized artist/title duplicates

**No exact artist/title duplicates were found among submissions with supplied titles.**

This is an intake check, not the final duplicate decision, because the ruleset distinguishes the underlying composition from the specific recording/version.

### Composition/version review

No obvious same-composition conflict was identified from the submitted artist/title information.

Known cover/version entries that should remain explicitly represented as recordings:

- `SUB26-029` — Tom Petty / Prince, `While My Guitar Gently Weeps (cover)`
- `SUB26-065` — Midge Ure, `The Man Who Sold The World`

These are not rejected merely because the underlying composition is a cover. The 2026 rules require the submitted recording/version to be evaluated.

## Items requiring administrator review

### `SUB26-019` — Jack O Connell

The participant supplied an artist and Spotify URL but **no song title**. The supplied Spotify URL could not be resolved by the external lookup used during intake. This record is therefore explicitly flagged `missing_title;unresolved_spotify_link` and should not be treated as validated until the title/recording is recovered.

### `SUB26-057` through `SUB26-064` — Danny McGees

All eight entries have artist/title information but **no link** in the submitted data. They remain in the administrative record and are flagged `missing_link`. The missing link does not by itself establish a duplicate, but the actual recording/version still needs to be identified before final validation and Spotify embedding.

## External metadata note

The Spotify track ID supplied for Olivia Rodrigo's `Stupid Song` is independently associated with that title in current web results. citeturn0search1turn0search3

The supplied Spotify URL for `SUB26-019` returned a not-found response during lookup, so its metadata should not be guessed. citeturn1search0

## Decision policy

Until review is complete, **do not mark all 72 entries as valid**. The correct state is that the 72 raw submissions have been imported and normalized, with duplicate/version review pending.

If a later submission is determined to duplicate an earlier valid composition/recording under the 2026 rules, the later `submission_id` remains in this dataset, receives `status=rejected_duplicate`, and gets `duplicate_of_submission_id` populated. Any replacement gets a new submission ID and `replacement_for_submission_id` pointing to the rejected record.
