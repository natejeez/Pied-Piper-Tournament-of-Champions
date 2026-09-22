import assert from 'node:assert/strict';

const guessKey=(round,songId)=>round==='play-in'?songId:`${round}:${songId}`;
const findGuess=(guesses,round,songId)=>guesses?.[guessKey(round,songId)]||Object.values(guesses||{}).find(g=>g?.round===round&&g?.song_id===songId)||null;

function submitAtomic(state,{match_id,round,song_id,guesses}){
  const existingVote=state.votes[match_id];
  if(existingVote&&existingVote.song_id!==song_id)throw new Error('A vote has already been submitted for this matchup.');
  let vote=existingVote;
  if(!vote){vote={match_id,round,song_id};state.votes[match_id]=vote}
  const returned=[];
  for(const g of guesses){
    const key=guessKey(round,g.song_id),existing=state.guesses[key];
    if(existing&&existing.guessed_participant_id!==g.guessed_participant_id)throw new Error('A submitter guess has already been submitted for this song in this round.');
    if(!existing)state.guesses[key]={match_id,round,song_id:g.song_id,guessed_participant_id:g.guessed_participant_id};
    returned.push(state.guesses[key]);
  }
  return{vote,guesses:returned};
}

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

const state={votes:{},guesses:{
  'SONG26-019':{round:'play-in',song_id:'SONG26-019',guessed_participant_id:'doc'},
  'SONG26-016':{round:'play-in',song_id:'SONG26-016',guessed_participant_id:'jj'}
}};
const result=submitAtomic(state,{match_id:'M003',round:'round-of-64',song_id:'SONG26-019',guesses:[
  {song_id:'SONG26-019',guessed_participant_id:'juh'},
  {song_id:'SONG26-055',guessed_participant_id:'chuck'}
]});
assert.equal(result.vote.song_id,'SONG26-019');
assert.equal(result.guesses.length,2);
assert.equal(state.guesses['SONG26-019'].guessed_participant_id,'doc','Play-In guess must remain unchanged.');
assert.equal(state.guesses['round-of-64:SONG26-019'].guessed_participant_id,'juh');
assert.equal(state.guesses['round-of-64:SONG26-055'].guessed_participant_id,'chuck');

console.log('PASS v32 R64 regression: M003 can submit a vote plus both round-scoped guesses without Play-In collisions.');
