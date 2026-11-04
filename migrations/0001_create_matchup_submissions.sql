CREATE TABLE IF NOT EXISTS matchup_submissions (
  participant_id TEXT NOT NULL,
  is_test INTEGER NOT NULL CHECK (is_test IN (0, 1)),
  match_id TEXT NOT NULL,
  round TEXT NOT NULL,
  song_id TEXT NOT NULL,
  matchup_submission_id TEXT NOT NULL UNIQUE,
  submitted_at TEXT NOT NULL,
  vote_json TEXT NOT NULL CHECK (json_valid(vote_json)),
  guesses_json TEXT NOT NULL CHECK (json_valid(guesses_json)),
  PRIMARY KEY (participant_id, match_id),
  CHECK (json_array_length(guesses_json) = 2)
);

CREATE INDEX IF NOT EXISTS matchup_submissions_round_idx
  ON matchup_submissions (round, is_test, match_id);
