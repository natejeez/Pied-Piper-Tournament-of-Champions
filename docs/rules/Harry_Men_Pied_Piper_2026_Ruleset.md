# Harry Men Pied Piper Championship — 2026 Ruleset

**Ruleset:** 2026  
**Tournament:** Harry Men Pied Piper Championship  
**Participants:** 9  
**Songs per participant:** 8  
**Total submissions:** 72  
**Final bracket size:** 64  
**Play-in matchups:** 8

## 1. Tournament Structure

The 2026 Harry Men Pied Piper Championship consists of **9 participants**, with each participant submitting exactly **8 songs**, for a total of **72 songs**.

The tournament is reduced from 72 songs to a 64-song main bracket through an **8-match play-in round**.

### Tournament progression

1. Blind submission of 8 songs per participant.
2. Submission validation and duplicate/version review.
3. Replacement window for submissions rejected under the duplicate rules.
4. Random seeding.
5. Eight play-in matchups reduce the field from 72 to 64.
6. The 64-song main bracket proceeds through the standard elimination rounds.
7. Winners advance until one song is crowned champion.

## 2. Blind Submissions

Each participant submits exactly 8 songs.

Submissions are intended to be **blind**: participants should not have visibility into the other participants' submissions while the submission process is underway.

The tournament administrator maintains the authoritative submission record.

## 3. Duplicate & Version Rules

### 3.1 One copy of the same song/composition

Only **one copy of the same song/composition** may enter the tournament.

If two participants submit the same song/composition:

- The **first valid submission received** keeps the song.
- The later submission is rejected as a duplicate.
- The participant whose submission was rejected receives a **replacement-song window**.

### 3.2 Different recordings

Different artists' recordings of the same composition **may both qualify** when the recordings are substantially different.

The tournament therefore evaluates the **recording/version**, not merely the underlying composition, when determining whether two versions are sufficiently distinct.

### 3.3 Versions that do not create a separate entry

The following do **not** normally constitute separate tournament entries:

- Radio edits
- Remasters
- Alternate album versions
- Minor edits or equivalent releases of the same recording

A substantially different recording by a different artist may qualify even when the underlying composition is the same.

### 3.4 Covers

Covers are judged by the **recording submitted**, not merely by the identity of the underlying composition.

## 4. Replacement Songs

When a submission is rejected because another participant submitted the same song/composition first, the rejected participant receives a replacement window.

The replacement must itself satisfy all tournament rules, including the duplicate/version rules.

The replacement process continues until the participant has a valid set of 8 songs or the submission process is otherwise finalized by the tournament administrator.

Rejected submissions should remain in the administrative record rather than being silently deleted.

## 5. Seeding

Songs are **randomly seeded** into the tournament structure.

Seeding must satisfy the participant-separation requirements below.

### 5.1 Same participant — Round 1

Songs belonging to the same participant **cannot face each other in Round 1** of the 64-song main bracket.

### 5.2 Distribution throughout the bracket

Songs from the same participant should be **spread throughout the bracket** rather than intentionally clustered together.

The objective is to prevent one participant's submissions from disproportionately eliminating one another early in the tournament.

## 6. Play-In Round

Because 72 valid songs enter the tournament and the main bracket contains 64 positions, the tournament begins with an **8-match play-in round**.

- 72 songs enter.
- 8 play-in matches are played.
- 16 songs participate in the play-in.
- 8 winners advance.
- 56 songs receive direct placement into the 64-song main bracket.
- The resulting field is 64 songs.

The play-in round is part of the tournament but is separate from the 64-song main bracket for bracket/seeding purposes.

## 7. Main Tournament

The main tournament consists of a 64-song single-elimination bracket.

The bracket proceeds through:

1. Round of 64
2. Round of 32
3. Sweet 16
4. Quarterfinals
5. Semifinals
6. Championship

Each matchup produces one advancing song.

## 8. Matchups & Results

Every matchup should have a unique match identifier.

The authoritative record should retain:

