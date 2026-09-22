# V2.32 Test Control Behavior

This build keeps all changes on `feature/v2-auth-voting`.

## Visual target
Only the compact published-results layout represented by screenshot 3 is treated as the visual target. Other screenshots are diagnostic examples of broken or undesirable states.

## Test voter states
Each round is either in voter view, preview-results view, or published-results view.

- Voter view: normal blank/unvoted matchup cards and normal voting controls.
- Preview-results view: a Test Voter-only overlay generated from production submissions when available, with missing participant ballots simulated.
- Published-results view: authoritative published results shown to every authenticated voter in the compact result-card layout.

Preview/voter choice is stored per round in session storage for Test Voter only. Published-results state always takes precedence.

## Simulation
The single `Simulate` / `Re-simulate` control:
- reads production `main` ballot mirrors for the active round;
- preserves any valid production submissions found;
- simulates only missing matchup votes/guesses;
- simulates all users if production contains no submissions for that round;
- seeds the V2 test Durable Objects only;
- does not publish results.

`Clear Preview` removes only the visual preview for the active round and returns that tab to voter view.

## Round-safe Harry Man guesses
Play-In keeps the legacy song-ID guess key for backwards compatibility. R64 and later use `round:song_id`, preventing an advancing song's previous-round guess from disabling the new round's selector.

## Publication controls
On R64, the Play-In publication controls provide:
- View submitted voters (disabled when all participants are complete)
- View results for previous round (disabled once results are published)
- Publish results for previous round / Unpublish results for previous round
- View new matchups
- Publish New Matchups / Unpublish New Matchups

Unpublish actions affect V2 test publication state only when running the V2 test Worker.
