import workerV28, { ParticipantVoteStore as V28ParticipantVoteStore } from './worker-v28.js';

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) return { source, replaced:false };
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) return { source, replaced:false };
  return { source:source.slice(0, start) + replacement + source.slice(end), replaced:true };
}

const FIXED_SELECT_VOTE = `  function selectVote(btn){
    const song=btn.closest('.song'),match=song?.closest('.match'); if(!song||!match||match.classList.contains('submitted'))return;
    match.querySelectorAll('.player-slot').forEach(slot=>{slot.classList.remove('open');slot.replaceChildren()});
    match.querySelectorAll('.listen-btn').forEach(b=>{b.setAttribute('aria-expanded','false');delete b.dataset.hmppSpotifyOpen});
    pendingVotes.set(match.dataset.matchId,song.dataset.songId); renderGuessControls(match,song.dataset.songId); updateMatchSubmit(match);
  }`;

const FIXED_SUBMISSION = `  function confirmMatchup(match){
    const voteSongId=sessionState?.votes?.[match.dataset.matchId]?.song_id||pendingVotes.get(match.dataset.matchId); if(!voteSongId)return;
    const selects=$$('.guess-select',match); if(selects.length!==2||!selects.every(s=>s.value))return;
    const picked=songMeta(voteSongId); const modal=$('#matchupConfirmModal');
    $('#matchupConfirmText').textContent=\`Submit your vote for \${picked.title} by \${picked.artist}, plus both submitter guesses?\`;
    const submit=$('#matchupConfirmSubmit'); const replacement=submit.cloneNode(true);submit.replaceWith(replacement);
    replacement.addEventListener('click',async()=>{
      replacement.disabled=true;replacement.textContent='Submitting…';
      try{
        await submitMatchup(match,voteSongId,selects);
        closeWorkflowModal(modal);
        try{collapseMatch(match,voteSongId);await maybeShowRoundComplete()}
        catch(uiError){console.error('Matchup saved, but post-submit UI refresh failed.',uiError);void refreshSession()}
      }catch(err){alert(err.message)}
      finally{replacement.disabled=false;replacement.textContent='Submit'}
    });
    openWorkflowModal(modal);
  }

  async function submitMatchup(match,voteSongId,selects){
    const payload={match_id:match.dataset.matchId,round:match.dataset.round,song_id:voteSongId,guesses:selects.map(s=>({song_id:s.dataset.songId,guessed_participant_id:s.value}))};
    const data=await api('/api/matchup-submission',{method:'POST',body:JSON.stringify(payload)});
    if(!data?.vote)throw new Error('Matchup submission returned an incomplete response. Refresh before trying again.');
    sessionState=sessionState||{votes:{},guesses:{}};
    sessionState.votes=sessionState.votes||{};sessionState.guesses=sessionState.guesses||{};
    sessionState.votes[match.dataset.matchId]=data.vote;
    const returnedGuesses=Array.isArray(data.guesses)?data.guesses:[];
    for(const g of returnedGuesses){if(g?.song_id)sessionState.guesses[g.song_id]=g}
    pendingVotes.delete(match.dataset.matchId);
    return data;
  }`;

const FIXED_OBSERVER_AND_SPOTIFY = `  function observeApp(){
    const account=$('#accountBtn');if(!account)return;
    accountSnapshot=account.textContent||'';
    const syncAccount=()=>{
      const t=account.textContent||'';if(t===accountSnapshot)return;
      accountSnapshot=t;
      if(t.trim()==='Log in'){
        sessionState=null;pendingVotes.clear();$$('.dev-song-id,#devModeBanner,#devAdminPanel').forEach(x=>x.remove());
        return;
      }
      setTimeout(refreshSession,50);
    };
    new MutationObserver(syncAccount).observe(account,{childList:true,subtree:true,characterData:true});
    if(accountSnapshot.trim()!=='Log in')setTimeout(refreshSession,0);
  }

  function mediaForSong(songId){
    try{return typeof MEDIA!=='undefined'?MEDIA?.[songId]||null:null}catch{return null}
  }
  function resetSpotifyButton(button){
    if(!button)return;button.setAttribute('aria-expanded','false');button.innerHTML='▶ Listen <small>Spotify</small>';delete button.dataset.hmppSpotifyOpen;
  }
  function closeSpotifyPanels(exceptSlot=null){
    $$('.player-slot.hmpp-spotify-external').forEach(slot=>{if(slot===exceptSlot)return;slot.classList.remove('open','hmpp-spotify-external');slot.replaceChildren()});
    $$('.listen-btn[data-hmpp-spotify-open="1"]').forEach(button=>{const slot=document.getElementById(button.getAttribute('aria-controls'));if(slot!==exceptSlot)resetSpotifyButton(button)});
  }
  function handleSpotifyListen(event,button){
    const item=mediaForSong(button?.dataset.songId);if(item?.provider!=='spotify')return false;
    event.preventDefault();event.stopImmediatePropagation();
    const slot=document.getElementById(button.getAttribute('aria-controls'));if(!slot)return true;
    const wasOpen=slot.classList.contains('hmpp-spotify-external')&&slot.classList.contains('open');
    try{if(typeof closeActivePlayer==='function')closeActivePlayer()}catch{}
    closeSpotifyPanels(wasOpen?null:slot);
    if(wasOpen){slot.classList.remove('open','hmpp-spotify-external');slot.replaceChildren();resetSpotifyButton(button);return true}
    const shell=document.createElement('div');shell.className='player-shell hmpp-external-only';
    const status=document.createElement('div');status.className='player-status loaded';status.textContent='Spotify full-song listening opens in a separate tab. No embedded preview is loaded.';
    const actions=document.createElement('div');actions.className='player-actions';
    const link=document.createElement('a');link.className='provider-link';link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open in Spotify ↗';
    actions.appendChild(link);shell.append(status,actions);slot.replaceChildren(shell);slot.classList.add('open','hmpp-spotify-external');
    button.dataset.hmppSpotifyOpen='1';button.setAttribute('aria-expanded','true');button.innerHTML='■ Close <small>Spotify</small>';
    return true;
  }`;

