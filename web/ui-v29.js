(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const PENDING='hmpp:v29:pending-listened';
  let pid=null, session=null, participants=[], restoring=false;

  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')||{}}catch{return{}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const listenKey=id=>`hmpp:v2:${id}:listened`;
  const draftKey=id=>`hmpp:v29:${id}:drafts`;
  async function api(path){const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`);return b}

  async function loadContext(){
    try{
      const d=await api('/api/session'); session=d.session||null; pid=session?.participant_id||null;
      if(!pid)return false;
      const p=await api('/api/participants'); participants=(p.participants||[]).filter(x=>!x.is_test);
      return true;
    }catch{session=null;pid=null;return false}
  }

  function syncReady(match){
    if(!match||match.classList.contains('submitted'))return;
    const songs=$$('.song[data-song-id]',match); if(songs.length!==2)return;
    const ready=songs.every(s=>!!$('.listened-pill',s));
    songs.forEach(s=>{const b=$('.vote-btn',s);if(!b)return;b.disabled=!ready;b.setAttribute('aria-disabled',ready?'false':'true');b.classList.toggle('ready',ready)});
  }
  function markListened(link){
    const song=link?.closest('.song[data-song-id]'); if(!song)return;
    const sid=song.dataset.songId; if(!sid)return;
    if(!$('.listened-pill',song)){const p=document.createElement('div');p.className='listened-pill';p.textContent='✓ Listening requirement met';song.appendChild(p)}
    const pending=read(PENDING); pending[sid]=pending[sid]||Date.now(); write(PENDING,pending);
    if(pid){const listened=read(listenKey(pid));listened[sid]=listened[sid]||Date.now();write(listenKey(pid),listened);delete pending[sid];write(PENDING,pending)}
    syncReady(song.closest('.match'));
  }
  function externalLink(e){return e.target?.closest?.('a.provider-link[href],.provider-link[href]')||null}
  function externalIntent(e){if('button'in e&&e.button!==0&&e.button!==1)return;const l=externalLink(e);if(l)markListened(l)}
  document.addEventListener('pointerdown',externalIntent,true);
  document.addEventListener('mousedown',externalIntent,true);
  document.addEventListener('click',externalIntent,true);
  document.addEventListener('auxclick',e=>{if(e.button===1)externalIntent(e)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const l=externalLink(e);if(l)markListened(l)}},true);

  function restoreListening(){
    if(!pid)return;
    const listened=read(listenKey(pid));
    Object.keys(listened).forEach(sid=>$$(`.song[data-song-id="${CSS.escape(sid)}"]`).forEach(song=>{if(!$('.listened-pill',song)){const p=document.createElement('div');p.className='listened-pill';p.textContent='✓ Listening requirement met';song.appendChild(p)}}));
    $$('.match').forEach(syncReady);
  }

  function drafts(){return pid?read(draftKey(pid)): {};}
  function ensureDraftListening(match){
    if(!pid||!match)return;
    const listened=read(listenKey(pid));
    let changed=false;
    $$('.song[data-song-id]',match).forEach(song=>{
      const sid=song.dataset.songId;if(!sid)return;
      if(!listened[sid]){listened[sid]=Date.now();changed=true}
      if(!$('.listened-pill',song)){const p=document.createElement('div');p.className='listened-pill';p.textContent='✓ Listening requirement met';song.appendChild(p)}
    });
    if(changed)write(listenKey(pid),listened);
    syncReady(match);
  }
  function saveDraft(match){
    if(!pid||!match||restoring||match.classList.contains('submitted'))return;
    const chosen=$('.song.pending-vote-choice',match); if(!chosen)return;
    ensureDraftListening(match);
    const d={song_id:chosen.dataset.songId,guesses:{},updated_at:Date.now()};
    $$('.guess-select',match).forEach(s=>{if(s.value)d.guesses[s.dataset.songId]=s.value});
    const all=drafts();all[match.dataset.matchId]=d;write(draftKey(pid),all);
  }
  function clearDraft(matchId){if(!pid)return;const all=drafts();if(all[matchId]){delete all[matchId];write(draftKey(pid),all)}}
  async function restoreDrafts(){
    if(!pid||!session)return; restoring=true;
    try{
      for(const [mid,d] of Object.entries(drafts())){
        if(session.votes?.[mid]){clearDraft(mid);continue}
        const match=document.querySelector(`.match[data-match-id="${CSS.escape(mid)}"]`);if(!match||match.classList.contains('submitted'))continue;
        const songs=$$('.song[data-song-id]',match);if(songs.length!==2)continue;
        ensureDraftListening(match);
        const btn=match.querySelector(`.song[data-song-id="${CSS.escape(d.song_id)}"] .vote-btn`);if(!btn)continue;
        if(btn.disabled){syncReady(match);if(btn.disabled)continue}
        btn.click();await new Promise(r=>setTimeout(r,0));
        $$('.guess-select',match).forEach(s=>{const v=d.guesses?.[s.dataset.songId];if(v){s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}});
      }
    }finally{restoring=false}
  }

  function pname(id){return participants.find(p=>p.id===id)?.name||id||''}
  function renderGuesses(){
    if(!session)return;
    Object.keys(session.votes||{}).forEach(mid=>{
      const match=document.querySelector(`.match[data-match-id="${CSS.escape(mid)}"]`);if(!match||!match.classList.contains('submitted'))return;
      clearDraft(mid);
      $$('.song[data-song-id]',match).forEach(song=>{
        $$('.submitted-guess',song).forEach(x=>x.remove());
        const g=session.guesses?.[song.dataset.songId];if(!g)return;
        const d=document.createElement('div');d.className='submitted-guess';d.innerHTML='<div class="submitted-guess-label">Which Harry Man Submitted...?</div><div class="submitted-guess-value"></div>';
        $('.submitted-guess-value',d).textContent=pname(g.guessed_participant_id);$('.artist',song)?.insertAdjacentElement('afterend',d);
      });
    });
  }

  async function refresh({restore=true}={}){const ok=await loadContext();if(!ok)return false;restoreListening();renderGuesses();if(restore)await restoreDrafts();return true}
  async function waitStable(logged){
    const t=performance.now();while(performance.now()-t<1800){
      if(!logged){if($('#loginModal')?.hidden===false)break}
      else{const expected=Object.values(session?.votes||{}).filter(v=>document.querySelector(`.match[data-match-id="${CSS.escape(v.match_id)}"]`)).length;if($$('.match.submitted').length>=expected&&$('#accountBtn')?.textContent?.includes(session?.name||''))break}
      await new Promise(r=>setTimeout(r,40));
    }
  }
  function reveal(){document.documentElement.classList.remove('hmpp-boot-pending')}

  document.addEventListener('click',e=>{
    const v=e.target.closest('.vote-btn');if(v&&!v.disabled)setTimeout(()=>saveDraft(v.closest('.match')),0);
    const submit=e.target.closest('.matchup-submit-btn');if(submit){const mid=submit.closest('.match')?.dataset.matchId;let n=0;const timer=setInterval(async()=>{n++;await refresh({restore:false});if(session?.votes?.[mid]||n>=12){clearInterval(timer);renderGuesses();if(session?.votes?.[mid])clearDraft(mid)}},150)}
  },true);
  document.addEventListener('change',e=>{const s=e.target.closest('.guess-select');if(s)setTimeout(()=>saveDraft(s.closest('.match')),0)},true);

  function watchAccount(){const a=$('#accountBtn');if(!a)return;new MutationObserver(async()=>{if(a.textContent.trim()==='Log in'){session=null;pid=null;return}await refresh()}).observe(a,{childList:true,subtree:true,characterData:true})}
  window.addEventListener('focus',()=>{if(pid)restoreListening()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&pid)restoreListening()});

  async function boot(){const logged=await refresh({restore:false});await waitStable(logged);if(logged){renderGuesses();await restoreDrafts()}watchAccount();reveal()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else void boot();
})();