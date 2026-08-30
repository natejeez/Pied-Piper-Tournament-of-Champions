#!/usr/bin/env python3
"""Build a public song-first bracket payload without participant/submission identity."""
from __future__ import annotations
import csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADMIN = ROOT / "data" / "2026" / "admin" / "submissions"
BRACKET = ROOT / "data" / "2026" / "bracket"
OUTPUT = ROOT / "data" / "2026" / "public" / "bracket.json"

def submission_to_song():
    out = {}
    for path in sorted(ADMIN.glob("P26-*.csv")):
        with path.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                out[row["submission_id"]] = row["song_id"]
    return out

def slot(value, slot_type, lookup):
    if slot_type == "direct":
        return {"type": "song", "song_id": lookup[value]}
    if slot_type == "playin_winner":
        return {"type": "playin_winner", "source_match_id": value.removesuffix("-WINNER")}
    raise ValueError(f"Unsupported slot type: {slot_type}")

def main():
    lookup = submission_to_song()
    playins = []
    with (BRACKET / "play-ins.csv").open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            playins.append({
                "match_id": row["playin_id"], "round": "PLAYIN", "status": row["status"],
                "slot_a": {"type": "song", "song_id": lookup[row["slot_a_submission_id"]]},
                "slot_b": {"type": "song", "song_id": lookup[row["slot_b_submission_id"]]},
            })
    r64 = []
    with (BRACKET / "matches-r64.csv").open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            r64.append({
                "match_id": row["match_id"], "round": row["round"], "status": row["status"],
                "slot_a": slot(row["slot_a"], row["slot_a_type"], lookup),
                "slot_b": slot(row["slot_b"], row["slot_b_type"], lookup),
            })
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"tournament_id":"HMPP-2026","rounds":{"playin":playins,"r64":r64}}, indent=2)+"\n", encoding="utf-8")
    print(f"Wrote {len(playins)} play-ins and {len(r64)} R64 matches")

if __name__ == "__main__":
    main()
