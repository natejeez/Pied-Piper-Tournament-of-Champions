# HMPP 2026 v2 — Voting Architecture

## Request path

```text
browser
  -> Cloudflare Worker session/API
      -> participant authentication (email hash secret)
      -> ParticipantVoteStore Durable Object
          -> immediate authoritative vote persistence
          -> five-minute debounce alarm
              -> GitHub vote snapshot
```

Logout calls `flush` synchronously before the session cookie is cleared.

## Vote identity

Each persisted vote carries:

```json
{
  "match_id": "PI01",
  "round": "play-in",
  "song_id": "SONG26-019",
  "submitted_at": "ISO-8601 timestamp"
}
```

The participant is represented by the enclosing participant vote-store/file. This supports participant-level statistics later without placing participant ownership on public song cards.

## Server validation

The Worker contains the locked match/song map for the rounds currently present. It rejects:

- unknown match IDs;
- a round that does not match the match record;
- a song that is not one of the two active songs in the match;
- voting in a matchup that still contains a play-in placeholder;
- changing an already-submitted vote.

Repeated submission of the same vote is idempotent.

## Git mirror

Git is an audit/export mirror, not the request-time database. The Durable Object remains authoritative between Git mirror writes. This is necessary to satisfy both immediate vote durability and the requested five-minute Git debounce.

## Test-vote isolation

`test-voter` is a non-official identity used for acceptance testing. The authenticated session carries `is_test`, its Durable Object stores that flag, and Git mirrors are routed to `data/2026/test-votes/` instead of the official vote folder. Test records are explicitly tagged `excluded_from_official_totals: true`.
