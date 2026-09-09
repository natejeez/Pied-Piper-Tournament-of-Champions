# HMPP 2026 Frontend Project Context — v2.1

## Current state
The v2 authenticated voting stack has completed end-to-end acceptance testing on the isolated Cloudflare test Worker.

Validated behavior:
- participant login works;
- Test Voter is visibly segregated from official voting;
- Spotify external-open listening gate works;
- YouTube PLAYING-state listening gate works;
- both songs must be listened to before voting unlocks;
- Cancel records nothing;
- Submit writes a durable vote;
- refresh restores the submitted vote;
- logout flushes the vote snapshot to GitHub;
- the generated test-vote JSON contains the expected match IDs and selected song IDs;
- future-round Coming Soon navigation works.

## v2.1 purpose
v2.1 does not change tournament data or backend vote semantics. It refines frontend presentation and participant-state cleanup after the successful v2 acceptance test.

## Runtime architecture
Browser -> Cloudflare Worker -> ParticipantVoteStore Durable Object -> debounced/forced GitHub mirror.

GitHub remains the audit/export mirror. The Durable Object is authoritative at vote-submission time.

## Current test environment
- Branch: feature/v2-auth-voting
- Worker: pied-piper-tournament-of-champions-v2-test
- Git mirror branch: feature/v2-auth-voting
- Test vote path: data/2026/test-votes/by-participant/test-voter.json

## Production caution
Do not merge the test wrangler.jsonc into main unchanged. The test branch intentionally names the v2-test Worker and mirrors to the feature branch. Production release must restore the production Worker name and GITHUB_BRANCH=main on a release branch before merging to main.


## Next-session reminder — one more build before production
Do not deploy v2.1.1 to production yet. The tournament administrator intends to request one more build and will explicitly say when to begin it.

That next build must address three areas:

1. **Test-only developer mode** — Test Voter login exposes song numbers / song IDs for QA; normal participants never see them.
2. **Administrator-controlled round publication** — completed round results stay private until the administrator explicitly publishes them; publication advances winners into the next round and makes that round live.
3. **Previous-round submitter guessing** — after a new round is published, the prior round opens a separate guessing vote where participants guess who submitted each song.

After those workflows are stable, build analytics around official votes, guessing accuracy, participant trends, song/artist performance, progression, and audit history.

No implementation should begin until the administrator explicitly requests the next build.
