#!/usr/bin/env python3
"""Generate the public HMPP media manifest from participant submission CSVs.

Usage:
    python scripts/build_media_manifest.py
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUBMISSIONS = ROOT / "data" / "2026" / "admin" / "submissions"
OUTPUT = ROOT / "data" / "2026" / "public" / "media.json"

YT_RE = re.compile(r"(?:youtu\.be/|youtube\.com/watch\?v=)([^&?/]+)", re.I)

def youtube_id(url: str) -> str:
    match = YT_RE.search(url or "")
    return match.group(1) if match else ""

def to_public_media(row: dict[str, str]) -> dict[str, str]:
    provider = row["source_type"].strip().lower()
    if provider == "spotify":
        media_id = row["spotify_track_id"].strip()
        embed_url = f"https://open.spotify.com/embed/track/{media_id}?utm_source=generator"
    elif provider == "youtube":
        media_id = youtube_id(row["source_url"])
        embed_url = f"https://www.youtube-nocookie.com/embed/{media_id}" if media_id else ""
    else:
        media_id = ""
        embed_url = ""

    return {
        "song_id": row["song_id"],
        "recording_id": row["recording_id"],
        "artist": row["artist"],
        "title": row["title"],
        "provider": provider,
        "media_id": media_id,
        "source_url": row["source_url"],
        "embed_url": embed_url,
    }

def main() -> None:
    media = []
    for path in sorted(SUBMISSIONS.glob("P26-*.csv")):
        with path.open(newline="", encoding="utf-8-sig") as handle:
            media.extend(to_public_media(row) for row in csv.DictReader(handle))

    media.sort(key=lambda item: item["song_id"])
    payload = {
        "tournament_id": "HMPP-2026",
        "generated_from": "data/2026/admin/submissions/P26-01.csv ... P26-09.csv",
        "count": len(media),
        "media": media,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(media)} media records to {OUTPUT.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
