import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ParticipantVoteStore } from '../src/worker-v23.js';

class MemoryStorage {
  constructor(){ this.map=new Map(); this.alarm=null; }
  async get(key){ return this.map.get(key); }
  async put(key,value){ this.map.set(key,value); }
  async setAlarm(value){ this.alarm=value; }
  async deleteAlarm(){ this.alarm=null; }
  async delete(key){ this.map.delete(key); }
}
class MemoryState { constructor(){ this.storage=new MemoryStorage(); } }

async function jsonFetch(store, action, payload){
  const response=await store.fetch(new Request(`https://vote-store.internal/${action}`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(payload)
  }));
  return { status:response.status, body:await response.json() };
}

// Atomic matchup persistence remains the production invariant.
const state=new MemoryState();
const store=new ParticipantVoteStore(state,{});
await state.storage.put('participant_id','qa-official-participant');
await state.storage.put('is_test',false);

const payload={
  participant_id:'qa-official-participant',
  is_test:false,
  match_id:'PI01',
  round:'play-in',
  song_id:'SONG26-019',
  guesses:[
    {song_id:'SONG26-019',guessed_participant_id:'p1'},
    {song_id:'SONG26-016',guessed_participant_id:'p2'}
  ]
};

const submitted=await jsonFetch(store,'matchup-submit',payload);
assert.equal(submitted.status,200,'atomic matchup submit should succeed');
assert.equal(submitted.body.guesses.length,2,'both guesses must persist with the vote');
assert.ok(submitted.body.matchup_submission_id,'matchup submission id is required');
assert.equal(submitted.body.vote.matchup_submission_id,submitted.body.matchup_submission_id);
for(const guess of submitted.body.guesses){
  assert.equal(guess.matchup_submission_id,submitted.body.matchup_submission_id);
  assert.equal(guess.match_vote_submission_id,submitted.body.vote.vote_submission_id);
  assert.equal(guess.guess_pool,'official');
  assert.equal(guess.excluded_from_official_guess_stats,false);
}
assert.ok(state.storage.alarm,'successful durable submit must schedule the Git mirror alarm');

const repeated=await jsonFetch(store,'matchup-submit',payload);
assert.equal(repeated.status,200,'identical resubmission must remain idempotent');
assert.equal(repeated.body.vote.vote_submission_id,submitted.body.vote.vote_submission_id);
assert.equal(repeated.body.matchup_submission_id,submitted.body.matchup_submission_id);

const conflicting=await jsonFetch(store,'matchup-submit',{
  ...payload,
  guesses:[
    {song_id:'SONG26-019',guessed_participant_id:'different'},
    {song_id:'SONG26-016',guessed_participant_id:'p2'}
  ]
});
assert.equal(conflicting.status,409,'a submitted matchup guess cannot be silently changed');

// Logout must no longer make Git availability a condition of ending the session.
const baseWorker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const logoutStart=baseWorker.indexOf("if(url.pathname==='/api/logout'");
const logoutEnd=baseWorker.indexOf("return jsonResponse({error:'Not found.'}",logoutStart);
assert.ok(logoutStart>=0&&logoutEnd>logoutStart,'logout handler must exist');
const logoutBlock=baseWorker.slice(logoutStart,logoutEnd);
assert.match(logoutBlock,/ctx\?\.waitUntil\?\.\(mirror\)/,'logout mirror must run as background best-effort work');
assert.match(logoutBlock,/mirror_sync:'scheduled'/,'logout must report scheduled mirror work');
assert.match(logoutBlock,/set-cookie.*clearCookie/s,'logout must clear the authenticated session immediately');
assert.ok(!logoutBlock.includes('Logout was cancelled'),'Git mirror failure must not cancel logout');
assert.ok(!logoutBlock.includes('if(!sr.ok) return'),'Git mirror response must not gate logout');

// A failed immediate flush retains the pre-existing alarm because only successful flush deletes it.
assert.match(baseWorker,/if\(action==='flush'\).*await this\.flushGit\(\); await this\.state\.storage\.deleteAlarm\(\)/s);

const releaseWorker=fs.readFileSync(new URL('../src/worker-v214-prod.js',import.meta.url),'utf8');
assert.match(releaseWorker,/v2\.14-prod/,'release marker must be v2.14-prod');
assert.match(releaseWorker,/durable-first-nonblocking-mirror/,'release must expose logout mode marker');

const wrangler=fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');
assert.match(wrangler,/"main"\s*:\s*"src\/worker-v214-prod\.js"/,'Wrangler must point at the v2.14 candidate entrypoint');

console.log('v2.14 ballot/logout regression: PASS');
