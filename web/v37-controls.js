(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let session=null;
  const viewKey=round=>`hmpp:v37:view:${round}`;
  const dataKey=round=>`hmpp:v37:preview:${round}`;
  function currentRound(){return $('.header-round.active')?.dataset.round||'play-in'}
  function section(round){return $(`.round-section[data-round="${round}"]`)}
  async function api(path,opts={}){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`);return b}
  function clearPreview(round,{persist=true}={}){const root=section(round);if(root){root.classList.remove('v32-preview-overlay');$$('.v32-sim-result',root).forEach(x=>x.remove())}if(persist)sessionStorage.setItem(viewKey(round),'voter')}
  function setStatus(text){const el=$('#v32TestStatus');if(el)el.textContent=text||''}
  async function published(round){try{const d=await api('/api/tournament-state');return d.state?.results_visible?.[round]===true}catch{return false}}

  function dockLegacyControls(){
    const bar=$('#devRoundResetBar'),legacy=$('#v3SimControls');
    if(!bar||!legacy)return;
    const row=$('.reset-controls',bar)||bar;
    if(legacy.parentElement!==row)row.appendChild(legacy);
    legacy.classList.add('v37-docked-sim-controls');
    const summary=$('#v3RoundSummary');if(summary)summary.hidden=true;
  }

  async function syncRibbon(){
    const bar=$('#devRoundResetBar');if(!bar||session?.participant_id!=='test-voter')return;
    const round=currentRound(),isPublished=await published(round);bar.classList.toggle('v32-playin',round==='play-in');dockLegacyControls();
    let host=$('#v32TestActions');
    if(!host){host=document.createElement('div');host.id='v32TestActions';host.className='v32-test-actions';host.innerHTML='<button id="v32ClearPreview" type="button">Clear Preview</button><button id="v32Simulate" type="button">Simulate</button><span id="v32TestStatus" class="v32-test-status"></span>';$('.reset-controls',bar)?.appendChild(host);$('#v32ClearPreview').addEventListener('click',()=>{clearPreview(currentRound());setStatus('Voter view restored for this tab.')});$('#v32Simulate').addEventListener('click',simulate)}
    host.hidden=isPublished;
    const legacy=$('#v3SimControls');if(legacy)legacy.hidden=isPublished;
    const sim=$('#v32Simulate');if(sim&&!isPublished){let has=false;try{has=!!sessionStorage.getItem(dataKey(round))}catch{}sim.textContent=has?'Re-simulate':'Simulate'}
  }

  async function simulate(){
    const round=currentRound(),button=$('#v32Simulate');button.disabled=true;button.textContent='Simulating…';setStatus('Using production submissions where available; filling only missing ballots.');
    try{const d=await api('/api/admin/simulate-round',{method:'POST',body:JSON.stringify({round})});sessionStorage.setItem(dataKey(round),JSON.stringify(d.stats));sessionStorage.setItem(viewKey(round),'preview');location.reload()}
    catch(e){setStatus(e.message);button.textContent='Simulate';button.disabled=false}
  }

  async function ensure(){try{session=(await api('/api/session')).session||null}catch{session=null}if(session?.participant_id!=='test-voter')return;await syncRibbon()}
  window.addEventListener('hmpp:v32:voter-view',e=>{clearPreview(e.detail?.round||currentRound());setTimeout(syncRibbon,0)});
  document.addEventListener('click',e=>{if(e.target.closest('.header-round'))setTimeout(syncRibbon,80)});
  function observe(){const account=$('#accountBtn');if(account)new MutationObserver(()=>setTimeout(ensure,80)).observe(account,{childList:true,subtree:true,characterData:true});new MutationObserver(()=>{dockLegacyControls();if($('#devRoundResetBar'))void syncRibbon()}).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observe();setTimeout(ensure,120)},{once:true});else{observe();setTimeout(ensure,120)}
})();
