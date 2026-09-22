import workerV34, { ParticipantVoteStore as V34ParticipantVoteStore } from './worker-v34.js';

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const response=await workerV34.fetch(request,env,ctx);
    if(!url.pathname.startsWith('/api/')&&(url.pathname==='/'||url.pathname==='/index.html')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      const transformed=new HTMLRewriter().on('head',{
        element(el){
          el.append('<script src="/published-results-v35.js?v=2.35.0" defer></script>',{html:true});
        }
      }).transform(response);
      const headers=new Headers(transformed.headers);
      headers.set('cache-control','no-store');
      headers.set('x-hmpp-build','v2.35-published-results');
      return new Response(transformed.body,{status:transformed.status,headers});
    }
    return response;
  }
};

export class ParticipantVoteStore extends V34ParticipantVoteStore {}
