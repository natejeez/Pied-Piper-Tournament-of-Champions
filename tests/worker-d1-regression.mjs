import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker-v213-prod.js';

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

const participants = [
  { id:'participant-1', name:'Participant 1' },
  { id:'participant-2', name:'Participant 2' }
];
const email = 'participant@example.test';
const emailHash = crypto.createHash('sha256').update(email).digest('hex');
const env = {
  VOTES_DB:db,
  VOTE_STORAGE_BACKEND:'d1',
  SESSION_SECRET:'local-test-session-secret',
  PARTICIPANT_AUTH_JSON:JSON.stringify({
    participants:Object.fromEntries(participants.map(participant => [participant.id, { email_sha256:emailHash }]))
  }),
  ASSETS:{
    async fetch() {
      return Response.json({ participants });
    }
  }
};

async function login(participantId) {
  const response = await worker.fetch(new Request('https://app.test/api/login', {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body:JSON.stringify({ participant_id:participantId, email })
  }), env, {});
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';', 1)[0];
}

const [cookie1, cookie2] = await Promise.all([
  login('participant-1'),
  login('participant-2')
]);
const submission = participantId => worker.fetch(new Request('https://app.test/api/matchup-submission', {
  method:'POST',
  headers:{ 'content-type':'application/json', cookie:participantId },
  body:JSON.stringify({
    match_id:'PI01',
    round:'play-in',
    song_id:'SONG26-019',
    guesses:[
      { song_id:'SONG26-019', guessed_participant_id:'participant-1' },
      { song_id:'SONG26-016', guessed_participant_id:'participant-2' }
    ]
  })
}), env, {});

const responses = await Promise.all([submission(cookie1), submission(cookie2)]);
assert.ok(responses.every(response => response.status === 200));
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM matchup_submissions').get().count, 2);

const session = await worker.fetch(new Request('https://app.test/api/session', {
  headers:{ cookie:cookie1 }
}), env, {});
assert.equal(session.status, 200);
assert.equal((await session.json()).session.votes.PI01.song_id, 'SONG26-019');

env.VOTE_WRITES_PAUSED = 'true';
const pausedSubmission = await submission(cookie1);
assert.equal(pausedSubmission.status, 503);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM matchup_submissions').get().count, 2);
env.VOTE_WRITES_PAUSED = 'false';

const legacyVote = await worker.fetch(new Request('https://app.test/api/votes', {
  method:'POST',
  headers:{ 'content-type':'application/json', cookie:cookie1 },
  body:JSON.stringify({ match_id:'PI01', round:'play-in', song_id:'SONG26-019' })
}), env, {});
assert.equal(legacyVote.status, 409);

sqlite.close();
console.log('D1 Worker integration regression: PASS');
