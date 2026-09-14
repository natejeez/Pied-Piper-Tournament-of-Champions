import workerV29, { ParticipantVoteStore as V29ParticipantVoteStore } from './worker-v29.js';

const LEGACY_VOTE_BRANCH = "const v=e.target.closest('.vote-btn.ready');if(v)beginVote(v)";
const LEGACY_VOTE_REPLACEMENT = "/* v2.13 production: atomic matchup voting owns .vote-btn.ready */";

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) return { source, replaced:false };
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) return { source, replaced:false };
  return { source:source.slice(0, start) + replacement + source.slice(end), replaced:true };
}

const SAFE_SELECT = `  function selectVote(btn){
    const song=btn?.closest?.('.song'),match=song?.closest?.('.match');
    if(!song||!match||match.classList.contains('submitted'))return;
    match.querySelectorAll('.player-slot').forEach(slot=>{slot.classList.remove('open');slot.replaceChildren()});
    match.querySelectorAll('.listen-btn').forEach(b=>b.setAttribute('aria-expanded','false'));
    pendingVotes.set(match.dataset.matchId,song.dataset.songId);
    renderGuessControls(match,song.dataset.songId);
    updateMatchSubmit(match);
  }`;

const SAFE_SUBMIT = `  async function submitMatchup(match,voteSongId,selects){
    const guesses=selects.map(s=>({song_id:s.dataset.songId,guessed_participant_id:s.value}));
    const payload={match_id:match.dataset.matchId,round:match.dataset.round,song_id:voteSongId,guesses};
    const data=await api('/api/matchup-submission',{method:'POST',body:JSON.stringify(payload)});
    if(!data?.vote)throw new Error('Matchup submission returned an incomplete response. Refresh before trying again.');
    sessionState=sessionState||{votes:{},guesses:{}};
    sessionState.votes=sessionState.votes||{};
    sessionState.guesses=sessionState.guesses||{};
    sessionState.votes[match.dataset.matchId]=data.vote;
    const returnedGuesses=Array.isArray(data.guesses)?data.guesses:Object.values(data.guesses||{});
    returnedGuesses.forEach(g=>{if(g?.song_id)sessionState.guesses[g.song_id]=g});
    pendingVotes.delete(match.dataset.matchId);
    try{
      collapseMatch(match,voteSongId);
      await maybeShowRoundComplete();
    }catch(uiError){
      console.error('Matchup saved, but post-submit UI refresh failed.',uiError);
      try{await refreshSession()}catch{}
    }
    return data;
  }`;

const SAFE_COLLAPSE = `  function collapseMatch(match,voteSongId){
    if(!match)return;
    clearPendingUI(match); match.classList.add('submitted');
    matchSongs(match).forEach(s=>{
      const picked=s.dataset.songId===voteSongId;
      s.classList.toggle('vote-winner',picked);s.classList.toggle('vote-loser',!picked);
      $('.winner-check',s)?.remove();$$('.submitted-guess',s).forEach(x=>x.remove());
      const slot=$('.player-slot',s);if(slot){slot.classList.remove('open');slot.replaceChildren()}
      const l=$('.listen-btn',s);if(l)l.setAttribute('aria-expanded','false');
      if(picked){const c=document.createElement('span');c.className='winner-check';c.setAttribute('aria-label','Your selected song');c.title='Your selected song';c.textContent='✓';s.appendChild(c)}
      const guess=sessionState?.guesses?.[s.dataset.songId];
      if(guess){
        const detail=document.createElement('div');detail.className='submitted-guess';
        const label=document.createElement('div');label.className='submitted-guess-label';label.textContent='Which Harry Man Submitted...?';
        const value=document.createElement('div');value.className='submitted-guess-value';
        value.textContent=participants.find(p=>p.id===guess.guessed_participant_id)?.name||guess.guessed_participant_id||'';
        detail.append(label,value);$('.artist',s)?.insertAdjacentElement('afterend',detail);
      }
    });
  }`;

