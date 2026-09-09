# HMPP 2026 — v2.1 UI Polish and Completed Voting Validation

v2.1 is a UI/state-management refinement on top of the authenticated v2 voting backend. The Durable Object, vote API, Git mirror, participant data, media data, and locked bracket are unchanged.

## What changed
- Listen / Close player controls restored to polished black styling.
- Open in Spotify / Open in YouTube controls restored to black button styling.
- Submitted matchups collapse all listening/player controls.
- The selected song now shows only a green checkmark beside the song identity.
- The unselected song no longer shows a Voting closed button.
- Login uses an opaque white backdrop so logged-out users do not see prior vote state behind the modal.
- Logout clears the participant and email fields.
- Participant vote UI is reset before another participant's saved state is hydrated.

## Versioning
- Live candidate: web/index.html
- Immutable v2 archive: web/versions/hmpp_v2.index.html
- Immutable v2.1 archive: web/versions/hmpp_v2_1.index.html
- Test Worker: pied-piper-tournament-of-champions-v2-test
- Test branch: feature/v2-auth-voting

See the v2.1 documents in docs/ for test results and release steps.
