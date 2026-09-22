import assert from 'node:assert/strict';

const guessKey=(round,songId)=>round==='play-in'?songId:`${round}:${songId}`;
const findGuess=(guesses,round,songId)=>guesses?.[guessKey(round,songId)]||Object.values(guesses||{}).find(g=>g?.round===round&&g?.song_id===songId)||null;

const song='SONG26-019';
const guesses={
  [song]:{round:'play-in',song_id:song,guessed_participant_id:'doc'},
  [guessKey('round-of-64',song)]:{round:'round-of-64',song_id:song,guessed_participant_id:'jj'}
};

assert.equal(guessKey('play-in',song),song);
assert.equal(guessKey('round-of-64',song),'round-of-64:'+song);
assert.notEqual(guessKey('play-in',song),guessKey('round-of-64',song));
assert.equal(findGuess(guesses,'play-in',song).guessed_participant_id,'doc');
assert.equal(findGuess(guesses,'round-of-64',song).guessed_participant_id,'jj');

const freshR64={ [song]:guesses[song] };
assert.equal(findGuess(freshR64,'round-of-64',song),null,'A Play-In guess must not lock the R64 dropdown.');

console.log('PASS v32 R64 regression: round-scoped Harry Man guesses do not collide with Play-In state.');
