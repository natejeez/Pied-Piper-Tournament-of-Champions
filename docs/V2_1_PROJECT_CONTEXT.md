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
