(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let renderToken=0;

  async function api(path){
    const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(body.error||`Request failed (${r.status})`);
    return body;
  }

  function songMeta(songId){
    const s=document.querySelector(`.song[data-song-id="${CSS.escape(songId)}"]`);
    return {
      title:s?.dataset.title||$('.title',s)?.textContent?.trim()||songId,
      artist:s?.dataset.artist||$('.artist',s)?.textContent?.trim()||''
    };
  }

  function clearOldPublishedArtifacts(root=document){
    $$('.public-result-count,.submitted-guess,.v32-published-result',root).forEach(x=>x.remove());
    $$('.published-winner',root).forEach(x=>x.classList.remove('published-winner'));
    $$('.v32-published-results',root).forEach(x=>x.classList.remove('v32-published-results'));
  }

  function renderMatch(matchData){
    const match=$(`.match[data-match-id="${CSS.escape(matchData.id)}"]`);
    if(!match)return;
    match.classList.add('v32-published-results');

    let badge=$('.published-result-badge',match);
    if(!badge){
      badge=document.createElement('span');
      badge.className='published-result-badge';
      badge.textContent='RESULTS PUBLISHED';
      $('.matchhead',match)?.appendChild(badge);
    }

    for(const song of matchData.songs||[]){
      const card=$(`.song[data-song-id="${CSS.escape(song.id)}"]`,match);
      if(!card)continue;
      $('.v32-published-result',card)?.remove();
      const meta=songMeta(song.id);
      const winner=matchData.winner_song_id===song.id;
      const yourVote=matchData.active_user_ballot?.selected_song_id===song.id;
      const guesses=(song.top_guesses||[]).map((g,i)=>`<div><b>#${i+1}</b> ${esc(g.name)} <span>${g.count} vote${g.count===1?'':'s'}</span></div>`).join('');
      const node=document.createElement('div');
      node.className='v32-published-result';
      node.innerHTML=`<div class="v32-result-left"><div class="v32-result-tags"><span class="dev-song-id">${esc(song.id)}</span>${yourVote?'<span class="v32-your-vote">YOUR VOTE</span>':''}${winner?'<span class="v32-winner-badge">WINNER</span>':''}</div><strong>${esc(meta.title)}</strong><em>${esc(meta.artist)}</em><small><b>${song.vote_count}</b> of ${matchData.total_votes} votes · ${Math.round((song.vote_share||0)*100)}%</small></div><div class="v32-result-right"><label>GROUP GUESSES:</label>${guesses||'<div>—</div>'}<div class="v32-your-guess"><span>Your guess</span><b>${esc(song.active_user_guess_name||'—')}</b></div></div>`;
      card.appendChild(node);
    }
  }

  async function renderPublishedPlayIn(){
    const token=++renderToken;
    try{
      const session=(await api('/api/session')).session;
      if(!session)return;
      const state=(await api('/api/tournament-state')).state||{};
      if(token!==renderToken)return;
      if(state.results_visible?.['play-in']!==true){
        clearOldPublishedArtifacts($('#p')||document);
        return;
      }
      const data=await api('/api/published-results?round=play-in');
      if(token!==renderToken)return;
      const root=$('#p')||document;
      clearOldPublishedArtifacts(root);
      for(const match of data.stats?.matches||[])renderMatch(match);
      document.documentElement.dataset.hmppPublishedRenderer='v35';
    }catch(error){
      console.warn('HMPP V2.35 published-results render deferred',error);
    }
  }

  function schedule(){
    setTimeout(renderPublishedPlayIn,0);
    setTimeout(renderPublishedPlayIn,150);
    setTimeout(renderPublishedPlayIn,650);
  }

  function boot(){
    schedule();
    const account=$('#accountBtn');
    if(account)new MutationObserver(schedule).observe(account,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',e=>{
      if(e.target.closest('.header-round')||e.target.closest('[data-admin-action]'))setTimeout(schedule,120);
    });
    window.addEventListener('focus',schedule);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
