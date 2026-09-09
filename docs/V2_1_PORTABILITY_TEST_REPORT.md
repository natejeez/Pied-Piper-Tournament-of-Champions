# HMPP 2026 v2.1 — Portability / Integrity Test Report

## Static validation
PASS — current feature-branch index was used as the source.
PASS — 40 matchup cards retained.
PASS — 8 Play-In matchups retained.
PASS — 32 Round-of-64 matchups retained.
PASS — 72 real song cards retained.
PASS — 72 vote controls retained.
PASS — 72 listening controls retained.
PASS — inline JavaScript parses successfully.
PASS — v2.1 UI marker present.
PASS — active Listen / Close player styling present.
PASS — provider-link button styling present.
PASS — login backdrop is opaque white.
PASS — submitted winner checkmark rendering present.
PASS — stale participant UI reset function present.
PASS — logout login-form reset present.
PASS — literal Voting closed UI removed.
PASS — literal Vote submitted button text removed.
PASS — no backend or tournament-data files changed by v2.1.

## Hosted retest still required
Because v2.1 changes runtime DOM state, staging should verify:
- player collapses immediately after Submit;
- provider/listen controls are absent in submitted matchups;
- winner checkmark appears beside song identity;
- losing card has no Voting closed button;
- login backdrop hides prior page state;
- logout clears participant/email fields;
- second participant does not inherit first participant visual state;
- existing Durable Object persistence and Git sync still work.

## Version integrity
web/versions/hmpp_v2.index.html remains unchanged.
web/versions/hmpp_v2_1.index.html is the immutable archive for this candidate.
