# 2026 Data Intake

The 2026 submission intake is organized as an immutable administrative record plus a future public/presentation layer.

## Current state

- Tournament: `HMPP-2026`
- Participants: 9
- Raw submissions: 72
- Submission IDs: `SUB26-001`–`SUB26-072`
- Recording IDs: `REC26-001`–`REC26-072`
- Initial song/composition IDs: `SONG26-001`–`SONG26-072`
- All submissions begin in `pending_review`.
- No submission has been silently discarded.

## Administrative files

Administrative participant records contain private email addresses and must not be committed to the public repository. They are excluded by `.gitignore`.

`admin/submissions/P26-01.csv` through `P26-09.csv` contain participant submission records and must remain in private storage. They are excluded by `.gitignore`.

`admin/duplicate-review.md` contains the current duplicate/version review state and unresolved metadata issues.

Vote snapshots are migration inputs only and are excluded from Git. Live participant vote/guess state must be read from the active Worker data store; repository snapshots may be incomplete or stale.

## Important

The initial `SONG26-NNN` values are intake placeholders tied one-to-one to the submitted records. During composition normalization, two or more recordings can be reassigned to the same `song_id` if they are confirmed to represent the same underlying composition. `recording_id` remains specific to the submitted recording.

This prevents us from accidentally treating Spotify track IDs as tournament identities and preserves the 2026 ruleset's distinction between composition and recording/version.
