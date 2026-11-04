function database(env) {
  if (!env.VOTES_DB) throw new Error('D1 vote database is not configured.');
  return env.VOTES_DB;
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Stored ${label} data is invalid.`, { cause: error });
  }
}

function createRecords({ participantId, isTest, matchId, round, songId, guesses }) {
  if (!Array.isArray(guesses) || guesses.length !== 2 ||
      new Set(guesses.map(guess => guess.song_id)).size !== 2) {
    throw new Error('A matchup must contain exactly two distinct song guesses.');
  }

  const matchupId = `${isTest ? 'TESTMATCHUP-' : 'MATCHUP-'}${crypto.randomUUID()}`;
  const submittedAt = new Date().toISOString();
  const vote = {
    vote_submission_id: `${isTest ? 'TESTVOTE-' : 'VOTE-'}${crypto.randomUUID()}`,
    matchup_submission_id: matchupId,
    match_id: matchId,
    round,
    song_id: songId,
    submitted_at: submittedAt,
    vote_pool: isTest ? 'test' : 'official',
    excluded_from_official_totals: isTest
  };
  const savedGuesses = guesses.map(guess => ({
    guess_submission_id: `${isTest ? 'TESTGUESS-' : 'GUESS-'}${crypto.randomUUID()}`,
    guess_batch_id: matchupId,
    matchup_submission_id: matchupId,
    match_id: matchId,
    round,
    song_id: guess.song_id,
    guessed_participant_id: guess.guessed_participant_id,
    match_vote_song_id_at_submission: songId,
    match_vote_submission_id: vote.vote_submission_id,
    submitted_at: submittedAt,
    guess_pool: isTest ? 'test' : 'official',
    excluded_from_official_guess_stats: isTest
  }));
  return { vote, guesses: savedGuesses };
}

function matchesSubmission(row, songId, guesses) {
  const existingGuesses = parseJson(row.guesses_json, 'guess');
  const actual = new Map(existingGuesses.map(guess => [guess.song_id, guess.guessed_participant_id]));
  return row.song_id === songId &&
    actual.size === guesses.length &&
    guesses.every(guess => actual.get(guess.song_id) === guess.guessed_participant_id);
}

export async function readParticipantState(env, participantId) {
  const result = await database(env).prepare(
    `SELECT match_id, vote_json, guesses_json
       FROM matchup_submissions
      WHERE participant_id = ?
      ORDER BY submitted_at`
  ).bind(participantId).all();

  const votes = {};
  const guesses = {};
  for (const row of result.results || []) {
    votes[row.match_id] = parseJson(row.vote_json, 'vote');
    for (const guess of parseJson(row.guesses_json, 'guess')) guesses[guess.song_id] = guess;
  }
  return { votes, guesses };
}

export async function submitMatchup(env, input) {
  const db = database(env);
  const { participantId, isTest, matchId, round, songId, guesses } = input;
  const records = input.records || createRecords(input);
  if (!Array.isArray(guesses) || guesses.length !== 2 ||
      new Set(guesses.map(guess => guess.song_id)).size !== 2 ||
      records.vote.match_id !== matchId ||
      records.vote.round !== round ||
      records.vote.song_id !== songId ||
      records.guesses.length !== 2 ||
      new Set(records.guesses.map(guess => guess.song_id)).size !== 2) {
    throw new Error('The matchup data is incomplete or inconsistent.');
  }

  await db.prepare(
    `INSERT INTO matchup_submissions
       (participant_id, is_test, match_id, round, song_id, matchup_submission_id,
        submitted_at, vote_json, guesses_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(participant_id, match_id) DO NOTHING`
  ).bind(
    participantId,
    isTest ? 1 : 0,
    matchId,
    round,
    songId,
    records.vote.matchup_submission_id,
    records.vote.submitted_at,
    JSON.stringify(records.vote),
    JSON.stringify(records.guesses)
  ).run();

  const row = await db.prepare(
    `SELECT song_id, matchup_submission_id, vote_json, guesses_json
       FROM matchup_submissions
      WHERE participant_id = ? AND match_id = ?`
  ).bind(participantId, matchId).first();

  if (!row) throw new Error('The matchup submission was not persisted.');
  if (!matchesSubmission(row, songId, guesses)) {
    return { status: 409, body: { error: 'A different submission already exists for this matchup.' } };
  }

  return {
    status: 200,
    body: {
      ok: true,
      idempotent: row.matchup_submission_id !== records.vote.matchup_submission_id,
      matchup_submission_id: row.matchup_submission_id,
      vote: parseJson(row.vote_json, 'vote'),
      guesses: parseJson(row.guesses_json, 'guess')
    }
  };
}

export async function importParticipantState(env, participantId, isTest, state) {
  const votes = state?.votes || {};
  const guesses = state?.guesses || {};
  const voteMatchIds = new Set(Object.keys(votes));
  if (Object.values(guesses).some(guess => !voteMatchIds.has(guess.match_id))) {
    throw new Error(`Cannot migrate guesses without a matching vote for participant ${participantId}.`);
  }
  for (const [matchId, vote] of Object.entries(votes)) {
    const matchGuesses = Object.values(guesses).filter(guess => guess.match_id === matchId);
    if (matchGuesses.length !== 2 || matchGuesses.some(guess => guess.round !== vote.round)) {
      throw new Error(`Cannot migrate incomplete matchup ${matchId} for participant ${participantId}.`);
    }
  }
  let imported = 0;

  for (const [matchId, vote] of Object.entries(votes)) {
    const matchGuesses = Object.values(guesses).filter(guess => guess.match_id === matchId);
    const matchupId = vote.matchup_submission_id || vote.vote_submission_id ||
      `${isTest ? 'TESTMATCHUP-' : 'MATCHUP-'}${crypto.randomUUID()}`;
    const migratedVote = {
      ...vote,
      vote_submission_id: vote.vote_submission_id || `${isTest ? 'TESTVOTE-' : 'VOTE-'}${crypto.randomUUID()}`,
      matchup_submission_id: matchupId,
      submitted_at: vote.submitted_at || new Date().toISOString(),
      vote_pool: isTest ? 'test' : 'official',
      excluded_from_official_totals: isTest
    };
    const migratedGuesses = matchGuesses.map(guess => ({
      ...guess,
      guess_submission_id: guess.guess_submission_id || `${isTest ? 'TESTGUESS-' : 'GUESS-'}${crypto.randomUUID()}`,
      matchup_submission_id: matchupId,
      guess_batch_id: guess.guess_batch_id || matchupId,
      match_vote_song_id_at_submission: guess.match_vote_song_id_at_submission || vote.song_id,
      match_vote_submission_id: guess.match_vote_submission_id || migratedVote.vote_submission_id,
      submitted_at: guess.submitted_at || migratedVote.submitted_at,
      guess_pool: isTest ? 'test' : 'official',
      excluded_from_official_guess_stats: isTest
    }));
    const result = await submitMatchup(env, {
      participantId,
      isTest,
      matchId,
      round: vote.round,
      songId: vote.song_id,
      guesses: migratedGuesses.map(guess => ({
        song_id: guess.song_id,
        guessed_participant_id: guess.guessed_participant_id
      })),
      records: { vote: migratedVote, guesses: migratedGuesses }
    });
    if (result.status !== 200) {
      throw new Error(`Conflicting D1 data exists for participant ${participantId}, matchup ${matchId}.`);
    }
    imported++;
  }

  return imported;
}

export async function resetParticipantRound(env, participantId, round) {
  const result = await database(env).prepare(
    `DELETE FROM matchup_submissions
      WHERE participant_id = ? AND round = ?
      RETURNING guesses_json`
  ).bind(participantId, round).all();
  const rows = result.results || [];
  const guessesRemoved = rows.reduce(
    (total, row) => total + parseJson(row.guesses_json, 'guess').length,
    0
  );
  return { votes_removed: rows.length, guesses_removed: guessesRemoved };
}