- Tournament year
- Round
- Match identifier
- Slot/bracket position
- Song A
- Song B
- Participants
- Winner
- Voting/result information
- Match status

The bracket displayed on the website should be treated as a **view of the match data**, rather than the authoritative source of the results.

## 9. Voting / Judging

Each matchup is decided by the tournament's designated voting/judging process.

The implementation should preserve enough information to determine:

- Which song won
- Vote total/result
- Whether the match was completed
- Whether a tie or other exceptional result occurred

Where practical, individual vote records should be retained for audit purposes without unnecessarily exposing voter identity publicly.

## 10. Tournament Data Integrity

The tournament database should preserve historical records rather than overwriting them.

In particular:

- Rejected submissions should remain recorded.
- Replacement submissions should be linked to the original submission.
- Match results should not be deleted.
- Historical tournament results should remain immutable once finalized except through an explicit administrative correction.
- Corrections should be auditable.

## 11. Recommended Data Concepts

The long-term tournament database should distinguish between:

### Participant

A person participating in a given tournament.

### Submission

A participant's submission of a song for a particular tournament.

### Song / Composition

The underlying musical work.

### Recording / Version

The specific artist recording submitted to the tournament.

### Spotify Track

The specific Spotify track used to embed/listen to the submitted recording.

### Match

A contest between two songs.

### Vote

An individual or aggregate voting result associated with a match.

### Tournament

A single year's championship.

## 12. 2026 Administrative Goals

The 2026 tournament database should support:

- Blind submissions
- Duplicate detection
- Version/recording review
- Replacement tracking
- Randomized seeding
- Participant separation
- 72-to-64 play-in handling
- Full bracket generation
- Match result tracking
- Voting/result auditing
- Spotify embeds
- Historical record keeping

The 2026 dataset should become the first complete historical dataset for future Harry Men Pied Piper championships.

## 13. Ruleset Governance

This document represents the **2026 ruleset**.

Future tournaments should receive their own ruleset version rather than silently modifying the 2026 rules.

For example:

- `RULES-2026-v1`
- `RULES-2027-v1`

If a correction or clarification is required during a tournament, it should be recorded as a versioned amendment rather than erasing the prior rule.

## 14. Data & Website Architecture

The long-term architecture should separate the authoritative tournament data from its presentation.

### Authoritative data

A structured tournament database should contain:

- Participants
- Tournaments
- Submissions
- Songs
- Matches
- Votes
- Bracket positions
- Rules
- Audit history

### Public website

The website should render information from the tournament data, including:

- Tournament overview
- Bracket
- Matchups
- Spotify players
- Voting interface
- Results
- Historical tournaments
- Statistics

The public website should not expose private administrative information unnecessarily.

## 15. Quality-Audit Principles

Before a tournament is finalized, the administrator should be able to verify:

1. Every participant submitted exactly 8 valid songs.
2. Every valid song has a unique submission record.
3. Duplicate/replacement decisions are documented.
4. No prohibited duplicate remains in the field.
5. Play-in placement is correct.
6. No participant's songs face one another in Round 1 of the main bracket.
7. Songs are appropriately distributed through the bracket.
8. Every matchup has exactly two eligible songs.
9. Every completed matchup has exactly one winner.
10. Advancement through the bracket is internally consistent.
11. Final results can be reconstructed from the underlying records.
12. Historical records remain available after the tournament concludes.

## 16. Known 2026 Constants

| Item | Value |
|---|---:|
| Participants | 9 |
| Songs per participant | 8 |
| Total submissions | 72 |
| Play-in matches | 8 |
| Play-in participants | 16 |
| Play-in winners | 8 |
| Main bracket size | 64 |
| Main bracket Round 1 matches | 32 |

## 17. Future Expansion

The database should be designed so future tournaments can be added without changing the underlying historical 2026 records.

Potential future queries include:

- Participant win/loss records
- Songs reaching each round
- Most successful participants
- Closest matches
- Artists appearing across multiple years
- Repeat song/composition submissions
- Tournament champions
- Historical bracket reconstruction
- Year-over-year participant performance
- Song and artist frequency
