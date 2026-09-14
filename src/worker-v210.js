import workerV29, { ParticipantVoteStore as V29ParticipantVoteStore } from './worker-v29.js';

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) return { source, replaced:false };
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) return { source, replaced:false };
  return { source: source.slice(0, start) + replacement + source.slice(end), replaced:true };
}

const SAFE_QUERY_HELPERS = `  const $=(s,root=document)=>root?.querySelector?.(s)??null;
  const $$=(s,root=document)=>root?.querySelectorAll?[...root.querySelectorAll(s)]:[];`;

const SAFE_SELECT_VOTE = `  function selectVote(btn){
    const song=btn.closest('.song'),match=song?.closest('.match'); if(!song||!match||match.classList.contains('submitted'))return;
    match.querySelectorAll('.player-slot').forEach(slot=>{slot.classList.remove('open');slot.replaceChildren()});
    match.querySelectorAll('.listen-btn').forEach(b=>b.setAttribute('aria-expanded','false'));
    pendingVotes.set(match.dataset.matchId,song.dataset.songId);
    renderGuessControls(match,song.dataset.songId);
    updateMatchSubmit(match);
  }`;

const SAFE_SUBMISSION = `  function confirmMatchup(match){
    const voteSongId=sessionState?.votes?.[match.dataset.matchId]?.song_id||pendingVotes.get(match.dataset.matchId); if(!voteSongId)return;
    const selects=$$('.guess-select',match); if(selects.length!==2||!selects.every(s=>s.value))return;
    const guessSnapshot=selects.map(s=>({song_id:s.dataset.songId,guessed_participant_id:s.value}));
    const picked=songMeta(voteSongId),modal=$('#matchupConfirmModal'),text=$('#matchupConfirmText');
    if(!modal||!text)return;
    text.textContent=\`Submit your vote for \${picked.title} by \${picked.artist}, plus both submitter guesses?\`;
    const submit=$('#matchupConfirmSubmit'); if(!submit)return;
    const replacement=submit.cloneNode(true);submit.replaceWith(replacement);
    replacement.addEventListener('click',async()=>{
      replacement.disabled=true;replacement.textContent='Submitting…';
      let saved=false;
      try{
        await submitMatchup(match,voteSongId,guessSnapshot);
        saved=true;
        closeWorkflowModal(modal);
      }catch(err){
        alert(err.message);
      }
      if(saved){
        try{
          collapseMatch(match,voteSongId);
          await maybeShowRoundComplete();
        }catch(uiError){
          console.error('Matchup saved, but post-submit UI refresh failed.',uiError);
          try{await refreshSession()}catch{}
        }
      }
      replacement.disabled=false;replacement.textContent='Submit';
    });
    openWorkflowModal(modal);
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
    for(const g of returnedGuesses){if(g?.song_id)sessionState.guesses[g.song_id]=g}
    pendingVotes.delete(match.dataset.matchId);
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

const SAFE_OBSERVER = `  function observeApp(){
    const account=$('#accountBtn');if(!account)return;
    accountSnapshot=account.textContent||'';
    const syncAccount=()=>{
      const t=account.textContent||'';if(t===accountSnapshot)return;
      accountSnapshot=t;
      if(t.trim()==='Log in'){
        sessionState=null;pendingVotes.clear();
        $$('.dev-song-id,#devModeBanner,#devAdminPanel').forEach(x=>x.remove());
        return;
      }
      setTimeout(refreshSession,50);
    };
    new MutationObserver(syncAccount).observe(account,{childList:true,subtree:true,characterData:true});
  }`;

function patchGuessing(original) {
  let source = original;
  const applied = [];
  const helperOld = `  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];`;
  if (source.includes(helperOld)) { source = source.replace(helperOld, SAFE_QUERY_HELPERS); applied.push('query-helpers'); }
  let patched = replaceBlock(source, '  function selectVote(btn){', '\n\n  function confirmMatchup(match){', SAFE_SELECT_VOTE);
  source = patched.source; if (patched.replaced) applied.push('select');
  patched = replaceBlock(source, '  function confirmMatchup(match){', '\n\n  function collapseMatch(match,voteSongId){', SAFE_SUBMISSION);
  source = patched.source; if (patched.replaced) applied.push('submit');
  patched = replaceBlock(source, '  function collapseMatch(match,voteSongId){', '\n\n  function renderSessionState(){', SAFE_COLLAPSE);
  source = patched.source; if (patched.replaced) applied.push('collapse');
  patched = replaceBlock(source, '  function observeApp(){', "\n\n  document.addEventListener('click',e=>{", SAFE_OBSERVER);
  source = patched.source; if (patched.replaced) applied.push('observer');
  return { source, applied };
}

const REQUIRED_PATCHES = ['query-helpers','select','submit','collapse','observer'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isStagingHost = url.hostname.includes('pied-piper-tournament-of-champions-v2-test');
    if (!isStagingHost) return workerV29.fetch(request, env, ctx);
    if (url.pathname === '/guessing.js') {
      const asset = await env.ASSETS.fetch(request);
      if (!asset.ok) return asset;
      const patched = patchGuessing(await asset.text());
      const missing = REQUIRED_PATCHES.filter(name => !patched.applied.includes(name));
      if (missing.length) {
        console.error('HMPP v2.10 guessing patch mismatch', { applied:patched.applied, missing });
        return new Response(`throw new Error(${JSON.stringify('HMPP client build mismatch. Missing patches: ')}+${JSON.stringify(missing.join(','))});`, {
          status:500,
          headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-hmpp-build':'v2.10-test'}
        });
      }
      const headers = new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-store');
      headers.set('x-hmpp-build','v2.10-test');
      headers.set('x-hmpp-client-fixes',patched.applied.join(','));
      return new Response(patched.source,{status:asset.status,headers});
    }
    const response = await workerV29.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') && (url.pathname === '/' || url.pathname === '/index.html') && response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const headers = new Headers(response.headers);headers.set('x-hmpp-build','v2.10-test');
      return new Response(response.body,{status:response.status,headers});
    }
    return response;
  }
};

export class ParticipantVoteStore extends V29ParticipantVoteStore {}
