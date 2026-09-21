import workerV213, { ParticipantVoteStore as V213ParticipantVoteStore } from './worker-v213.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';
const ADMIN_STORE_ID = '__hmpp_tournament_admin__';
const SIMULATED_IDS = new Set(['juh','chuck','jj']);
const PLAYIN = {
  PI01:['SONG26-019','SONG26-016'], PI02:['SONG26-042','SONG26-001'],
  PI03:['SONG26-052','SONG26-031'], PI04:['SONG26-051','SONG26-057'],
  PI05:['SONG26-069','SONG26-034'], PI06:['SONG26-028','SONG26-062'],
  PI07:['SONG26-044','SONG26-020'], PI08:['SONG26-066','SONG26-003']
};

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function store(env,id,action,payload={}){const stub=env.PARTICIPANT_VOTES.get(env.PARTICIPANT_VOTES.idFromName(id));return stub.fetch('https://vote-store.internal/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({participant_id:id,...payload})})}
async function sessionFor(request,env,ctx){const r=await workerV213.fetch(new Request(new URL('/api/session',request.url),{method:'GET',headers:request.headers}),env,ctx);let body={};try{body=await r.clone().json()}catch{}return{r,session:body.session||null}}
async function directory(env){const r=await env.ASSETS.fetch(new Request('https://assets.local/data/2026/participants/public.json'));if(!r.ok)throw new Error('Participant directory unavailable.');return (await r.json()).participants||[]}
function hashSeed(text){let h=2166136261>>>0;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pick(arr,r){return arr[Math.floor(r()*arr.length)]}
async function productionBallot(env,id){const repo=env.GITHUB_REPO||'natejeez/Pied-Piper-Tournament-of-Champions';const api=`https://api.github.com/repos/${repo}/contents/data/2026/votes/by-participant/${id}.json?ref=main`;const headers={'accept':'application/vnd.github+json','user-agent':'HMPP-2026-Worker','x-github-api-version':'2022-11-28',...(env.GITHUB_TOKEN?{'authorization':`Bearer ${env.GITHUB_TOKEN}`}:{})};const r=await fetch(api,{headers});if(!r.ok)throw new Error(`Could not read production ballot for ${id} (${r.status}).`);return r.json()}
function completeBallot(id,source,participantIds){const realVotes=source?.votes||{},realGuesses=source?.guesses||{},votes={},guesses={};const random=rng(hashSeed('hmpp-2026-playin-fixture:'+id));let simulatedVotes=0,simulatedGuesses=0;for(const [matchId,songs] of Object.entries(PLAYIN)){const existing=realVotes[matchId];const selected=existing&&songs.includes(existing.song_id)?existing.song_id:pick(songs,random);if(existing&&songs.includes(existing.song_id))votes[matchId]=existing;else{simulatedVotes++;votes[matchId]={vote_submission_id:`SIMVOTE-${id}-${matchId}`,matchup_submission_id:`SIMMATCH-${id}-${matchId}`,match_id:matchId,round:'play-in',song_id:selected,submitted_at:'2026-09-20T00:00:00.000Z',vote_pool:'official',excluded_from_official_totals:false,simulated_for_test:true}}for(const songId of songs){const g=realGuesses[songId];if(g?.guessed_participant_id&&participantIds.includes(g.guessed_participant_id))guesses[songId]=g;else{simulatedGuesses++;guesses[songId]={guess_submission_id:`SIMGUESS-${id}-${songId}`,guess_batch_id:`SIMMATCH-${id}-${matchId}`,matchup_submission_id:`SIMMATCH-${id}-${matchId}`,match_id:matchId,round:'play-in',song_id:songId,guessed_participant_id:pick(participantIds,random),match_vote_song_id_at_submission:selected,match_vote_submission_id:votes[matchId].vote_submission_id,submitted_at:'2026-09-20T00:00:00.000Z',guess_pool:'official',excluded_from_official_guess_stats:false,simulated_for_test:true}}}}return{votes,guesses,simulatedVotes,simulatedGuesses}}
async function roundStats(env,round,aggregate){if(!aggregate?.results?.length)return null;const participants=(await directory(env)).filter(p=>!p.is_test);const states=await Promise.all(participants.map(async p=>{const r=await store(env,p.id,'state',{is_test:false});return{id:p.id,name:p.name,state:r.ok?await r.json():{votes:{},guesses:{}}}}));const nameById=Object.fromEntries(participants.map(p=>[p.id,p.name]));const allGuessCounts={};const matches=aggregate.results.map(result=>{const total=result.total_votes||0;const songs=result.songs.map(song=>{const counts={};for(const entry of states){const g=entry.state.guesses?.[song.song_id];if(g?.round===round&&g.guessed_participant_id){counts[g.guessed_participant_id]=(counts[g.guessed_participant_id]||0)+1;allGuessCounts[g.guessed_participant_id]=(allGuessCounts[g.guessed_participant_id]||0)+1}}const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([id,count])=>({id,name:nameById[id]||id,count}));return{id:song.song_id,vote_count:song.votes,vote_share:total?song.votes/total:0,top_guesses:top}});return{id:result.match_id,total_votes:total,winner_song_id:result.winner_song_id,tied:result.tied,songs}});const margins=matches.map(m=>({id:m.id,margin:Math.abs((m.songs[0]?.vote_count||0)-(m.songs[1]?.vote_count||0))}));const most=Object.entries(allGuessCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];return{round,source:'durable-object-aggregate',voter_count:aggregate.official_participants,matches,summary:{closest:[...margins].sort((a,b)=>a.margin-b.margin)[0]||null,widest:[...margins].sort((a,b)=>b.margin-a.margin)[0]||null,most_guessed:most?{id:most[0],name:nameById[most[0]]||most[0],count:most[1]}:null}}}
async function seedProductionPlayin(request,env,ctx){const {r,session}=await sessionFor(request,env,ctx);if(!r.ok)return r;if(!session?.is_test||session.participant_id!=='test-voter')return json({error:'Test Voter administrator access required.'},403);const participants=(await directory(env)).filter(p=>!p.is_test);const ids=participants.map(p=>p.id);const seeded=[];for(const p of participants){const raw=await productionBallot(env,p.id);const source=raw.content?JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw.content.replace(/\n/g,'')),c=>c.charCodeAt(0)))):raw;const beforeVotes=Object.values(source.votes||{}).filter(v=>v.round==='play-in').length;const beforeGuesses=Object.values(source.guesses||{}).filter(g=>g.round==='play-in').length;if((beforeVotes<8||beforeGuesses<16)&&!SIMULATED_IDS.has(p.id))throw new Error(`${p.name} is incomplete in production and is not approved for simulation.`);const completed=completeBallot(p.id,source,ids);const s=await store(env,p.id,'admin-seed-round',{round:'play-in',votes:completed.votes,guesses:completed.guesses,is_test:false});if(!s.ok)throw new Error(`Could not seed ${p.name}.`);seeded.push({participant_id:p.id,name:p.name,production_votes:beforeVotes,production_guesses:beforeGuesses,simulated_votes:completed.simulatedVotes,simulated_guesses:completed.simulatedGuesses})}
  await store(env,ADMIN_STORE_ID,'admin-set',{state:{schema_version:1,tournament:'HMPP-2026',results_visible:{},published_rounds:{'play-in':true},published_results:{},published_matchups:{},events:[]}});
  const adminReq=new Request(new URL('/api/admin/round?round=play-in',request.url),{method:'GET',headers:request.headers});const adminRes=await workerV213.fetch(adminReq,env,ctx);const body=await adminRes.json();body.stats=await roundStats(env,'play-in',body.aggregate);return json({ok:true,mode:'production-plus-approved-simulation',simulated_participants:[...SIMULATED_IDS],seeded,aggregate:body.aggregate,stats:body.stats});
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const staging=url.hostname.includes(STAGING_HOST);
    if(staging&&url.pathname==='/api/admin/seed-production-playin'&&request.method==='POST'){
      try{return await seedProductionPlayin(request,env,ctx)}catch(error){console.error(error);return json({error:error.message||'Unable to seed play-in QA data.'},500)}
    }
    const response = await workerV213.fetch(request, env, ctx);
    if(staging&&url.pathname==='/api/admin/round'&&request.method==='GET'&&response.ok){try{const body=await response.clone().json();if(body.aggregate){body.stats=await roundStats(env,url.searchParams.get('round')||'play-in',body.aggregate);return json(body)}}catch(error){console.error(error)}}
    if (!staging) return response;
    if (!url.pathname.startsWith('/api/') && (url.pathname === '/' || url.pathname === '/index.html') && response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const transformed = new HTMLRewriter().on('head', { element(el) { el.append('<link rel="stylesheet" href="/stats-v3.css?v=3.1.0"><script type="module" src="/stats-v3.js?v=3.1.0"></script>', { html:true }); } }).transform(response);
      const headers = new Headers(transformed.headers); headers.set('cache-control', 'no-store'); headers.set('x-hmpp-build', 'v3.1-stats-qa');
      return new Response(transformed.body, { status:transformed.status, headers });
    }
    return response;
  }
};

export class ParticipantVoteStore extends V213ParticipantVoteStore {
  async fetch(request){
    const action=new URL(request.url).pathname.slice(1);const body=await request.clone().json().catch(()=>({}));
    if(action==='admin-seed-round'){
      if(body.participant_id)await this.state.storage.put('participant_id',body.participant_id);
      await this.state.storage.put('is_test',false);
      const round=body.round;let votes=(await this.state.storage.get('votes'))||{},guesses=(await this.state.storage.get('guesses'))||{};
      votes=Object.fromEntries(Object.entries(votes).filter(([,v])=>v.round!==round));guesses=Object.fromEntries(Object.entries(guesses).filter(([,g])=>g.round!==round));
      votes={...votes,...(body.votes||{})};guesses={...guesses,...(body.guesses||{})};
      await this.state.storage.put('votes',votes);await this.state.storage.put('guesses',guesses);await this.state.storage.deleteAlarm();
      return json({ok:true,round,votes_seeded:Object.keys(body.votes||{}).length,guesses_seeded:Object.keys(body.guesses||{}).length});
    }
    return super.fetch(request);
  }
}
