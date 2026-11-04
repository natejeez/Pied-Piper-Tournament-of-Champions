# HMPP 2026 v2.9 — Architecture

## Request path

```text
browser
  -> Cloudflare Worker
      -> session layer
      -> D1 matchup_submissions
          -> authoritative participant vote/guess state (after gated cutover)
      -> ParticipantVoteStore Durable Object
          -> current authoritative state until D1 cutover
      -> tournament admin Durable Object
          -> publication state and events
```

Production currently uses the participant Durable Object. D1 is the target vote/guess authority; it must not be enabled until live Durable Object state is migrated and reconciled. GitHub is not a runtime data store or mirror.

## Listening gate
Both songs in a matchup must satisfy listening before song-selection buttons unlock. Supported completion paths are Spotify external launch, YouTube external launch, and embedded YouTube PLAYING state. Browser listening state is participant-scoped convenience state, not tournament authority.

## Atomic matchup submission
The database write occurs only when the participant submits the complete matchup. The request contains match ID, round, selected song ID, and exactly two submitter guesses. D1 stores the complete logical submission in one row with a unique `(participant_id, match_id)` key, so writes cannot overwrite another participant's snapshot; same-match retries are idempotent or conflict without partial records.

The Worker validates the matchup and creates one vote plus two guess records linked by a shared `matchup_submission_id`. Repeated identical submission is idempotent; a submitted matchup cannot be changed without an authorized reset.

## Draft state
Before final submission, selected song and dropdown guesses are saved in participant-scoped browser storage. Drafts can restore after refresh/login and are discarded from authoritative logic once a server-side submission exists. A draft is never counted as a vote.

## Backups
No R2 bucket is configured. Do not treat GitHub history or the existing Durable Objects as an ongoing D1 backup plan. Establish and test a private D1 export/restore process before broad production use.

## Reset semantics
Test Voter has admin-only reset scopes: Test Only, selected User, and All Users. After D1 cutover, reset removes the selected round's matchup rows for the targeted participants. If a participant votes again, new submission IDs are generated.

Browser-local listening for a remote participant cannot be erased by the server.

## Publication architecture
Tournament publication state is separate from participant vote stores. Test Voter can preview aggregate results and next-round matchups only when official completeness rules are satisfied.

Play-In completeness requires 72 official votes. Test Voter is excluded. Ties block advancement. The eight Play-In winners are inserted into locked Round-of-64 target slots. Round of 64 remains hidden from normal participants until explicitly published.

Later-round publication must not be generalized until authoritative Round-of-32 and later slot mappings are present in tournament data.
