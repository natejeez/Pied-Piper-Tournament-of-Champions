# HMPP 2026 v2.3 — Admin Publication Data Contract

## Tournament state
Administrative publication state is stored server-side and mirrored to GitHub at `data/2026/admin/publication-state.json`.

Fields:
- `schema_version`
- `tournament`
- `results_visible`
- `published_rounds`
- `published_results`
- `published_matchups`
- `events`

## Result snapshots
A published source-round result snapshot records, per matchup:
- match ID;
- source round;
- each song ID and official vote count;
- total official votes;
- completion state;
- tie state;
- winner song ID when non-tied.

Test Voter is excluded from these counts.

## Round publication
For Play-In -> Round of 64, publication resolves the eight authoritative play-in-winner slots and freezes those resolved matchups into `published_matchups.round-of-64`.

## Audit events
Result publication and round publication append immutable-style event records with an event ID, event type, round, publication timestamp, and publishing test/admin identity.
