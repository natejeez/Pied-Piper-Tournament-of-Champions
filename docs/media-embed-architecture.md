# HMPP 2026 Media Embed Architecture

## Decision

Do **not** store 72 literal iframe snippets.

The authoritative submission CSVs already contain the source URL and, for Spotify, the track ID. The public frontend should consume a generated public media manifest keyed by `song_id`, then create an iframe only when a player is mounted.

This preserves the architecture rule that the public site is song-first and does not receive participant identity.

## Files

- `data/2026/admin/submissions/P26-*.csv` — authoritative intake/admin source
- `scripts/build_media_manifest.py` — deterministic generator
- `data/2026/public/media.json` — generated public-safe media lookup
- `web/js/media-embed.js` — provider-aware frontend helper

## Why this is preferable to storing iframe HTML

1. No duplicated HTML across 72 records.
2. Changing height, permissions, privacy settings, or provider behavior requires one helper change.
3. The same `song_id` works in play-ins, later rounds, results, and historical views.
4. Spotify and YouTube are handled through the same interface.
5. The frontend never needs participant IDs, emails, rationales, or admin metadata.
6. Lazy mounting prevents loading dozens of third-party players on initial page render.

## Frontend usage

```js
import { loadMediaManifest, mountMediaPlayer } from "./js/media-embed.js";

const mediaBySong = await loadMediaManifest("../data/2026/public/media.json");

const song = mediaBySong.get("SONG26-041");
mountMediaPlayer(document.querySelector("#player-SONG26-041"), song);
```

Recommended card markup:

```html
<button class="listen-button" data-song-id="SONG26-041">Listen</button>
<div class="player-slot" id="player-SONG26-041"></div>
```

On mobile, mount one active player at a time and remove the previous iframe when another Listen button is opened.

## Spotify URL correction

The embed host should be:

`https://open.spotify.com/embed/track/{TRACK_ID}`

not:

`https://spotify.com{track_id}`

The latter omits both `open.spotify.com` and the `/embed/track/` path.

## Regeneration

Whenever submission media links are corrected:

```bash
python scripts/build_media_manifest.py
```

Commit both the source correction and regenerated `media.json`. Do not hand-edit the generated manifest unless performing an audited emergency correction.
