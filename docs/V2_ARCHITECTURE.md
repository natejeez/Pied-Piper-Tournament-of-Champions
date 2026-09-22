# HMPP 2026 v2.14 — Architecture

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

Successful durable submission schedules the normal Git mirror alarm. A participant-facing success response means the ballot has been accepted by the Durable Object; it does not depend on GitHub being immediately available.

## Draft state
Before final submission, selected song and dropdown guesses are saved in participant-scoped browser storage. Drafts can restore after refresh/login and are discarded from authoritative logic once a server-side submission exists. A draft is never counted as a vote.

## Git mirror and logout
Official participant snapshots:
`data/2026/votes/by-participant/<participant-id>.json`

Test Voter snapshot:
`data/2026/test-votes/by-participant/test-voter.json`

GitHub is an audit/export mirror, not the durability boundary for participant voting.

On logout:
1. the participant ballot has already been durably stored by the completed matchup submission;
2. the Worker dispatches an immediate Git mirror attempt as best-effort work;
3. the authenticated session cookie is cleared without waiting for GitHub;
4. a failed immediate mirror does not invalidate the ballot or block logout;
5. the pre-existing mirror alarm remains scheduled because the `flush` action deletes the alarm only after a successful Git mirror.

Mirror failures must remain observable in Worker logs and recoverable through the existing alarm/flush path.

## Reset semantics
Test Voter has admin-only reset scopes: Test Only, selected User, and All Users. Reset removes the selected round's current vote and guess records from targeted Durable Object(s). It does not create replacement records. If a participant votes again, new submission IDs are generated. Git snapshots are rewritten only for changed accounts; Git history remains the audit trail.

Browser-local listening for a remote participant cannot be erased by the server.

## Publication architecture
Tournament publication state is separate from participant vote stores. Test Voter can preview aggregate results and next-round matchups only when official completeness rules are satisfied.

Play-In completeness requires 72 official votes. Test Voter is excluded. Ties block advancement. The eight Play-In winners are inserted into locked Round-of-64 target slots. Round of 64 remains hidden from normal participants until explicitly published.

Later-round publication must not be generalized until authoritative Round-of-32 and later slot mappings are present in tournament data.

## Known later-round guardrail
Current legacy guess storage is song-keyed for Play-In compatibility. Before participant voting is generalized into Round of 64 and later rounds, guess identity must be round-scoped so a song reused from an earlier round cannot inherit or disable a prior-round guess.

Do not solve that requirement through runtime string patching of `guessing.js`; implement it directly in the canonical V4 data/client model with regression coverage.
