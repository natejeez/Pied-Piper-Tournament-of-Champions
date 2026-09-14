import workerV211, { ParticipantVoteStore as V211ParticipantVoteStore } from './worker-v211.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) return { source, replaced:false };
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) return { source, replaced:false };
  return { source:source.slice(0, start) + replacement + source.slice(end), replaced:true };
}

const SAFE_QUERY_HELPERS = `  const $=(s,root=document)=>root?.querySelector?.(s)??null;
  const $$=(s,root=document)=>root?.querySelectorAll?[...root.querySelectorAll(s)]:[];`;

const RESULTS_ONLY_DIALOGS = `  function installDialogs(){
    if(!$('#resultsModal')){
      const el=document.createElement('div'); el.className='workflow-modal-backdrop'; el.id='resultsModal'; el.hidden=true;
      el.innerHTML='<div class="workflow-modal workflow-results-modal" role="dialog" aria-modal="true" aria-labelledby="resultsModalTitle"><div class="workflow-kicker">DEV RESULTS PREVIEW</div><h2 id="resultsModalTitle">Previous-round results</h2><div id="resultsModalBody" class="results-modal-body"></div><div class="workflow-modal-actions"><button id="resultsModalClose" class="primary" type="button">Close</button></div></div>';
      document.body.appendChild(el); $('#resultsModalClose')?.addEventListener('click',()=>closeWorkflowModal(el));
    }
  }`;

const SAFE_SELECT = `  function selectVote(btn){
    const song=btn?.closest?.('.song'),match=song?.closest?.('.match');
    if(!song||!match||match.classList.contains('submitted'))return;
    match.querySelectorAll('.player-slot').forEach(slot=>{slot.classList.remove('open');slot.replaceChildren()});
    match.querySelectorAll('.listen-btn').forEach(b=>b.setAttribute('aria-expanded','false'));
    pendingVotes.set(match.dataset.matchId,song.dataset.songId);
    renderGuessControls(match,song.dataset.songId);
    updateMatchSubmit(match);
  }`;

const DIRECT_SUBMISSION = `  async function confirmMatchup(match){
    if(!match||match.classList.contains('submitted'))return;
    const voteSongId=sessionState?.votes?.[match.dataset.matchId]?.song_id||pendingVotes.get(match.dataset.matchId);
    if(!voteSongId)return;
    const selects=$$('.guess-select',match);
    if(selects.length!==2||!selects.every(s=>s.value))return;
    const guesses=selects.map(s=>({song_id:s.dataset.songId,guessed_participant_id:s.value}));
    const button=$('.matchup-submit-btn',match);
    const wrap=$('.matchup-submit-wrap',match);
    if(!button)return;
    $$('.matchup-submit-error',match).forEach(x=>x.remove());
    button.disabled=true;button.textContent='Submitting…';

    try{
      await submitMatchup(match,voteSongId,guesses);
    }catch(err){
      const message=document.createElement('div');
      message.className='matchup-submit-error';message.setAttribute('role','alert');
      message.textContent=err?.message||'Unable to submit this matchup. Please try again.';
      (wrap||match).appendChild(message);
      if(button.isConnected){button.disabled=false;button.textContent='Retry Submit'}
      return;
    }

    try{
      collapseMatch(match,voteSongId);
      await maybeShowRoundComplete();
    }catch(uiError){
      console.error('Matchup saved, but post-submit UI refresh failed.',uiError);
      try{await refreshSession()}catch{}
    }
  }

  async function submitMatchup(match,voteSongId,guesses){
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
    return data;
  }`;

const SAFE_COLLAPSE = `  function collapseMatch(match,voteSongId){
    if(!match)return;
    clearPendingUI(match);match.classList.add('submitted');
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
  const helperOld=`  const $=(s,root=document)=>root.querySelector(s);\n  const $$=(s,root=document)=>[...root.querySelectorAll(s)];`;
  if(source.includes(helperOld)){source=source.replace(helperOld,SAFE_QUERY_HELPERS);applied.push('query-helpers')}

  let patch=replaceBlock(source,'  function installDialogs(){','\n  function openWorkflowModal(el){',RESULTS_ONLY_DIALOGS);
  source=patch.source;if(patch.replaced)applied.push('dialogs');

  patch=replaceBlock(source,'  function selectVote(btn){','\n\n  function confirmMatchup(match){',SAFE_SELECT);
  source=patch.source;if(patch.replaced)applied.push('select');

  patch=replaceBlock(source,'  function confirmMatchup(match){','\n\n  function collapseMatch(match,voteSongId){',DIRECT_SUBMISSION);
  source=patch.source;if(patch.replaced)applied.push('direct-submit');

  patch=replaceBlock(source,'  function collapseMatch(match,voteSongId){','\n\n  function renderSessionState(){',SAFE_COLLAPSE);
  source=patch.source;if(patch.replaced)applied.push('submitted-guesses');

  patch=replaceBlock(source,'  function observeApp(){',"\n\n  document.addEventListener('click',e=>{",ACCOUNT_ONLY_OBSERVER);
  source=patch.source;if(patch.replaced)applied.push('observer');

  return {source,applied};
}

const REQUIRED=['query-helpers','dialogs','select','direct-submit','submitted-guesses','observer'];

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isStaging=url.hostname.includes(STAGING_HOST);
    if(!isStaging)return workerV211.fetch(request,env,ctx);

    if(url.pathname==='/guessing.js'){
      const asset=await env.ASSETS.fetch(request);
      if(!asset.ok)return asset;
      const patched=patchGuessing(await asset.text());
      const missing=REQUIRED.filter(name=>!patched.applied.includes(name));
      if(missing.length){
        console.error('HMPP v2.12 client patch mismatch',{applied:patched.applied,missing});
        return new Response(`throw new Error(${JSON.stringify('HMPP v2.12 client build mismatch: ')}+${JSON.stringify(missing.join(','))});`,{
          status:500,
          headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-hmpp-build':'v2.12-test'}
        });
      }
      const headers=new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-store');
      headers.set('x-hmpp-build','v2.12-test');
      headers.set('x-hmpp-voting-owner','inline-submit-matchup');
      headers.set('x-hmpp-client-fixes',patched.applied.join(','));
      return new Response(patched.source,{status:asset.status,headers});
    }

    const response=await workerV211.fetch(request,env,ctx);
    if(!url.pathname.startsWith('/api/')&&(url.pathname==='/'||url.pathname==='/index.html')&&response.ok){
      const headers=new Headers(response.headers);
      headers.set('x-hmpp-build','v2.12-test');
      return new Response(response.body,{status:response.status,headers});
    }
    return response;
  }
};

export class ParticipantVoteStore extends V211ParticipantVoteStore {}
