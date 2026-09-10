# HMPP 2026 Project Context — v2.3

Staging continues on `feature/v2-auth-voting` and the isolated `pied-piper-tournament-of-champions-v2-test` Worker.

The v2.3 change makes song voting and submitter guessing one atomic matchup workflow and implements Test-Voter-only publication controls for Play-In -> Round of 64.

The Durable Object remains authoritative. GitHub remains the delayed/forced audit mirror. Official and test pools remain separated.

A one-time Test Voter reset clears Round 1 (Round of 64) votes/guesses on first state load after this build, preserving Play-In history so Round-of-64 workflow testing starts fresh.

Do not promote the test `wrangler.jsonc` directly to production. It still targets the v2 test Worker and feature branch.
