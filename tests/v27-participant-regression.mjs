import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ParticipantVoteStore } from '../src/worker-v24.js';

class MemoryStorage {
  constructor(){ this.map=new Map(); this.alarm=null; }
  async get(k){ return this.map.get(k); }
  async put(k,v){ this.map.set(k,v); }
  async setAlarm(v){ this.alarm=v; }
  async delete(k){ this.map.delete(k); }
}
class MemoryState { constructor(){ this.storage=new MemoryStorage(); } }

async function jsonFetch(store, action, payload){
  const r=await store.fetch(new Request(`https://vote-store.internal/${action}`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(payload)
  }));
  const body=await r.json();
  return {status:r.status, body};
}

const state=new MemoryState();
const store=new ParticipantVoteStore(state,{});
await state.storage.put('participant_id','qa-official-participant');
await state.storage.put('is_test',false);

const submitted=await jsonFetch(store,'matchup-submit',{
  participant_id:'qa-official-participant',
  is_test:false,
  match_id:'PI01',
  round:'play-in',
  song_id:'SONG26-019',
  guesses:[
    {song_id:'SONG26-019',guessed_participant_id:'p1'},
    {song_id:'SONG26-016',guessed_participant_id:'p2'}
  ]
});
assert.equal(submitted.status,200,'official-mode matchup submit should succeed');
assert.equal(submitted.body.vote.vote_pool,'official');
assert.equal(submitted.body.vote.excluded_from_official_totals,false);
assert.equal(submitted.body.guesses.length,2);
for(const g of submitted.body.guesses){
  assert.equal(g.guess_pool,'official');
  assert.equal(g.excluded_from_official_guess_stats,false);
  assert.equal(g.match_vote_submission_id,submitted.body.vote.vote_submission_id);
}

const repeat=await jsonFetch(store,'matchup-submit',{
  participant_id:'qa-official-participant',
  is_test:false,
  match_id:'PI01',
  round:'play-in',
  song_id:'SONG26-019',
  guesses:[
    {song_id:'SONG26-019',guessed_participant_id:'p1'},
    {song_id:'SONG26-016',guessed_participant_id:'p2'}
  ]
});
assert.equal(repeat.status,200,'idempotent official-mode resubmit should succeed');

const reset=await jsonFetch(store,'reset-round',{
  participant_id:'qa-official-participant',
  is_test:false,
  round:'play-in'
});
assert.equal(reset.status,200);
assert.equal(reset.body.votes_removed,1);
assert.equal(reset.body.guesses_removed,2);

const ui=fs.readFileSync(new URL('../web/ui-v27.js',import.meta.url),'utf8');
assert.match(ui,/pointerdown/);
assert.match(ui,/auxclick/);
assert.match(ui,/provider-link/);
const css=fs.readFileSync(new URL('../web/ui-v27.css',import.meta.url),'utf8');
assert.match(css,/pending-vote-choice/);
assert.match(css,/rgba\(74,163,98/);
assert.match(css,/pending-vote-other/);
assert.match(css,/rgba\(194,72,72/);
assert.match(css,/\.match\.matchup-pending \.vote-btn\{display:block!important\}/);
assert.match(css,/\[hidden\]\{display:none!important\}/);

console.log('v2.7 participant regression: PASS');
