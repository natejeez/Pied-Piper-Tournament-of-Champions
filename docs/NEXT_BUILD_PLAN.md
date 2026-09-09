# HMPP 2026 — NEXT BUILD REMINDER

**Status:** Planned only. Do not implement until Nathan explicitly says to begin the next build.

**Release intent:** One final build before production deployment.

## 1. Test-only developer mode
When logged in as **Test Voter**, enable a clearly labeled developer mode that surfaces internal song numbers / song IDs on matchup cards for QA and troubleshooting.

Requirements:
- developer mode only for Test Voter;
- normal participants never see song IDs;
- test mode remains excluded from official totals;
- developer display must not alter tournament behavior.

## 2. Administrator-controlled round publication
Round completion and round publication are separate events.

Required behavior:
- voting can close without immediately revealing results;
- results remain hidden until the tournament administrator chooses **Publish Round**;
- publishing finalizes the result set used for advancement;
- winners are populated into the next-round bracket;
- the next round becomes visible/live only after administrator publication;
- publication state and timestamp should be auditable;
- do not let normal participants publish or alter a round.

## 3. Secondary submitter-guess voting
When a new round is published, the immediately previous round becomes available for a second, separate activity: participants guess who submitted each song in that completed round.

Requirements:
- guess records are separate from head-to-head match votes;
- guesses remain linked to the authenticated participant;
- one guess per participant per song unless an explicit edit policy is later chosen;
- guessing/reveal/close timing is administrator-controlled;
- preserve data for later guessing-accuracy analytics.

## 4. Analytics foundation
After publication and guessing are working, build analytics that demonstrate the structure and quality of the tournament system.

Planned areas:
- official voting trends;
- participant voting patterns;
- submitter-guess accuracy;
- song and artist performance;
- progression by round;
- close matches / consensus / divergence;
- audit and participation completeness;
- clear separation of official votes, test votes, and guessing votes.

## Next-session instruction
If a future chat in this project starts without this conversation in view, read this file and the current v2.1 project context before proposing or building the next version.

Do not start the build until Nathan explicitly says it is time.
