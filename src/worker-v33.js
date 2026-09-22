import workerV32, { ParticipantVoteStore as V32ParticipantVoteStore } from './worker-v32.js';

function repairAndValidate(source){
  source=source.replace(/  function makeSongCard\(\s*\n\s*function makeSongCard\(/g,'  function makeSongCard(');
  source=source.replace(/  function syncRoundAccess\(\)\{\s*\n\s*function syncRoundAccess\(\)\{/g,'  function syncRoundAccess(){');
  const required=[
    ['round-aware guess reader','function guessFor(round,songId)'],
    ['round-aware submit cache','sessionState.guesses[guessKey(match.dataset.round,g.song_id)]=g'],
    ['submission status control','data-admin-action="view-submissions"'],
    ['publication toggle','data-admin-action="toggle-results"'],
    ['compact published renderer','async function applyPublishedResults()']
  ];
  const missing=required.filter(([,needle])=>!source.includes(needle)).map(([name])=>name);
  const staleRoundGuess=/sessionState(?:\?|)\.guesses\?\.\[s\.dataset\.songId\]/.test(source);
  if(staleRoundGuess)missing.push('stale song-only guess lookup remains');
  return{source,missing};
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/guessing.js'){
      const response=await workerV32.fetch(request,env,ctx);
      if(!response.ok)return response;
      const checked=repairAndValidate(await response.text());
      if(checked.missing.length){
        console.error('HMPP V2.33 client patch validation failed',checked.missing);
        return new Response(`throw new Error(${JSON.stringify('HMPP V2.33 client patch validation failed: ')}+${JSON.stringify(checked.missing.join(', '))});`,{status:500,headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-hmpp-build':'v2.33-patch-guard'}});
      }
      const headers=new Headers(response.headers);headers.set('content-type','application/javascript; charset=utf-8');headers.set('cache-control','no-store');headers.set('x-hmpp-build','v2.33-round-safe');headers.set('x-hmpp-voting-guess-key','round-song');
      return new Response(checked.source,{status:response.status,headers});
    }
    return workerV32.fetch(request,env,ctx);
  }
};

export class ParticipantVoteStore extends V32ParticipantVoteStore {}
