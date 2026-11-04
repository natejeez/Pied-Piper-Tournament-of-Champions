# D1 vote storage migration

## Status

The Worker supports Cloudflare D1 as the vote/guess authority. Production remains on Durable Objects until the D1 database is provisioned, the binding is configured, and the live-state migration is completed. GitHub mirroring is disabled in the current Worker code. Participant/admin files and vote snapshots are excluded from future Git tracking; their local copies are retained as migration material.

Do not set `VOTE_STORAGE_BACKEND=d1` until the migration endpoint reports success. Do not remove the existing Durable Object binding until the cutover has been verified.

## D1 model

`migrations/0001_create_matchup_submissions.sql` creates one row per participant/matchup. The vote and its two guesses are stored together in that row. The `(participant_id, match_id)` primary key makes competing submissions deterministic; identical retries return the stored submission, while a different concurrent choice receives `409`. A failed write cannot leave only the vote or only one guess persisted.

The binding name used by the Worker is `VOTES_DB`. `VOTES_DATABASE_ID` in `wrangler.jsonc` is only a placeholder for operator reference; Wrangler does not create a D1 binding from a variable. Add the real `d1_databases` binding with the generated database ID before enabling D1. Do not expose this database through static assets or a public endpoint.

## Provision and stage

1. Authenticate Wrangler to the Cloudflare account and create separate staging and production D1 databases.
2. Add each database's Wrangler-generated `database_id` under `d1_databases` in the matching Wrangler environment, with binding `VOTES_DB` and `migrations_dir` set to `./migrations`.
3. Apply the migration to staging with `wrangler d1 migrations apply <staging-database-name> --remote`.
4. Deploy the Worker with `VOTE_STORAGE_BACKEND=durable-objects` and `VOTE_WRITES_PAUSED=false`; this keeps the current source of truth active while enabling the D1 binding.
5. On staging, verify new submissions, identical retries, conflicting concurrent submissions, cross-participant concurrency, reads, resets, aggregation, and publication gates.

## Production cutover

The migration reads live Durable Object state; checked-in snapshots are not assumed current or complete.

1. Deploy the Worker with production D1 binding, `VOTE_STORAGE_BACKEND=durable-objects`, and `VOTE_WRITES_PAUSED=true`.
2. Apply the D1 schema remotely and confirm all production API writes are paused.
3. As Test Voter, send `POST /api/admin/migrate-votes-to-d1` with `{"confirm":true}`. The endpoint reads every official participant and Test Voter Durable Object, validates every vote has exactly two matching guesses, and imports each matchup idempotently. If a mismatch/error occurs, keep writes paused, resolve it, and retry; it never deletes the source Durable Object records.
4. Reconcile the endpoint's participant/matchup counts with source state. Verify login/session reads and publication aggregation against D1 while writes remain paused.
5. Deploy with `VOTE_STORAGE_BACKEND=d1` and `VOTE_WRITES_PAUSED=false`. Verify submissions, refresh/login restore, reset scopes, results preview/publication, and concurrent submissions using staging/test accounts.
6. Keep the Durable Object binding and local ignored snapshots until the D1 cutover is accepted. Revoke the old GitHub contents-write token after confirming no remaining deployed Worker version uses it.

The code change alone cannot create a Cloudflare database or perform this cutover. Wrangler in the implementation environment was unauthenticated, so production resource creation and deployment have not been performed.

## Recovery

No R2 backup is configured by design. Durable Object source records are retained through cutover, but they are not a substitute for ongoing D1 backups. Before general production use, establish and test an operator-controlled D1 export/restore procedure and decide on a private backup target and retention policy.

If D1 validation fails before the backend switch, keep `VOTE_STORAGE_BACKEND=durable-objects`, keep writes paused until safe, and continue from Durable Objects. After D1 accepts writes, do not switch back to Durable Objects without a reverse migration/reconciliation; the stores will diverge.
