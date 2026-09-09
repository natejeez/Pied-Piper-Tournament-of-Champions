# HMPP 2026 v2.1.1 — Login State Hotfix

## Hosted regression found
The v2.1 participant-state cleanup used the single-element selector helper `$()` and then called `.forEach()` on the returned Element.

Observed:

```text
TypeError: $(...).forEach is not a function
at clearParticipantVoteUI
```

This interrupted session restoration and login after the v2.1 UI-state changes.

## Fix
The affected collection operations now use native `document.querySelectorAll(...).forEach(...)`.

Updated collections:
- `.listened-pill`
- `.song[data-song-id]`
- `.match`

No backend, authentication, Durable Object, Git mirror, tournament data, or Cloudflare configuration changed.

## Validation
- inline JavaScript parses successfully;
- the unsafe single-element-selector + `.forEach()` patterns are absent;
- native collection selectors are present;
- 40 matchup cards retained;
- 8 Play-In matchups retained;
- 32 Round-of-64 matchups retained;
- 72 vote controls retained;
- 72 listening controls retained.

## Versioning
- `web/versions/hmpp_v2.index.html` remains the v2 archive.
- `web/versions/hmpp_v2_1.index.html` preserves the hosted v2.1 candidate that exposed the regression.
- `web/versions/hmpp_v2_1_1.index.html` is the repaired candidate.

Resume hosted acceptance on the isolated v2 test Worker.
