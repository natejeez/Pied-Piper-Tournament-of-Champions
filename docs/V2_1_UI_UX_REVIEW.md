# HMPP 2026 UI/UX Review — v2.1

## Changes from hosted acceptance testing

### 1. Listening controls regain active visual affordance
Listen and Close player buttons now use black backgrounds, white text, and gold provider metadata so they no longer resemble disabled controls.

### 2. Provider actions regain tournament styling
Open in Spotify and Open in YouTube are styled as black high-contrast buttons with white text while keeping the external-link arrow.

### 3. Submitted matchups collapse to the decision
After Submit succeeds, the player, listening control, provider action, listening-requirement label, and vote buttons are removed from the completed matchup view.

The selected card remains light green and displays only a green checkmark at the right side of the song identity. The unselected card is subdued. VS remains visible.

### 4. Logged-out state is privacy-clean
The login modal now uses an opaque white full-screen backdrop. A logged-out participant cannot see the previous participant's voting state behind the login dialog.

Participant and email form fields are cleared after successful logout.

### 5. Cross-participant state is explicitly reset
Before a new participant's saved votes are hydrated, prior submitted-state classes, winner checks, players, vote controls, and listening indicators are reset. This prevents stale visual state when two participants use the same browser session.

## Unchanged principles
- song-vs-song public identity;
- no participant-to-song ownership on cards;
- explicit Submit confirmation;
- server acknowledgement before final UI state;
- no color-only confirmation: selected song also receives a checkmark;
- future rounds remain Coming Soon until populated.
