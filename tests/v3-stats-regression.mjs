import assert from 'node:assert/strict';
import { simulateRound, summarizeRound } from '../web/js/stats-v3-core.mjs';

const participants = [
  'doc','juh','troll','chuck','jj','nate-gees','egg','danny-mcgees','patty-mayonnaise'
].map(id => ({ id, name:id }));
participants.push({ id:'test-voter', name:'Test Voter', is_test:true });

const matches = Array.from({ length:8 }, (_, i) => ({
  id:`PI${String(i+1).padStart(2,'0')}`,
  songs:[
    { id:`A${i+1}`, title:`Alpha ${i+1}`, artist:'Artist A' },
    { id:`B${i+1}`, title:`Beta ${i+1}`, artist:'Artist B' }
  ]
}));

const a = simulateRound({ round:'play-in', matches, participants, seed:20260916 });
const b = simulateRound({ round:'play-in', matches, participants, seed:20260916 });
const c = simulateRound({ round:'play-in', matches, participants, seed:20260917 });

assert.deepEqual(a.matches, b.matches, 'same seed must reproduce identical simulated results');
assert.notDeepEqual(a.matches, c.matches, 'different seeds should change simulated results');
assert.equal(a.matches.length, 8, 'play-in fixture must contain 8 matches');
assert.equal(a.voter_count, 9, 'test voter is excluded from group totals');

for (const match of a.matches) {
  assert.equal(match.ballots.length, 9, `${match.id} must contain one ballot per participant`);
  assert.equal(match.total_votes, 9, `${match.id} must contain nine group song votes`);
  assert.equal(match.active_user_ballot.participant_id, 'test-voter');
  assert.equal(match.active_user_ballot.guesses.length, 2, `${match.id} active user must guess both songs`);
  assert.ok(match.songs.some(song => song.id === match.winner_song_id), `${match.id} winner must be one of its songs`);
  const winner = match.songs.find(song => song.id === match.winner_song_id);
  const loser = match.songs.find(song => song.id !== match.winner_song_id);
  assert.ok(winner.vote_count > loser.vote_count, `${match.id} cannot tie with nine voters`);
  for (const song of match.songs) {
    assert.ok(song.top_guesses.length <= 3, `${song.id} must expose no more than three group guesses`);
    assert.equal(song.top_guesses.reduce((n,g)=>n+g.count,0) <= 9, true);
    assert.ok(song.active_user_guess_name, `${song.id} must show the active user's Harry Man guess`);
  }
}

const summary = summarizeRound(a);
assert.equal(summary.match_count, 8);
assert.equal(summary.voter_count, 9);
assert.ok(summary.closest?.id);
assert.ok(summary.widest?.id);
assert.ok(summary.most_guessed?.name);

const round64 = simulateRound({ round:'round-of-64', matches:matches.slice(0,4), participants, seed:42 });
assert.equal(round64.round, 'round-of-64');
assert.equal(round64.matches.length, 4);
assert.equal(a.round, 'play-in', 'round simulations stay isolated');

console.log('PASS v3 stats regression: deterministic generation, voter totals, winners, guesses, summaries, and round isolation.');