const FIXED_CAPTURE_CLICK = `  document.addEventListener('click',e=>{
    const listen=e.target.closest?.('.listen-btn');if(listen&&handleSpotifyListen(e,listen))return;
    const vote=e.target.closest?.('.vote-btn.ready');
    if(vote){const match=vote.closest('.match');if(match&&!match.classList.contains('submitted')){e.preventDefault();e.stopImmediatePropagation();selectVote(vote);return}}
  },true);`;

const OLD_INIT = `  async function init(){installInstruction();installDialogs();$('#r')?.classList.add('round-unpublished');await loadDirectory();observeApp();setTimeout(refreshSession,80);setTimeout(mirrorListening,250);setInterval(()=>{if(sessionState)refreshTournamentState()},30000)}`;
const FIXED_INIT = `  async function init(){installInstruction();installDialogs();$('#r')?.classList.add('round-unpublished');await loadDirectory();observeApp();setTimeout(mirrorListening,250);setInterval(()=>{if(sessionState)refreshTournamentState()},30000)}`;
const OLD_ROUND_CLICK = `  $$('.header-round').forEach(b=>b.addEventListener('click',()=>setTimeout(async()=>{syncRoundAccess();syncAdminPanelVisibility();if(sessionState?.is_test&&b.dataset.round==='round-of-64')await refreshAdminPanel();await refreshTournamentState()},0)));`;
const FIXED_ROUND_CLICK = `  $$('.header-round').forEach(b=>b.addEventListener('click',()=>setTimeout(async()=>{syncRoundAccess();syncAdminPanelVisibility();if(sessionState?.is_test&&b.dataset.round==='round-of-64')await refreshAdminPanel();if(sessionState)await refreshTournamentState()},0)));`;

function patchGuessing(original) {
  let source = original;
  const applied = [];
  let patched = replaceBlock(source, '  function selectVote(btn){', '\n\n  function confirmMatchup(match){', FIXED_SELECT_VOTE);
  source = patched.source; if (patched.replaced) applied.push('select');
  patched = replaceBlock(source, '  function confirmMatchup(match){', '\n\n  function collapseMatch(match,voteSongId){', FIXED_SUBMISSION);
  source = patched.source; if (patched.replaced) applied.push('submit');
  patched = replaceBlock(source, '  function observeApp(){', "\n\n  document.addEventListener('click',e=>{", FIXED_OBSERVER_AND_SPOTIFY);
  source = patched.source; if (patched.replaced) applied.push('observer');
  patched = replaceBlock(source, "  document.addEventListener('click',e=>{", "\n\n  $$('.header-round').forEach", FIXED_CAPTURE_CLICK);
  source = patched.source; if (patched.replaced) applied.push('capture');
  if (source.includes(OLD_INIT)) { source = source.replace(OLD_INIT, FIXED_INIT); applied.push('init'); }
  if (source.includes(OLD_ROUND_CLICK)) { source = source.replace(OLD_ROUND_CLICK, FIXED_ROUND_CLICK); applied.push('round'); }
  return { source, applied };
}

async function assetWithNoStore(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const headers = new Headers(asset.headers);
  headers.set('cache-control', 'no-store');
  return { asset, headers };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/ui-v28.js') {
      return new Response('/* superseded by ui-v29.js */', { headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'} });
    }
    if (url.pathname === '/dev-reset-v28.js') {
      return new Response('/* superseded by dev-reset-v29.js */', { headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'} });
    }
    if (url.pathname === '/guessing.js') {
      const asset = await env.ASSETS.fetch(request);
      if (!asset.ok) return asset;
      const patched = patchGuessing(await asset.text());
      const headers = new Headers(asset.headers);
      headers.set('content-type', 'application/javascript; charset=utf-8');
      headers.set('cache-control', 'no-store');
      headers.set('x-hmpp-client-fixes', patched.applied.join(',') || 'none');
      return new Response(patched.source, { status:asset.status, headers });
    }
    if (url.pathname === '/ui-v29.js' || url.pathname === '/dev-reset-v29.js') {
      const served = await assetWithNoStore(request, env);
      if (served instanceof Response) return served;
      return new Response(served.asset.body, { status:served.asset.status, headers:served.headers });
    }
    const response = await workerV28.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') && (url.pathname === '/' || url.pathname === '/index.html') && response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const transformed = new HTMLRewriter().on('head', {
        element(el) {
          el.append('<style>html.hmpp-boot-pending body{visibility:hidden!important}</style><script>document.documentElement.classList.add("hmpp-boot-pending")</script><link rel="stylesheet" href="/ui-v29.css?v=2.9.1"><script src="/ui-v29.js?v=2.9.1" defer></script><script src="/dev-reset-v29.js?v=2.9.1" defer></script>', { html:true });
        }
      }).transform(response);
      const headers = new Headers(transformed.headers);
      headers.set('x-hmpp-build', 'v2.9.1');
      return new Response(transformed.body, { status:transformed.status, headers });
    }
    return response;
  }
};

export class ParticipantVoteStore extends V28ParticipantVoteStore {}
