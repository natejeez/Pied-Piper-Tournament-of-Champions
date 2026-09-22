import workerV36, { ParticipantVoteStore as V36ParticipantVoteStore } from './worker-v36.js';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function guessKey(round,songId){return round==='play-in'?songId:round+':'+songId}

function stripSimulatedSession(body){
  const session=body?.session;
  if(!session)return body;
  const votes={};
  for(const [key,value] of Object.entries(session.votes||{}))if(value?.simulated_for_test!==true)votes[key]=value;
  const guesses={};
  for(const [key,value] of Object.entries(session.guesses||{}))if(value?.simulated_for_test!==true)guesses[key]=value;
  return {...body,session:{...session,votes,guesses}};
}

async function asset(env,request,path){
  const url=new URL(request.url);url.pathname=path;
  const response=await env.ASSETS.fetch(new Request(url.toString(),{method:'GET',headers:request.headers}));
  if(!response.ok)return response;
  const headers=new Headers(response.headers);headers.set('cache-control','no-store');headers.set('x-hmpp-build','v2.37');
  return new Response(response.body,{status:response.status,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/session'&&request.method==='GET'){
      const response=await workerV36.fetch(request,env,ctx);
      if(!response.ok)return response;
      const body=await response.json().catch(()=>null);
      return body?json(stripSimulatedSession(body),response.status):response;
    }
    if(url.pathname==='/v32-controls.js')return asset(env,request,'/v37-controls.js');
    if(url.pathname==='/published-results-v35.js')return asset(env,request,'/published-results-v37.js');
    return workerV36.fetch(request,env,ctx);
  }
};

export class ParticipantVoteStore extends V36ParticipantVoteStore{
  async fetch(request){
    const action=new URL(request.url).pathname.slice(1);
    if(action==='matchup-submit'){
      const body=await request.clone().json().catch(()=>({}));
      if(body.round&&body.round!=='play-in'){
        const votes=(await this.state.storage.get('votes'))||{};
        const guesses=(await this.state.storage.get('guesses'))||{};
        let changed=false;
        const existingVote=votes[body.match_id];
        if(existingVote?.simulated_for_test===true){delete votes[body.match_id];changed=true}
        for(const g of Array.isArray(body.guesses)?body.guesses:[]){
          const key=guessKey(body.round,g.song_id);
          if(guesses[key]?.simulated_for_test===true){delete guesses[key];changed=true}
        }
        if(changed){await this.state.storage.put('votes',votes);await this.state.storage.put('guesses',guesses)}
      }
    }
    return super.fetch(request);
  }
}
