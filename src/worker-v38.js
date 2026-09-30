import workerV37, { ParticipantVoteStore as V37ParticipantVoteStore } from './worker-v37.js';

const STAGING_HOST='pied-piper-tournament-of-champions-v2-test';
const PLAYIN={
  PI01:['SONG26-019','SONG26-016'],PI02:['SONG26-042','SONG26-001'],PI03:['SONG26-052','SONG26-031'],PI04:['SONG26-051','SONG26-057'],
  PI05:['SONG26-069','SONG26-034'],PI06:['SONG26-028','SONG26-062'],PI07:['SONG26-044','SONG26-020'],PI08:['SONG26-066','SONG26-003']
};

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function store(env,id,action,payload={}){const stub=env.PARTICIPANT_VOTES.get(env.PARTICIPANT_VOTES.idFromName(id));return stub.fetch('https://vote-store.internal/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({participant_id:id,...payload})})}
function guessKey(round,songId){return round==='play-in'?songId:round+':'+songId}
function findGuess(guesses,round,songId){return guesses?.[guessKey(round,songId)]||Object.values(guesses||{}).find(g=>g?.round===round&&g?.song_id===songId)||null}
async function sessionFor(request,env,ctx){const r=await workerV37.fetch(new Request(new URL('/api/session',request.url),{method:'GET',headers:request.headers}),env,ctx);let body={};try{body=await r.clone().json()}catch{}return{response:r,session:body.session||null}}
async function directory(env){const r=await env.ASSETS.fetch(new Request('https://assets.local/data/2026/participants/public.json'));if(!r.ok)throw new Error('Participant directory unavailable.');return(await r.json()).participants||[]}
async function tournamentState(request,env,ctx){const r=await workerV37.fetch(new Request(new URL('/api/tournament-state',request.url),{method:'GET',headers:request.headers}),env,ctx);if(!r.ok)return null;try{return(await r.json()).state||null}catch{return null}}
async function productionBallot(env,id){const repo=env.GITHUB_REPO||'natejeez/Pied-Piper-Tournament-of-Champions';const api='https://api.github.com/repos/'+repo+'/contents/data/2026/votes/by-participant/'+id+'.json?ref=main';const headers={'accept':'application/vnd.github+json','user-agent':'HMPP-2026-Worker','x-github-api-version':'2022-11-28',...(env.GITHUB_TOKEN?{'authorization':'Bearer '+env.GITHUB_TOKEN}:{})};const r=await fetch(api,{headers});if(!r.ok)return{votes:{},guesses:{}};const raw=await r.json();if(!raw.content)return raw;const decoded=atob(raw.content.replace(/\n/g,''));return JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded,c=>c.charCodeAt(0))))}
async function matchesForRound(request,env,ctx,round){if(round==='play-in')return Object.entries(PLAYIN).map(([match_id,songs])=>({match_id,round,songs}));const state=await tournamentState(request,env,ctx);return(Array.isArray(state?.published_matchups?.[round])?state.published_matchups[round]:[]).filter(m=>m?.songs?.length===2)}

async function productionRoundResults(request,env,ctx){
  const {response,session}=await sessionFor(request,env,ctx);if(!response.ok)return response;if(!session?.is_test||session.participant_id!=='test-voter')return json({error:'Test Voter administrator access required.'},403);
  const round=new URL(request.url).searchParams.get('round')||'play-in',matches=await matchesForRound(request,env,ctx,round);if(!matches.length)return json({error:'No active matchups are available for this production round.'},409);
  const people=(await directory(env)).filter(p=>!p.is_test),rows=[],states=[];
  for(const p of people){const ballot=await productionBallot(env,p.id);states.push({id:p.id,name:p.name,ballot});let submitted=0;for(const m of matches){const vote=ballot.votes?.[m.match_id],complete=!!vote&&vote.round===round&&m.songs.includes(vote.song_id)&&m.songs.every(s=>!!findGuess(ballot.guesses,round,s));if(complete)submitted++}rows.push({participant_id:p.id,name:p.name,submitted_matchups:submitted,expected_matchups:matches.length,complete:submitted===matches.length})}
  const results=matches.map(m=>{const counts=Object.fromEntries(m.songs.map(s=>[s,0]));for(const entry of states){const v=entry.ballot.votes?.[m.match_id];if(v?.round===round&&Object.prototype.hasOwnProperty.call(counts,v.song_id))counts[v.song_id]++}const total=Object.values(counts).reduce((a,b)=>a+b,0),ordered=Object.entries(counts).sort((a,b)=>b[1]-a[1]),complete=total===people.length,tied=complete&&ordered.length>1&&ordered[0][1]===ordered[1][1];return{match_id:m.match_id,round,total_votes:total,complete,tied,winner_song_id:complete&&!tied?ordered[0][0]:null,songs:m.songs.map(song_id=>({song_id,votes:counts[song_id]}))}});
  const missing=rows.filter(x=>!x.complete);return json({ok:true,round,source:'production-main-git-mirror',official_participants:people.length,expected_votes:people.length*matches.length,received_votes:results.reduce((n,r)=>n+r.total_votes,0),all_complete:missing.length===0,participants:rows,missing_participants:missing,results});
}

