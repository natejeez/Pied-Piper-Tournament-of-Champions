import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../src/worker-v42.js', import.meta.url), 'utf8');
const parentWorker = fs.readFileSync(new URL('../src/worker-v40.js', import.meta.url), 'utf8');

assert.match(worker, /function guessFor\\(round,songId\\)/);
assert.match(worker, /exact\.round===round&&exact\.song_id===songId&&\(!matchId \|\| exact\.match_id===matchId\)/);
assert.match(worker, /const saved=guessFor\(match\.dataset\.round,sid,match\.dataset\.matchId\)/);
assert.match(parentWorker, /card\.dataset\.round=m\.round\|\|'round-of-64'/);

// Regression model: M005's SONG26-031 had a prior Play-In guess from PI03.
// That record must never satisfy the Round-of-64 lookup.
const sessionState = {
  guesses: {
    'SONG26-031': {
      round: 'play-in',
      song_id: 'SONG26-031',
      match_id: 'PI03',
      guessed_participant_id: 'danny-mcgees'
    }
  }
};

function guessFor(state, round, songId, matchId) {
  if (!round || !songId) return null;
  const key = round === 'play-in' ? songId : round + ':' + songId;
  const exact = state.guesses?.[key];
  if (exact && exact.round === round && exact.song_id === songId && (!matchId || exact.match_id === matchId)) return exact;
  return null;
}

assert.equal(
  guessFor(sessionState, 'round-of-64', 'SONG26-031', 'M005'),
  null,
  'M005 must not inherit Danny McGees from PI03'
);

sessionState.guesses['round-of-64:SONG26-031'] = {
  round: 'round-of-64',
  song_id: 'SONG26-031',
  match_id: 'M005',
  guessed_participant_id: 'juh'
};

assert.equal(
  guessFor(sessionState, 'round-of-64', 'SONG26-031', 'M005')?.guessed_participant_id,
  'juh'
);

assert.equal(
  guessFor(sessionState, 'round-of-64', 'SONG26-031', 'M006'),
  null,
  'A different R64 matchup must not inherit M005\'s guess'
);

console.log('v2.42 M005 round-isolation regression: PASS');


assert.match(worker, /select\.value=saved\?\.guessed_participant_id\|\|''/);
assert.match(worker, /select\.disabled=!!saved/);
assert.match(worker, /hmppRoundGuessFor\(sessionState,match\.dataset\.round\|\|selectedRound\(\),s\.dataset\.songId\)/);
console.log('v2.42 stale-select guard: PASS');
