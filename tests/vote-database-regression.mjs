import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  importParticipantState,
  readParticipantState,
  resetParticipantRound,
  submitMatchup
} from '../src/vote-database.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_create_matchup_submissions.sql', import.meta.url), 'utf8'));

const db = {
  prepare(query) {
    return {
      bind(...values) {
        return {
          async run() {
            const result = sqlite.prepare(query).run(...values);
            return { meta: { changes: Number(result.changes) } };
          },
          async first() {
            return sqlite.prepare(query).get(...values) || null;
          },
          async all() {
            return { results: sqlite.prepare(query).all(...values) };
          }
        };
      }
    };
  }
};
const env = { VOTES_DB: db };
const input = (participantId, songId = 'SONG26-019', guesses = [
  { song_id: 'SONG26-019', guessed_participant_id: 'p1' },
  { song_id: 'SONG26-016', guessed_participant_id: 'p2' }
]) => ({
  participantId,
  isTest: false,
  matchId: 'PI01',
  round: 'play-in',
  songId,
  guesses
});

const concurrentParticipants = await Promise.all(
  Array.from({ length: 20 }, (_, index) => submitMatchup(env, input(`participant-${index}`)))
);
assert.ok(concurrentParticipants.every(result => result.status === 200));
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM matchup_submissions').get().count, 20);

const first = await submitMatchup(env, input('same-participant'));
const retry = await submitMatchup(env, input('same-participant'));
assert.equal(first.status, 200);
assert.equal(retry.status, 200);
assert.equal(retry.body.idempotent, true);
assert.equal(retry.body.matchup_submission_id, first.body.matchup_submission_id);

const competing = await Promise.all([
  submitMatchup(env, input('competing-participant', 'SONG26-019')),
  submitMatchup(env, input('competing-participant', 'SONG26-016'))
]);
assert.deepEqual(competing.map(result => result.status).sort(), [200, 409]);
assert.equal(sqlite.prepare(
  'SELECT COUNT(*) AS count FROM matchup_submissions WHERE participant_id = ?'
).get('competing-participant').count, 1);

const beforeInvalid = sqlite.prepare('SELECT COUNT(*) AS count FROM matchup_submissions').get().count;
await assert.rejects(
  submitMatchup(env, input('invalid-participant', 'SONG26-019', [{ song_id: 'SONG26-019', guessed_participant_id: 'p1' }])),
  /exactly two distinct song guesses/
);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM matchup_submissions').get().count, beforeInvalid);

const legacy = {
  votes: {
    PI01: { match_id: 'PI01', round: 'play-in', song_id: 'SONG26-019', vote_submission_id: 'legacy-vote' }
  },
  guesses: {
    'SONG26-019': { match_id: 'PI01', round: 'play-in', song_id: 'SONG26-019', guessed_participant_id: 'p1' },
    'SONG26-016': { match_id: 'PI01', round: 'play-in', song_id: 'SONG26-016', guessed_participant_id: 'p2' }
  }
};
assert.equal(await importParticipantState(env, 'legacy-participant', false, legacy), 1);
const migrated = await readParticipantState(env, 'legacy-participant');
assert.equal(migrated.votes.PI01.song_id, 'SONG26-019');
assert.equal(migrated.votes.PI01.vote_submission_id, 'legacy-vote');
assert.equal(Object.keys(migrated.guesses).length, 2);

const countBeforeInvalidMigration = sqlite.prepare('SELECT COUNT(*) AS count FROM matchup_submissions').get().count;
await assert.rejects(
  importParticipantState(env, 'incomplete-participant', false, {
    votes: { PI01: legacy.votes.PI01 },
    guesses: {}
  }),
  /incomplete matchup/
);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM matchup_submissions').get().count, countBeforeInvalidMigration);

const reset = await resetParticipantRound(env, 'legacy-participant', 'play-in');
assert.deepEqual(reset, { votes_removed: 1, guesses_removed: 2 });
const empty = await readParticipantState(env, 'legacy-participant');
assert.deepEqual(empty, { votes: {}, guesses: {} });

sqlite.close();
console.log('D1 vote database regression: PASS');
