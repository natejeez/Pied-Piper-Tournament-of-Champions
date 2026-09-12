import workerV23, { ParticipantVoteStore as V23ParticipantVoteStore } from './worker-v23.js';

const TEST_PARTICIPANT_ID='test-voter';
const AUTO_RESET_MARKER='test-voter-all-rounds-reset-v231';

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
}
function store(env,id,action,payload={}){
  const stub=env.PARTICIPANT_VOTES.get(env.PARTICIPANT_VOTES.idFromName(id));
  return stub.fetch('https://vote-store.internal/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({participant_id:id,...payload})});
}
async function currentSession(request,env,ctx){
  const u=new URL('/api/session',request.url);
  const r=await workerV23.fetch(new Request(u,{method:'GET',headers:request.headers}),env,ctx);
  if(!r.ok)return null;
  const body=await r.json().catch(()=>null);
  return body?.session||null;
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/admin/reset-test-round'&&request.method==='POST'){
      try{
        const session=await currentSession(request,env,ctx);
        if(!session)return json({error:'Authentication required.'},401);
        if(session.is_test!==true||session.participant_id!==TEST_PARTICIPANT_ID)return json({error:'Test Voter access required.'},403);
        const body=await request.json().catch(()=>({}));
        const round=body.round;
        if(!['play-in','round-of-64'].includes(round))return json({error:'This test reset supports Play-In and Round of 64.'},400);
        const r=await store(env,TEST_PARTICIPANT_ID,'reset-round',{round,is_test:true});
        const data=await r.json().catch(()=>({error:'Reset failed.'}));
        return json(data,r.status);
      }catch(err){console.error(err);return json({error:'Server error.'},500)}
    }

    const response=await workerV23.fetch(request,env,ctx);
    if(!url.pathname.startsWith('/api/')&&(url.pathname==='/'||url.pathname==='/index.html')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      return new HTMLRewriter().on('head',{element(el){el.append('<script src="/reset-v231.js" defer></script>',{html:true})}}).transform(response);
    }
    return response;
  }
};

export class ParticipantVoteStore extends V23ParticipantVoteStore {
  async fetch(request){
    const action=new URL(request.url).pathname.slice(1);
    const body=await request.clone().json().catch(()=>({}));

    if(action==='state'&&body.participant_id===TEST_PARTICIPANT_ID&&(await this.state.storage.get(AUTO_RESET_MARKER))!==true){
      await this.state.storage.put('votes',{});
      await this.state.storage.put('guesses',{});
      await this.state.storage.put(AUTO_RESET_MARKER,true);
      await this.state.storage.setAlarm(Date.now()+1000);
    }

    if(action==='reset-round'){
      if(body.participant_id!==TEST_PARTICIPANT_ID)return json({error:'Test Voter access required.'},403);
      const round=body.round;
      if(!['play-in','round-of-64'].includes(round))return json({error:'Unsupported test round.'},400);
      const votes=(await this.state.storage.get('votes'))||{};
      const guesses=(await this.state.storage.get('guesses'))||{};
      const nextVotes=Object.fromEntries(Object.entries(votes).filter(([,v])=>v.round!==round));
      const nextGuesses=Object.fromEntries(Object.entries(guesses).filter(([,g])=>g.round!==round));
      const removedVotes=Object.keys(votes).length-Object.keys(nextVotes).length;
      const removedGuesses=Object.keys(guesses).length-Object.keys(nextGuesses).length;
      await this.state.storage.put('votes',nextVotes);
      await this.state.storage.put('guesses',nextGuesses);
      await this.flushGit();
      return json({ok:true,round,removed_votes:removedVotes,removed_guesses:removedGuesses,votes:nextVotes,guesses:nextGuesses});
    }

    return super.fetch(request);
  }
}
