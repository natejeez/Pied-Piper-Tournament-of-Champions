# HMPP 2026 v2 — UI/UX Review

## Five improvements implemented

### 1. Persistent round context
Round selection moved into the sticky black header. The selected round is always visible, and the page title changes to `<Round> Bracket`. Future rounds render a deliberate Coming Soon state instead of an empty bracket.

### 2. Voting is gated where the decision happens
Each song card now begins with a disabled `Tap to vote` control. The pair unlocks only after both songs meet the listening requirement, so the state transition is visible directly inside the matchup rather than communicated by a distant status label.

### 3. High-confidence vote confirmation
Voting uses a focused modal containing the exact song and artist plus explicit `Submit` and `Cancel` actions. Submission is not triggered by selecting the card alone.

### 4. Submitted matchups become visually final
After server acknowledgement, the selected song gets a green confirmation state and checkmark. The opponent and surrounding matchup are desaturated/inactive. This makes completed decisions easy to scan without removing them from the bracket.

### 5. Login and media guidance are integrated, not bolted on
The account action lives in the sticky header, first-time login is compact and task-focused, and the Spotify/YouTube listening note sits between round context and bracket content. Error text remains inline, mobile controls retain practical hit areas, and vote states do not rely on color alone.

## Additional design safeguards

- Participant-to-song ownership never appears on public cards.
- Song IDs were removed from the matchup UI per v2 direction, while IDs remain in data attributes and backend validation.
- Copy-link controls were removed to reduce action clutter.
- Spotify and YouTube embeds remain provider-native and are opened one at a time.
- `prefers-reduced-motion` behavior from the previous design is retained.
