# HMPP 2026 — Next Build / Operations Plan

## Current state
Production v2.9 is live from `main` on the production Cloudflare Worker. Participant-facing voting and guessing are accepted. Publication controls are correctly disabled before official Play-In completion.

## Current live gate
Do not publish Play-In results or Round of 64 until all 9 official participants have submitted all 8 Play-In matchups: 72 official Play-In votes.

When 72/72 is reached, perform the deferred publication acceptance test:
1. verify official completeness excludes Test Voter;
2. preview all eight Play-In results privately;
3. verify ties block advancement;
4. if no ties, preview Round-of-64 matchups with each Play-In winner in the locked target slot;
5. verify normal participants cannot see unpublished next-round matchups;
6. publish previous-round results;
7. publish Round of 64;
8. confirm normal participants can see the new round after publication;
9. confirm Play-In reset controls are hidden after publication.

## Next engineering work after publication validation
- add authoritative Round-of-32 and later advancement mappings;
- generalize the existing publication engine to those rounds;
- implement analytics from `docs/ANALYTICS_ROADMAP.md`;
- consider replacing email-verifier login with a stronger one-time-code or magic-link model in a future tournament;
- optionally remove the remaining brief first-paint layout flash.

## Safety constraints
- Do not expose participant ownership in public song cards.
- Do not count Test Voter in official vote totals or guess analytics.
- Do not invent later-round bracket wiring.
- Keep Durable Objects authoritative and GitHub as audit/export mirror.
- Preserve atomic matchup semantics: one song vote + two guesses.
