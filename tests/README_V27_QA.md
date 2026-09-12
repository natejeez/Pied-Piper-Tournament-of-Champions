# v2.7 Participant Regression Environment

This harness exercises the Durable Object in **non-test/official mode** using an isolated in-memory storage implementation. It does not touch Cloudflare, GitHub vote mirrors, or any real participant record.

Run:

```bash
node tests/v27-participant-regression.mjs
```

Coverage:
- atomic matchup vote + two submitter guesses with `is_test:false`
- official vote/guess pool flags
- idempotent resubmission
- round reset behavior
- external provider listening hooks include primary and middle-click handling
- green/red light-overlay selection styling
- vote buttons remain visible during guess selection
- reset participant control obeys `[hidden]`
