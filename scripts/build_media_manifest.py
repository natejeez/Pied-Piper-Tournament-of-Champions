#!/usr/bin/env python3
"""Generate the public HMPP media manifest from participant submission CSVs.

The intake CSVs contain legacy rows with unquoted commas inside rationale text.
Fields before rationale are reliable; public recording/song IDs are therefore
derived from the stable submission ID instead of reading shifted trailing fields.

Usage:
    python scripts/build_media_manifest.py
"""
from __future__ import annotations
import csv, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUBMISSIONS = ROOT / "data" / "2026" / "admin" / "submissions"
OUTPUT = ROOT / "data" / "2026" / "public" / "media.json"
YT_RE = re.compile(r"(?:youtu\.be/|youtube\.com/watch\?v=)([^&?/]+)", re.I)

def youtube_id(url: str) -> str:
    match = YT_RE.search(url or "")
    return match.group(1) if match else ""

def stable_ids(submission_id: str) -> tuple[str, str]:
    suffix = submission_id.removeprefix("SUB26-")
    if not suffix.isdigit() or len(suffix) != 3:
        raise ValueError(f"Unexpected submission ID: {submission_id}")
    return f"REC26-{suffix}", f"SONG26-{suffix}"

def to_public_media(row: dict[str, str]) -> dict[str, str]:
    provider = row["source_type"].strip().lower()
    recording_id, song_id = stable_ids(row["submission_id"])
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
        "song_id": song_id, "recording_id": recording_id,
        "artist": row["artist"], "title": row["title"],
        "provider": provider, "media_id": media_id,
        "source_url": row["source_url"], "embed_url": embed_url,
    }

def main() -> None:
    media = []
    for path in sorted(SUBMISSIONS.glob("P26-*.csv")):
        with path.open(newline="", encoding="utf-8-sig") as handle:
            media.extend(to_public_media(row) for row in csv.DictReader(handle))
    media.sort(key=lambda item: item["song_id"])
    expected = {f"SONG26-{n:03d}" for n in range(1, 73)}
    actual = {item["song_id"] for item in media}
    if actual != expected:
        raise ValueError(f"Media manifest ID mismatch. Missing={sorted(expected-actual)} Extra={sorted(actual-expected)}")
    if any(not item["embed_url"] for item in media):
        raise ValueError("At least one media record is missing an embed URL")
    payload = {
        "tournament_id":"HMPP-2026",
        "generated_from":"data/2026/admin/submissions/P26-01.csv ... P26-09.csv",
        "count":len(media),"media":media,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    print(f"Wrote {len(media)} media records to {OUTPUT.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
