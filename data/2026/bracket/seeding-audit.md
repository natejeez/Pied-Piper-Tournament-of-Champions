# 2026 Seeding Audit

## Status

**LOCKED — PRE-TOURNAMENT**

Validation was completed before seeding. All 72 submissions are valid.

## Randomization

Randomization seed: `20260825`

The seed is retained so the randomized allocation can be reconstructed/audited.

## Play-in allocation

Eight play-in matches were selected from 16 submissions. Each play-in matchup contains two different participants.

| Play-In | Submission A | Participant A | Submission B | Participant B |
|---|---|---|---|---|
| PI01 | SUB26-019 | P26-03 | SUB26-016 | P26-02 |
| PI02 | SUB26-042 | P26-06 | SUB26-001 | P26-01 |
| PI03 | SUB26-052 | P26-07 | SUB26-031 | P26-04 |
| PI04 | SUB26-051 | P26-07 | SUB26-057 | P26-08 |
| PI05 | SUB26-069 | P26-09 | SUB26-034 | P26-05 |
| PI06 | SUB26-028 | P26-04 | SUB26-062 | P26-08 |
| PI07 | SUB26-044 | P26-06 | SUB26-020 | P26-03 |
| PI08 | SUB26-066 | P26-09 | SUB26-003 | P26-01 |

## Round of 64 allocation

The 56 non-play-in submissions receive direct placement. The eight play-in winners occupy eight Round-of-64 slots.

The assignment was generated so that no Round-of-64 matchup can contain two songs from the same participant, including the uncertainty of which participant wins a play-in.

This means the Round-of-64 same-participant constraint is guaranteed regardless of play-in outcomes.

## Main bracket

The authoritative Round-of-64 match list is `matches-r64.csv`.

## Important distinction

The randomized seed determines tournament placement only. It is not a quality ranking of songs.

No song has been ranked by musical quality, Spotify popularity, participant identity, or submission order.

## Post-play-in behavior

When a play-in is completed, its winner replaces the corresponding `PI##-WINNER` placeholder in the Round-of-64 match. No reseeding should occur after play-ins unless an explicit administrative correction is made and logged.
