import workerV38, { ParticipantVoteStore as V38ParticipantVoteStore } from './worker-v38.js';

const STAGING_HOST='pied-piper-tournament-of-champions-v2-test';

async function asset(env,request,path){
  const u=new URL(request.url);u.pathname=path;
  const r=await env.ASSETS.fetch(new Request(u.toString(),{method:'GET',headers:request.headers}));
  if(!r.ok)return r;
  const h=new Headers(r.headers);h.set('cache-control','no-store');h.set('x-hmpp-build','v2.39');
  return new Response(r.body,{status:r.status,headers:h});
}

function stripLegacyStats(response){
  return new HTMLRewriter()
    .on('script[src^="/stats-v3.js"]',{element(el){el.remove()}})
    .on('link[href^="/stats-v3.css"]',{element(el){el.remove()}})
    .transform(response);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),staging=url.hostname.includes(STAGING_HOST);
    if(url.pathname==='/published-results-v35.js')return asset(env,request,'/published-results-v39.js');
    const response=await workerV38.fetch(request,env,ctx);
    if(!staging)return response;
    if(!url.pathname.startsWith('/api/')&&(url.pathname==='/'||url.pathname==='/index.html')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      const transformed=stripLegacyStats(response);
      const h=new Headers(transformed.headers);h.set('cache-control','no-store');h.set('x-hmpp-build','v2.39-containment');
      return new Response(transformed.body,{status:transformed.status,headers:h});
    }
    return response;
  }
};

export class ParticipantVoteStore extends V38ParticipantVoteStore {}
