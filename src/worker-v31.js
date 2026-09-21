import workerV3, { ParticipantVoteStore as V3ParticipantVoteStore } from './worker-v3.js';

const SESSION_COOKIE='hmpp_session';
const RETRY_DELAYS_MS=[0,1000,5000,15000];

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}
  });
}
function clearCookie(){return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}
function store(env,id,action,payload={}){
  const stub=env.PARTICIPANT_VOTES.get(env.PARTICIPANT_VOTES.idFromName(id));
  return stub.fetch('https://vote-store.internal/'+action,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({participant_id:id,...payload})
  });
}
async function sessionFor(request,env,ctx){
  const r=await workerV3.fetch(new Request(new URL('/api/session',request.url),{
    method:'GET',
    headers:request.headers
  }),env,ctx);
  let body={};
  try{body=await r.clone().json()}catch{}
  return{response:r,session:body.session||null};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function flushWithRetry(env,participantId,isTest){
  let lastStatus=null;
  for(let i=0;i<RETRY_DELAYS_MS.length;i++){
    const delay=RETRY_DELAYS_MS[i];
    if(delay)await sleep(delay);
    try{
      const r=await store(env,participantId,'flush',{is_test:isTest});
      lastStatus=r.status;
      if(r.ok){
        console.log('HMPP background Git mirror synced',{participant_id:participantId,attempt:i+1});
        return true;
      }
      console.warn('HMPP background Git mirror retry needed',{participant_id:participantId,attempt:i+1,status:r.status});
    }catch(error){
      console.warn('HMPP background Git mirror error',{participant_id:participantId,attempt:i+1,error:String(error)});
    }
  }
  console.error('HMPP background Git mirror still pending after retries',{participant_id:participantId,last_status:lastStatus});
  return false;
}

async function updateLogoutUx(response){
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  html=html.replace(
    'Your submitted votes will be synced before you are logged out.',
    'Your submitted votes are already saved. Audit backup synchronization continues automatically after logout.'
  );
  html=html.replace("b.textContent='Syncing…'","b.textContent='Logging out…'");
  html=html.replace(
    "alert('Could not safely sync votes before logout. Please try again.')",
    "alert('Could not log out. Please check your connection and try again.')"
  );
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store');
  headers.set('x-hmpp-logout-ui','durable-first-v31');
  return new Response(html,{status:response.status,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/logout'&&request.method==='POST'){
      const {response,session}=await sessionFor(request,env,ctx);
      if(!response.ok||!session)return response;

      // Durable Object storage is authoritative. A submitted matchup is already persisted
      // before logout. GitHub is an audit mirror only, so mirror failures must not trap users
      // in an authenticated session or imply that their saved ballot was lost.
      ctx.waitUntil(flushWithRetry(env,session.participant_id,session.is_test===true));
      return json({
        ok:true,
        ballot_storage:'durable-object',
        mirror_sync:'background',
        message:'Submitted votes are saved. Audit mirror synchronization will continue in the background.'
      },200,{'set-cookie':clearCookie(),'x-hmpp-logout':'nonblocking-v31'});
    }

    const response=await workerV3.fetch(request,env,ctx);
    if(!url.pathname.startsWith('/api/')&&(url.pathname==='/'||url.pathname==='/index.html'))return updateLogoutUx(response);
    return response;
  }
};

export class ParticipantVoteStore extends V3ParticipantVoteStore {}
