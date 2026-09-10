# HMPP 2026 v2.3 — Test Voter Round-1 Reset

This staging release includes a one-time cleanup for Test Voter's **Round 1 / Round of 64** Durable Object records.

On the first Test Voter state load after v2.3:
- remove Test Voter votes whose `round` is `round-of-64`;
- remove Test Voter guesses whose `round` is `round-of-64`;
- preserve all Play-In vote/guess history;
- persist a reset marker so this cleanup does not run again on future logins;
- schedule the normal Git mirror if any records were removed.

This reset does not affect any of the nine official participants and does not alter official tournament totals.
