-- Migration 0002: Create consolidated matches table
-- This table aggregates final matchup results from the helper's processing

CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  round TEXT NOT NULL,
  song1_id TEXT NOT NULL,
  votes_song1 INTEGER DEFAULT 0,
  song2_id TEXT NOT NULL,
  votes_song2 INTEGER DEFAULT 0,
  winner TEXT,
  computed_at TEXT DEFAULT (datetime('now')),
  
  -- Constraints to ensure data integrity
  CHECK (votes_song1 >= 0 AND votes_song2 >= 0),
  CHECK (winner IS NULL OR (winner = song1_id OR winner = song2_id))
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS matches_round_idx
  ON matches (round, match_id);

CREATE INDEX IF NOT EXISTS matches_winner_idx
  ON matches (winner) WHERE winner IS NOT NULL;

CREATE INDEX IF NOT EXISTS matches_song1_idx
  ON matches (song1_id);

CREATE INDEX IF NOT EXISTS matches_song2_idx
  ON matches (song2_id);

-- Comments for documentation
COMMENT ON TABLE matches IS 'Consolidated matchup results from round resolution';
COMMENT ON COLUMN matches.round IS 'Tournament round: "play-ins", "round-of-64", "round-of-32", "round-of-16", "quarter-finals", "semi-finals", or "final"';
COMMENT ON COLUMN matches.scores_song1 IS 'Aggregate vote count for song 1';
COMMENT ON COLUMN matches.winner IS 'Submission ID of the round winner, or NULL if undecided';
