# HMPP 2026 v2.9 — State continuity and login polish

## Fixes
- Submitted Daddy guesses are re-rendered from authenticated session state after submit, refresh, and login.
- In-progress matchup drafts are browser-local per participant and survive refresh and same-account logout/login; they do not cross accounts.
- Initial authentication is cloaked until either the authenticated state or login overlay is ready, removing the bracket/login flash.
- The v2.8 forced reload after logout is retired; the existing login modal transition handles logout without a full-page blip.
- Test Voter reset/auth-readiness controls install whenever Test Voter is actually logged in, even if login happens long after page load.
- Selected-song checkmark receives additional vertical separation before submission.

## Reset note
Server reset semantics remain unchanged: targeted round vote/guess records are deleted from current Durable Object state and affected Git snapshots are rewritten. v2.9 additionally clears browser-local draft state for reset targets available in the current browser.

## Deferred checks
Checklist items I and J remain tabled until participant state continuity and reset visibility pass hosted QA.
