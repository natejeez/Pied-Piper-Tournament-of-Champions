# HMPP 2026 v2.9 — Architecture

## Request path

```text
browser
  -> Cloudflare Worker
      -> session layer
      -> ParticipantVoteStore Durable Object
          -> authoritative participant vote/guess state
          -> debounced GitHub snapshot
      -> tournament admin Durable Object
          -> publication state and events
```

The Durable Object is authoritative at request time. GitHub is the audit/export mirror.

## Listening gate
Both songs in a matchup must satisfy listening before song-selection buttons unlock. Supported completion paths are Spotify external launch, YouTube external launch, and embedded YouTube PLAYING state. Browser listening state is participant-scoped convenience state, not tournament authority.

## Atomic matchup submission
The durable write occurs only when the participant submits the complete matchup. The request contains match ID, round, selected song ID, and exactly two submitter guesses.

The Worker validates the matchup and creates one vote plus two guess records linked by a shared `matchup_submission_id`. Repeated identical submission is idempotent; a submitted matchup cannot be changed without an authorized reset.

## Draft state
Before final submission, selected song and dropdown guesses are saved in participant-scoped browser storage. Drafts can restore after refresh/login and are discarded from authoritative logic once a server-side submission exists. A draft is never counted as a vote.

## Git mirror
Official participant snapshots:
`data/2026/votes/by-participant/<participant-id>.json`

Test Voter snapshot:
`data/2026/test-votes/by-participant/test-voter.json`

Logout forces a Git mirror before the session is closed. If that sync fails, logout is aborted.

## Reset semantics
Test Voter has admin-only reset scopes: Test Only, selected User, and All Users. Reset removes the selected round's current vote and guess records from targeted Durable Object(s). It does not create replacement records. If a participant votes again, new submission IDs are generated. Git snapshots are rewritten only for changed accounts; Git history remains the audit trail.

Browser-local listening for a remote participant cannot be erased by the server.

## Publication architecture
Tournament publication state is separate from participant vote stores. Test Voter can preview aggregate results and next-round matchups only when official completeness rules are satisfied.

Play-In completeness requires 72 official votes. Test Voter is excluded. Ties block advancement. The eight Play-In winners are inserted into locked Round-of-64 target slots. Round of 64 remains hidden from normal participants until explicitly published.

Later-round publication must not be generalized until authoritative Round-of-32 and later slot mappings are present in tournament data.