async function clearSimulation(request,env,ctx){
  const {response,session}=await sessionFor(request,env,ctx);if(!response.ok)return response;if(!session?.is_test||session.participant_id!=='test-voter')return json({error:'Test Voter administrator access required.'},403);
  const body=await request.json().catch(()=>({})),round=body.round||'play-in',people=(await directory(env)).filter(p=>!p.is_test);const summaries=[];
  for(const p of people){const r=await store(env,p.id,'admin-clear-simulated-round',{round,is_test:false});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error('Could not clear simulated data for '+p.name+'.');summaries.push({participant_id:p.id,name:p.name,votes_removed:d.votes_removed||0,guesses_removed:d.guesses_removed||0})}
  return json({ok:true,round,votes_removed:summaries.reduce((n,x)=>n+x.votes_removed,0),guesses_removed:summaries.reduce((n,x)=>n+x.guesses_removed,0),summaries});
}

async function asset(env,request,path){const u=new URL(request.url);u.pathname=path;const r=await env.ASSETS.fetch(new Request(u.toString(),{method:'GET',headers:request.headers}));if(!r.ok)return r;const h=new Headers(r.headers);h.set('cache-control','no-store');h.set('x-hmpp-build','v2.38');return new Response(r.body,{status:r.status,headers:h})}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),staging=url.hostname.includes(STAGING_HOST);
    if(staging&&url.pathname==='/api/admin/production-round-results'&&request.method==='GET')try{return await productionRoundResults(request,env,ctx)}catch(e){console.error(e);return json({error:e.message||'Unable to read production results.'},500)}
    if(staging&&url.pathname==='/api/admin/clear-simulation'&&request.method==='POST')try{return await clearSimulation(request,env,ctx)}catch(e){console.error(e);return json({error:e.message||'Unable to clear simulated data.'},500)}
    if(url.pathname==='/v32-controls.js')return asset(env,request,'/v38-controls.js');
    if(url.pathname==='/dev-reset-v29.js')return asset(env,request,'/dev-reset-v38.js');
    const response=await workerV37.fetch(request,env,ctx);
    if(staging&&!url.pathname.startsWith('/api/')&&(url.pathname==='/'||url.pathname==='/index.html')&&response.ok){const h=new Headers(response.headers);h.set('x-hmpp-build','v2.38-admin-controls');h.set('cache-control','no-store');return new Response(response.body,{status:response.status,headers:h})}
    return response;
  }
};

export class ParticipantVoteStore extends V37ParticipantVoteStore{
  async fetch(request){
    const action=new URL(request.url).pathname.slice(1),body=await request.clone().json().catch(()=>({}));
    if(action==='admin-clear-simulated-round'){
      const round=body.round;let votes=(await this.state.storage.get('votes'))||{},guesses=(await this.state.storage.get('guesses'))||{};const beforeVotes=Object.keys(votes).length,beforeGuesses=Object.keys(guesses).length;
      votes=Object.fromEntries(Object.entries(votes).filter(([,v])=>!(v?.round===round&&v?.simulated_for_test===true)));
      guesses=Object.fromEntries(Object.entries(guesses).filter(([,g])=>!(g?.round===round&&g?.simulated_for_test===true)));
      await this.state.storage.put('votes',votes);await this.state.storage.put('guesses',guesses);await this.state.storage.deleteAlarm();
      return json({ok:true,round,votes_removed:beforeVotes-Object.keys(votes).length,guesses_removed:beforeGuesses-Object.keys(guesses).length});
    }
    return super.fetch(request);
  }
}