const ACCOUNT_ONLY_OBSERVER = `  function observeApp(){
    const account=$('#accountBtn');
    if(!account)return;
    accountSnapshot=account.textContent||'';
    const syncAccount=()=>{
      const text=account.textContent||'';
      if(text===accountSnapshot)return;
      accountSnapshot=text;
      if(text.trim()==='Log in'){
        sessionState=null;pendingVotes.clear();
        $$('.dev-song-id,#devModeBanner,#devAdminPanel').forEach(x=>x.remove());
        return;
      }
      setTimeout(refreshSession,50);
    };
    new MutationObserver(syncAccount).observe(account,{childList:true,subtree:true,characterData:true});
  }`;

function patchGuessing(original) {
  let source=original;
  const applied=[];
  let patch=replaceBlock(source,'  function selectVote(btn){','\n\n  function confirmMatchup(match){',SAFE_SELECT);
  source=patch.source;if(patch.replaced)applied.push('select');
  patch=replaceBlock(source,'  async function submitMatchup(match,voteSongId,selects){','\n\n  function collapseMatch(match,voteSongId){',SAFE_SUBMIT);
  source=patch.source;if(patch.replaced)applied.push('submit');
  patch=replaceBlock(source,'  function collapseMatch(match,voteSongId){','\n\n  function renderSessionState(){',SAFE_COLLAPSE);
  source=patch.source;if(patch.replaced)applied.push('submitted-guesses');
  patch=replaceBlock(source,'  function observeApp(){',"\n\n  document.addEventListener('click',e=>{",ACCOUNT_ONLY_OBSERVER);
  source=patch.source;if(patch.replaced)applied.push('observer');
  return {source,applied};
}

const REQUIRED=['select','submit','submitted-guesses','observer'];

function withHeaders(response, extra={}) {
  const headers=new Headers(response.headers);
  for(const [key,value] of Object.entries(extra))headers.set(key,value);
  return headers;
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(url.pathname==='/guessing.js'){
      const asset=await env.ASSETS.fetch(request);
      if(!asset.ok)return asset;
      const patched=patchGuessing(await asset.text());
      const missing=REQUIRED.filter(name=>!patched.applied.includes(name));
      if(missing.length){
        console.error('HMPP v2.13 production client patch mismatch',{applied:patched.applied,missing});
        return new Response(`throw new Error(${JSON.stringify('HMPP v2.13 production client build mismatch: ')}+${JSON.stringify(missing.join(','))});`,{
          status:500,
          headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-hmpp-build':'v2.13-prod'}
        });
      }
      const headers=new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-store');
      headers.set('x-hmpp-build','v2.13-prod');
      headers.set('x-hmpp-voting-owner','modal-atomic-matchup');
      headers.set('x-hmpp-client-fixes',patched.applied.join(','));
      return new Response(patched.source,{status:asset.status,headers});
    }

    const response=await workerV29.fetch(request,env,ctx);
    if(!url.pathname.startsWith('/api/')&&(url.pathname==='/'||url.pathname==='/index.html')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      if(!html.includes(LEGACY_VOTE_BRANCH)){
        console.error('HMPP v2.13 production could not locate legacy single-vote click branch.');
        return new Response('Production client build mismatch: legacy vote handler was not found.',{
          status:500,
          headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-hmpp-build':'v2.13-prod'}
        });
      }
      html=html.replace(LEGACY_VOTE_BRANCH,LEGACY_VOTE_REPLACEMENT);
      return new Response(html,{
        status:response.status,
        headers:withHeaders(response,{
          'cache-control':'no-store',
          'x-hmpp-build':'v2.13-prod',
          'x-hmpp-voting-owner':'modal-atomic-matchup',
          'x-hmpp-legacy-vote-handler':'disabled'
        })
      });
    }

    return response;
  }
};

export class ParticipantVoteStore extends V29ParticipantVoteStore {}
