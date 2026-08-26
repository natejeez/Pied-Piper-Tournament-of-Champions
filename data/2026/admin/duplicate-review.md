# 2026 Duplicate / Version Review — Initial Intake

## Intake snapshot

- 9 participant records
- 72 raw submission records
- 8 slots per participant
- Submission IDs `SUB26-001` through `SUB26-072`
- All records initially marked `pending_review`
- Submission order is chronological by the supplied form timestamps; this order is the basis for first-valid-submission precedence under the 2026 ruleset.

## Current readiness status

**NOT READY FOR PLAY-IN SEEDING YET.**

The raw intake contains 72 slots, but one known duplicate-recording issue means we do not yet have 72 validated tournament entries.

## Initial automated checks

### Exact Spotify track ID duplicates

A duplicate has now been identified in Danny McGees' supplied links:

- `SUB26-057` — blink-182 — `All the Small Things`
- `SUB26-058` — blink-182 — `I Miss You`
- Both were supplied with Spotify track ID `2m1hi0nfMR9vdGC8UcrnwU`.

Because two submissions reference the exact same external recording identifier, this must be treated as a duplicate-recording review issue. The differing submitted titles do not override the recording identity.

`SUB26-058` should therefore remain `pending_review` until the administrator confirms whether the link was entered incorrectly. If the intended `I Miss You` recording is confirmed to have a different track ID, the record can be corrected. If the supplied link is confirmed as the intended recording, the later submission must be handled under the duplicate rules and receive a replacement window.

### Exact normalized artist/title duplicates

No other exact artist/title duplicates have been identified from the supplied titles in the initial intake.

This is an intake check, not the final duplicate decision, because the ruleset distinguishes the underlying composition from the specific recording/version.

### Composition/version review

No additional obvious same-composition conflict has been identified from the submitted artist/title information.

Known cover/version entries that should remain explicitly represented as recordings:

- `SUB26-029` — Tom Petty / Prince, `While My Guitar Gently Weeps (cover)`
- `SUB26-065` — Midge Ure, `The Man Who Sold The World`

These are not rejected merely because the underlying composition is a cover. The 2026 rules require the submitted recording/version to be evaluated.

## Resolved intake items

### `SUB26-019` — Jack O Connell

The participant has now supplied the missing title as **The Rocky Road to Dublin** and supplied the Spotify URL:

`https://open.spotify.com/track/1esmJ8t2PRbYt2yMx2aSEW`

The record is now complete from the participant-supplied intake perspective. The title was added after the original form intake and is therefore recorded as a metadata correction rather than being represented as if it existed in the original row.

### `SUB26-057` through `SUB26-064` — Danny McGees

All eight entries now have participant-supplied Spotify links. They should proceed through metadata validation using those links.

The important exception is the identical track ID on `SUB26-057` and `SUB26-058`, described above.

## Required action before play-in seeding

We need **72 valid tournament entries** before generating play-in matchups.

The next administrative action is therefore:

1. Verify whether `SUB26-058`'s Spotify link is a data-entry mistake.
2. If it is a mistake, replace it with the correct `I Miss You` recording ID/link and retain the correction in the audit trail.
3. If it is not a mistake and both submissions intentionally point to the same recording, reject the later duplicate under the 2026 rules and open the replacement window for that participant.
4. Validate all remaining recording/version relationships.
5. Only then mark the final 72 entries `valid` and generate play-in/main-bracket seeding.

## Important data principle

The 72 raw submission slots should never be reduced by deletion. Even if one becomes a rejected duplicate, its `submission_id` remains permanently associated with the participant's historical submission record. A replacement receives a new submission ID and links back to the rejected submission.
