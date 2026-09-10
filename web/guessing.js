(() => {
  const ROUND_SECTIONS={'play-in':'#p','round-of-64':'#r'};
  const PREVIOUS_ROUND={'round-of-64':'play-in'};
  let participants=[];
  let sessionState=null;
  let tournamentState=null;
  let pendingVotes=new Map();
  let previewedRounds=new Set();
  let adminRoundData=null;
  let refreshTimer=null;
  let accountSnapshot='';

  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function api(path,opts={}){
    const r=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    let body=null;try{body=await r.json()}catch{}
    if(!r.ok)throw new Error(body?.error||`Request failed (${r.status})`);
    return body;
  }

  function installInstruction(){
    if($('.guess-instruction'))return;
    const caption=$('#bracket .caption'); if(!caption)return;
    const line=document.createElement('div'); line.className='caption guess-instruction';
    line.textContent='After choosing a song, guess who submitted both entries. The vote and both guesses are submitted together. Guess the Harry Man!';
    caption.insertAdjacentElement('afterend',line);
  }

  function installDialogs(){
    if(!$('#matchupConfirmModal')){
      const el=document.createElement('div'); el.className='workflow-modal-backdrop'; el.id='matchupConfirmModal'; el.hidden=true;
      el.innerHTML='<div class="workflow-modal" role="dialog" aria-modal="true" aria-labelledby="matchupConfirmTitle"><div class="workflow-kicker">HMPP ’26 MATCHUP SUBMISSION</div><h2 id="matchupConfirmTitle">Submit this matchup?</h2><p id="matchupConfirmText"></p><div class="workflow-modal-actions"><button id="matchupConfirmCancel" type="button">Cancel</button><button id="matchupConfirmSubmit" class="primary" type="button">Submit</button></div></div>';
      document.body.appendChild(el); $('#matchupConfirmCancel').addEventListener('click',()=>closeWorkflowModal(el));
    }
    if(!$('#resultsModal')){
      const el=document.createElement('div'); el.className='workflow-modal-backdrop'; el.id='resultsModal'; el.hidden=true;
      el.innerHTML='<div class="workflow-modal workflow-results-modal" role="dialog" aria-modal="true" aria-labelledby="resultsModalTitle"><div class="workflow-kicker">DEV RESULTS PREVIEW</div><h2 id="resultsModalTitle">Previous-round results</h2><div id="resultsModalBody" class="results-modal-body"></div><div class="workflow-modal-actions"><button id="resultsModalClose" class="primary" type="button">Close</button></div></div>';
      document.body.appendChild(el); $('#resultsModalClose').addEventListener('click',()=>closeWorkflowModal(el));
    }
  }
  function openWorkflowModal(el){el.hidden=false;document.body.classList.add('modal-open')}
  function closeWorkflowModal(el){el.hidden=true;if($$('.workflow-modal-backdrop:not([hidden]),.modal-backdrop:not([hidden])').length===0)document.body.classList.remove('modal-open')}

  async function loadDirectory(){
    try{const data=await api('/api/participants');participants=(data.participants||[]).filter(p=>!p.is_test)}
    catch{try{const r=await fetch('/data/2026/participants/public.json');const data=await r.json();participants=(data.participants||[]).filter(p=>!p.is_test)}catch{participants=[]}}
  }
  function guessOptions(selected=''){return '<option value="">Select a Harry Man…</option>'+participants.map(p=>`<option value="${esc(p.id)}"${p.id===selected?' selected':''}>${esc(p.name)}</option>`).join('')}

  function selectedRound(){return $('.header-round.active')?.dataset.round||'play-in'}
  function matchSongs(match){return $$('.song[data-song-id]',match)}
  function songMeta(songId){const s=document.querySelector(`.song[data-song-id="${CSS.escape(songId)}"]`);return s?{song_id:songId,title:s.dataset.title||$('.title',s)?.textContent||songId,artist:s.dataset.artist||$('.artist',s)?.textContent||'',provider:$('.listen-btn small',s)?.textContent||'Spotify'}:{song_id:songId,title:songId,artist:'',provider:'Spotify'}}
  function isSongListened(songId){return $$(`.song[data-song-id="${CSS.escape(songId)}"]`).some(s=>!!$('.listened-pill',s))}
  function syncMatchReady(match){
    if(!match||match.classList.contains('submitted'))return; const songs=matchSongs(match); if(songs.length!==2)return;
    const both=songs.every(s=>isSongListened(s.dataset.songId));
    songs.forEach(s=>{const b=$('.vote-btn',s);if(!b)return;b.disabled=!both;b.setAttribute('aria-disabled',both?'false':'true');b.classList.toggle('ready',both)});
  }
  function mirrorListening(){
    const listenedIds=new Set($$('.listened-pill').map(p=>p.closest('.song')?.dataset.songId).filter(Boolean));
    for(const sid of listenedIds)$$(`.song[data-song-id="${CSS.escape(sid)}"]`).forEach(s=>{if(!$('.listened-pill',s)){const p=document.createElement('div');p.className='listened-pill';p.textContent='✓ Listening requirement met';s.appendChild(p)}});
    $$('.match').forEach(syncMatchReady);
  }

  function clearPendingUI(match){
    match.classList.remove('matchup-pending','needs-guesses');
    $$('.pending-vote-choice,.pending-vote-other',match).forEach(s=>s.classList.remove('pending-vote-choice','pending-vote-other'));
    $$('.guess-prompt,.guess-select,.matchup-submit-wrap',match).forEach(x=>x.remove());
    $$('.vote-btn',match).forEach(b=>{if(!match.classList.contains('submitted'))b.textContent='Tap to vote'});
  }

  function renderGuessControls(match,voteSongId,{legacy=false}={}){
    const songs=matchSongs(match); if(songs.length!==2||!participants.length)return;
    match.classList.add('needs-guesses'); if(!legacy)match.classList.add('matchup-pending');
    songs.forEach(song=>{
      const sid=song.dataset.songId; const saved=sessionState?.guesses?.[sid];
      if(!$('.guess-prompt',song)){const p=document.createElement('div');p.className='guess-prompt';p.textContent='Which Harry Man Submitted...';$('.title',song)?.insertAdjacentElement('beforebegin',p)}
      let select=$('.guess-select',song);
      if(!select){select=document.createElement('select');select.className='guess-select';select.dataset.songId=sid;select.setAttribute('aria-label',`Guess who submitted ${song.dataset.title}`);select.innerHTML=guessOptions(saved?.guessed_participant_id||'');select.addEventListener('change',()=>updateMatchSubmit(match));$('.artist',song)?.insertAdjacentElement('afterend',select)}
      if(saved){select.value=saved.guessed_participant_id;select.disabled=true}
    });
    if(!$('.matchup-submit-wrap',match)){
      const wrap=document.createElement('div');wrap.className='matchup-submit-wrap';wrap.innerHTML='<button class="matchup-submit-btn" type="button" disabled>Submit Matchup</button>';
      match.appendChild(wrap); $('.matchup-submit-btn',wrap).addEventListener('click',()=>confirmMatchup(match));
    }
    if(!legacy){
      songs.forEach(s=>{const picked=s.dataset.songId===voteSongId;s.classList.toggle('pending-vote-choice',picked);s.classList.toggle('pending-vote-other',!picked);const b=$('.vote-btn',s);if(b)b.textContent=picked?'Selected ✓':'Tap to vote'});
    }
    updateMatchSubmit(match);
  }

  function updateMatchSubmit(match){
    const vote=sessionState?.votes?.[match.dataset.matchId]?.song_id||pendingVotes.get(match.dataset.matchId);
    const selects=$$('.guess-select:not(:disabled)',match); const allSelects=$$('.guess-select',match);
    const complete=!!vote&&allSelects.length===2&&allSelects.every(s=>s.value);
    const b=$('.matchup-submit-btn',match); if(b)b.disabled=!complete;
  }

  function selectVote(btn){
    const song=btn.closest('.song'),match=song?.closest('.match'); if(!song||!match||match.classList.contains('submitted'))return;
    pendingVotes.set(match.dataset.matchId,song.dataset.songId); renderGuessControls(match,song.dataset.songId); updateMatchSubmit(match);
  }

  function confirmMatchup(match){
    const voteSongId=sessionState?.votes?.[match.dataset.matchId]?.song_id||pendingVotes.get(match.dataset.matchId); if(!voteSongId)return;
    const selects=$$('.guess-select',match); if(selects.length!==2||!selects.every(s=>s.value))return;
    const picked=songMeta(voteSongId); const modal=$('#matchupConfirmModal');
    $('#matchupConfirmText').textContent=`Submit your vote for ${picked.title} by ${picked.artist}, plus both submitter guesses?`;
    const submit=$('#matchupConfirmSubmit'); const replacement=submit.cloneNode(true);submit.replaceWith(replacement);
    replacement.addEventListener('click',async()=>{replacement.disabled=true;replacement.textContent='Submitting…';try{await submitMatchup(match,voteSongId,selects);closeWorkflowModal(modal)}catch(err){alert(err.message)}finally{replacement.disabled=false;replacement.textContent='Submit'}});
    openWorkflowModal(modal);
  }

  async function submitMatchup(match,voteSongId,selects){
    const payload={match_id:match.dataset.matchId,round:match.dataset.round,song_id:voteSongId,guesses:selects.map(s=>({song_id:s.dataset.songId,guessed_participant_id:s.value}))};
    const data=await api('/api/matchup-submission',{method:'POST',body:JSON.stringify(payload)});
    sessionState=sessionState||{votes:{},guesses:{}};sessionState.votes=sessionState.votes||{};sessionState.guesses=sessionState.guesses||{};sessionState.votes[match.dataset.matchId]=data.vote;(data.guesses||[]).forEach(g=>sessionState.guesses[g.song_id]=g);pendingVotes.delete(match.dataset.matchId);
    collapseMatch(match,voteSongId); await maybeShowRoundComplete();
  }

  function collapseMatch(match,voteSongId){
    clearPendingUI(match); match.classList.add('submitted');
    matchSongs(match).forEach(s=>{const picked=s.dataset.songId===voteSongId;s.classList.toggle('vote-winner',picked);s.classList.toggle('vote-loser',!picked);$('.winner-check',s)?.remove();const slot=$('.player-slot',s);if(slot){slot.classList.remove('open');slot.replaceChildren()}const l=$('.listen-btn',s);if(l)l.setAttribute('aria-expanded','false');if(picked){const c=document.createElement('span');c.className='winner-check';c.setAttribute('aria-label','Your selected song');c.title='Your selected song';c.textContent='✓';s.appendChild(c)}});
  }

  function renderSessionState(){
    if(!sessionState)return;
    $$('.match').forEach(match=>{
      const vote=sessionState.votes?.[match.dataset.matchId]; if(!vote)return;
      collapseMatch(match,vote.song_id);
      const songs=matchSongs(match); if(songs.length!==2)return;
      const guessesComplete=songs.every(s=>!!sessionState.guesses?.[s.dataset.songId]);
      if(!guessesComplete)renderGuessControls(match,vote.song_id,{legacy:true});
    });
    installDevMode();applyTournamentState();
  }

  async function maybeShowRoundComplete(){
    const round=selectedRound(),section=$(ROUND_SECTIONS[round]);if(!section)return;
    const matches=$$('.match',section).filter(m=>matchSongs(m).length===2); if(!matches.length)return;
    const done=matches.every(m=>{const v=sessionState?.votes?.[m.dataset.matchId];return !!v&&matchSongs(m).every(s=>!!sessionState?.guesses?.[s.dataset.songId])});
    if(done){const modal=$('#noticeModal');if(modal){$('#noticeTitle').textContent='All votes submitted for this round.';modal.hidden=false;document.body.classList.add('modal-open')} if(sessionState?.is_test)await refreshAdminPanel();}
  }

  function installDevMode(){
    const isDev=sessionState?.is_test===true;
    let banner=$('#devModeBanner');
    if(isDev&&!banner){banner=document.createElement('div');banner.id='devModeBanner';banner.className='dev-mode-banner';banner.textContent='DEV MODE · Song IDs visible · Publication controls enabled';$('#testModeBanner')?.insertAdjacentElement('afterend',banner)}
    if(!isDev&&banner)banner.remove();
    $$('.dev-song-id').forEach(x=>x.remove());
    if(isDev)$$('.song[data-song-id]').forEach(s=>{const d=document.createElement('div');d.className='dev-song-id';d.textContent=s.dataset.songId;$('.title',s)?.insertAdjacentElement('beforebegin',d)});
    installAdminPanel();
  }

  function installAdminPanel(){
    let panel=$('#devAdminPanel');
    if(!panel){panel=document.createElement('section');panel.id='devAdminPanel';panel.className='dev-admin-panel';panel.hidden=true;panel.innerHTML='<div class="dev-admin-head"><div><span>TEST VOTER · ROUND CONTROL</span><h3>Publication Controls</h3></div><div id="devAdminStatus"></div></div><div class="dev-admin-actions"><button data-admin-action="view-results" type="button">View results for previous round</button><button data-admin-action="show-results" type="button">Show results for previous round</button><button data-admin-action="view-matchups" type="button">View new matchups</button><button data-admin-action="publish-matchups" type="button">Publish New Matchups</button></div>';$('#bracket')?.insertAdjacentElement('afterend',panel);panel.addEventListener('click',handleAdminClick)}
    syncAdminPanelVisibility();
  }
  function syncAdminPanelVisibility(){const panel=$('#devAdminPanel');if(!panel)return;panel.hidden=!(sessionState?.is_test===true&&selectedRound()==='round-of-64')}

  async function refreshAdminPanel(){
    syncAdminPanelVisibility(); if(sessionState?.is_test!==true||selectedRound()!=='round-of-64')return;
    try{const data=await api('/api/admin/round?round=play-in');adminRoundData=data;const a=data.aggregate;const status=$('#devAdminStatus');status.textContent=a.complete?(a.ties.length?`Official Play-In voting complete · ${a.ties.length} tie(s) require resolution`:'Official Play-In voting complete · advancement ready'):`Official Play-In voting: ${a.received_votes} / ${a.expected_votes} votes`;
      const canView=a.complete,canAdvance=a.advancement_ready;const state=data.state||{};
      const btn=n=>$(`[data-admin-action="${n}"]`,$('#devAdminPanel'));
      btn('view-results').disabled=!canView;btn('show-results').disabled=!canView||state.results_visible?.['play-in']===true;btn('view-matchups').disabled=!canAdvance;btn('publish-matchups').disabled=!canAdvance||state.published_rounds?.['round-of-64']===true;
      if(state.results_visible?.['play-in'])btn('show-results').textContent='Results visible ✓';if(state.published_rounds?.['round-of-64'])btn('publish-matchups').textContent='Round of 64 published ✓';
    }catch(err){$('#devAdminStatus').textContent=err.message}
  }

  async function handleAdminClick(e){
    const b=e.target.closest('button[data-admin-action]');if(!b||b.disabled)return;const action=b.dataset.adminAction;
    if(!adminRoundData)await refreshAdminPanel(); if(!adminRoundData)return;
    if(action==='view-results'){showResultsModal(adminRoundData.aggregate);return}
    if(action==='view-matchups'){populateRound64(adminRoundData.preview_matchups,{preview:true});previewedRounds.add('round-of-64');syncRoundAccess();return}
    b.disabled=true;
    try{
      if(action==='show-results'){await api('/api/admin/show-results',{method:'POST',body:JSON.stringify({round:'play-in'})});await refreshTournamentState();}
      if(action==='publish-matchups'){const d=await api('/api/admin/publish-round',{method:'POST',body:JSON.stringify({round:'round-of-64'})});populateRound64(d.matchups||[],{preview:false});await refreshTournamentState();}
      await refreshAdminPanel();
    }catch(err){alert(err.message);b.disabled=false}
  }

  function showResultsModal(aggregate){
    const body=$('#resultsModalBody');body.replaceChildren();
    for(const r of aggregate.results){const box=document.createElement('div');box.className='admin-result-match';const h=document.createElement('div');h.className='admin-result-match-id';h.textContent=r.match_id;box.appendChild(h);for(const s of r.songs){const m=songMeta(s.song_id);const row=document.createElement('div');row.className='admin-result-song'+(r.winner_song_id===s.song_id?' winner':'');row.innerHTML=`<div><span class="admin-result-title">${esc(m.title)}</span><span class="admin-result-artist">${esc(m.artist)}</span></div><strong>${s.votes} vote${s.votes===1?'':'s'}</strong>`;box.appendChild(row)}if(r.tied){const t=document.createElement('div');t.className='admin-result-tie';t.textContent='Tie — resolve before advancement';box.appendChild(t)}body.appendChild(box)}
    openWorkflowModal($('#resultsModal'));
  }

  function makeSongCard(songId,matchId){
    const m=songMeta(songId);const div=document.createElement('div');div.className='song';div.dataset.artist=m.artist;div.dataset.songId=songId;div.dataset.title=m.title;
    const playerId=`player-${songId}-${matchId}`;
    div.innerHTML=`<div class="meta"><button aria-disabled="true" class="vote-btn" data-song-id="${esc(songId)}" disabled type="button">Tap to vote</button></div><div class="title">${esc(m.title)}</div><div class="artist">${esc(m.artist)}</div><button aria-controls="${esc(playerId)}" aria-expanded="false" class="listen-btn" data-song-id="${esc(songId)}" type="button">▶ Listen <small>${esc(m.provider)}</small></button><div class="player-slot" id="${esc(playerId)}"></div>`;
    return div;
  }

  function populateRound64(matchups,{preview=false}={}){
    for(const m of matchups||[]){if(m.songs?.length!==2)continue;const card=document.querySelector(`.match[data-match-id="${CSS.escape(m.match_id)}"]`);if(!card)continue;const placeholder=$('.song.placeholder',card);if(placeholder){placeholder.replaceWith(makeSongCard(m.songs[0],m.match_id))}card.dataset.resolved='true';const vote=sessionState?.votes?.[m.match_id];if(vote){collapseMatch(card,vote.song_id);const songs=matchSongs(card),complete=songs.length===2&&songs.every(x=>!!sessionState?.guesses?.[x.dataset.songId]);if(!complete)renderGuessControls(card,vote.song_id,{legacy:true})}}
    const sec=$('#r');if(sec){sec.classList.toggle('dev-round-preview',preview);sec.classList.remove('round-unpublished')}
    installDevMode();setTimeout(mirrorListening,0);
  }

  function applyPublishedResults(){
    $$('.public-result-count,.published-result-badge').forEach(x=>x.remove());$$('.published-winner').forEach(x=>x.classList.remove('published-winner'));
    const results=tournamentState?.published_results?.['play-in'];if(!tournamentState?.results_visible?.['play-in']||!Array.isArray(results))return;
    for(const r of results){const match=document.querySelector(`.match[data-match-id="${CSS.escape(r.match_id)}"]`);if(!match)continue;const badge=document.createElement('span');badge.className='published-result-badge';badge.textContent='RESULTS PUBLISHED';$('.matchhead',match)?.appendChild(badge);for(const s of r.songs){const card=$(`.song[data-song-id="${CSS.escape(s.song_id)}"]`,match);if(!card)continue;const c=document.createElement('div');c.className='public-result-count';c.textContent=`${s.votes} vote${s.votes===1?'':'s'}`;$('.artist',card)?.insertAdjacentElement('afterend',c);if(r.winner_song_id===s.song_id)card.classList.add('published-winner')}}
    const metric=$$('.metric').find(x=>x.querySelector('small')?.textContent==='Results posted');if(metric&&metric.querySelector('strong'))metric.querySelector('strong').textContent=String(results.length);
  }

  function syncRoundAccess(){
    const sec=$('#r');if(!sec)return;let gate=$('#round64Gate');const published=tournamentState?.published_rounds?.['round-of-64']===true;const canPreview=sessionState?.is_test===true&&previewedRounds.has('round-of-64');
    if(published&&tournamentState?.published_matchups?.['round-of-64'])populateRound64(tournamentState.published_matchups['round-of-64'],{preview:false});
    const allowed=published||canPreview;
    sec.classList.toggle('round-unpublished',!allowed);
    if(!allowed&&!gate){gate=document.createElement('div');gate.id='round64Gate';gate.className='round-gate';gate.innerHTML=sessionState?.is_test?'<strong>Round of 64 is not published.</strong><span>Use View new matchups when official Play-In voting is complete.</span>':'<strong>Round of 64 · Coming soon</strong><span>Matchups will appear when the tournament administrator publishes the round.</span>';$('.sectionlabel',sec)?.insertAdjacentElement('afterend',gate)}
    if(allowed&&gate)gate.remove();syncAdminPanelVisibility();
  }

  function applyTournamentState(){if(!tournamentState)return;applyPublishedResults();syncRoundAccess()}
  async function refreshTournamentState(){try{const d=await api('/api/tournament-state');tournamentState=d.state||{};applyTournamentState()}catch{} }

  async function refreshSession(){
    try{const d=await api('/api/session');sessionState=d.session;sessionState.votes=sessionState.votes||{};sessionState.guesses=sessionState.guesses||{};renderSessionState();await refreshTournamentState();if(sessionState.is_test&&selectedRound()==='round-of-64')await refreshAdminPanel()}
    catch{sessionState=null;pendingVotes.clear();$$('.dev-song-id,#devModeBanner,#devAdminPanel').forEach(x=>x.remove());}
  }

  function observeApp(){
    const observer=new MutationObserver(mutations=>{
      let submittedChanged=false,accountChanged=false,listeningChanged=false;
      for(const m of mutations){if(m.type==='attributes'&&m.target.classList?.contains('match'))submittedChanged=true;if(m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1&&(n.classList?.contains('listened-pill')||n.querySelector?.('.listened-pill'))))listeningChanged=true;if(m.target===document.body||m.target.closest?.('#accountBtn'))accountChanged=true;}
      if(listeningChanged){clearTimeout(refreshTimer);refreshTimer=setTimeout(mirrorListening,30)}
      if(submittedChanged&&sessionState)setTimeout(renderSessionState,30);
      if(accountChanged){const t=$('#accountBtn')?.textContent||'';if(t!==accountSnapshot){accountSnapshot=t;if(t.trim()==='Log in'){sessionState=null;pendingVotes.clear();$$('.dev-song-id,#devModeBanner,#devAdminPanel').forEach(x=>x.remove())}else setTimeout(refreshSession,50)}}
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  document.addEventListener('click',e=>{
    const vote=e.target.closest('.vote-btn.ready');
    if(vote){const match=vote.closest('.match');if(match&&!match.classList.contains('submitted')){e.preventDefault();e.stopImmediatePropagation();selectVote(vote);return}}
  },true);

  $$('.header-round').forEach(b=>b.addEventListener('click',()=>setTimeout(async()=>{syncRoundAccess();syncAdminPanelVisibility();if(sessionState?.is_test&&b.dataset.round==='round-of-64')await refreshAdminPanel();await refreshTournamentState()},0)));

  async function init(){installInstruction();installDialogs();$('#r')?.classList.add('round-unpublished');await loadDirectory();observeApp();setTimeout(refreshSession,80);setTimeout(mirrorListening,250);setInterval(()=>{if(sessionState)refreshTournamentState()},30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
