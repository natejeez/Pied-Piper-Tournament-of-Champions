(() => {
  const ROUND_SECTIONS = {
    'play-in': '#p',
    'round-of-64': '#r'
  };
  let participants = [];
  let guessState = {};
  let activeRoundGuess = 'play-in';
  let refreshTimer = null;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  function installInstruction(){
    const existing=$('.guess-instruction');
    if(existing)return;
    const caption=$('#bracket .caption');
    if(!caption)return;
    const line=document.createElement('div');
    line.className='caption guess-instruction';
    line.textContent='After voting for a matchup, you can then vote for who you think submitted the song. Guess the Harry Man!';
    caption.insertAdjacentElement('afterend',line);
  }

  function installSubmitBar(){
    if($('#guessSubmitBar'))return;
    const bar=document.createElement('div');
    bar.className='guess-submit-bar';
    bar.id='guessSubmitBar';
    bar.hidden=true;
    bar.innerHTML='<button id="guessSubmitBtn" type="button">Submit your Guesses</button>';
    document.body.appendChild(bar);
    $('#guessSubmitBtn').addEventListener('click',submitGuesses);
  }

  async function api(path,opts={}){
    const r=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    let body=null;try{body=await r.json()}catch{}
    if(!r.ok)throw new Error(body?.error||`Request failed (${r.status})`);
    return body;
  }

  async function loadDirectory(){
    try{
      const data=await api('/api/participants');
      participants=(data.participants||[]).filter(p=>!p.is_test);
    }catch{
      try{
        const r=await fetch('/data/2026/participants/public.json');
        const data=await r.json();participants=(data.participants||[]).filter(p=>!p.is_test);
      }catch{participants=[]}
    }
  }

  async function loadGuessState(){
    try{const data=await api('/api/guesses');guessState=data.guesses||{}}
    catch{guessState={}}
    renderAllSubmitted();
  }

  function guessOptions(selected=''){
    return '<option value="">Select a Harry Man…</option>'+participants.map(p=>`<option value="${p.id}"${p.id===selected?' selected':''}>${p.name}</option>`).join('');
  }

  function renderMatch(match){
    if(!match?.classList.contains('submitted')||!participants.length)return;
    $$('.song[data-song-id]',match).forEach(song=>{
      const sid=song.dataset.songId;
      const saved=guessState[sid];
      if(!$('.guess-prompt',song)){
        const prompt=document.createElement('div');
        prompt.className='guess-prompt';
        prompt.textContent='Which Harry Man Submitted...';
        $('.title',song)?.insertAdjacentElement('beforebegin',prompt);
      }
      let select=$('.guess-select',song);
      if(!select){
        select=document.createElement('select');
        select.className='guess-select';
        select.dataset.songId=sid;
        select.dataset.matchId=match.dataset.matchId;
        select.dataset.round=match.dataset.round;
        select.setAttribute('aria-label',`Guess who submitted ${song.dataset.title}`);
        select.innerHTML=guessOptions(saved?.guessed_participant_id||'');
        select.addEventListener('change',updateSubmitState);
        $('.artist',song)?.insertAdjacentElement('afterend',select);
      }
      if(saved){
        select.value=saved.guessed_participant_id;
        select.disabled=true;
        if(!$('.guess-saved',song)){
          const savedNote=document.createElement('span');
          savedNote.className='guess-saved';savedNote.textContent='✓ Guess saved';
          select.insertAdjacentElement('afterend',savedNote);
        }
      }
    });
    updateSubmitState();
  }

  function renderAllSubmitted(){
    $$('.match.submitted').forEach(renderMatch);
    updateSubmitState();
  }

  function clearGuessUI(){
    $$('.guess-prompt,.guess-select,.guess-saved').forEach(x=>x.remove());
    const bar=$('#guessSubmitBar');if(bar)bar.hidden=true;
  }

  function currentRound(){
    const active=$('.header-round.active');
    return active?.dataset.round||activeRoundGuess;
  }

  function pendingSelects(){
    activeRoundGuess=currentRound();
    const section=$(ROUND_SECTIONS[activeRoundGuess]);
    if(!section)return[];
    return $$('.match.submitted .guess-select:not(:disabled)',section);
  }

  function updateSubmitState(){
    const bar=$('#guessSubmitBar');if(!bar)return;
    const pending=pendingSelects();
    bar.hidden=!(pending.length&&pending.every(s=>s.value));
  }

  async function submitGuesses(){
    const selects=pendingSelects();
    if(!selects.length||!selects.every(s=>s.value))return;
    const button=$('#guessSubmitBtn');button.disabled=true;button.textContent='Submitting Guesses…';
    const guesses=selects.map(s=>({match_id:s.dataset.matchId,round:s.dataset.round,song_id:s.dataset.songId,guessed_participant_id:s.value}));
    try{
      const data=await api('/api/guesses',{method:'POST',body:JSON.stringify({guesses})});
      (data.guesses||[]).forEach(g=>guessState[g.song_id]=g);
      selects.forEach(s=>{
        const saved=guessState[s.dataset.songId];if(!saved)return;
        s.value=saved.guessed_participant_id;s.disabled=true;
        if(!$('.guess-saved',s.parentElement)){
          const n=document.createElement('span');n.className='guess-saved';n.textContent='✓ Guess saved';s.insertAdjacentElement('afterend',n);
        }
      });
      updateSubmitState();
    }catch(err){alert(err.message)}
    finally{button.disabled=false;button.textContent='Submit your Guesses'}
  }

  function scheduleRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{renderAllSubmitted();updateSubmitState()},40);
  }

  function observeApp(){
    const observer=new MutationObserver(mutations=>{
      let accountChanged=false,submittedChanged=false;
      for(const m of mutations){
        if(m.type==='attributes'&&m.target.classList?.contains('match'))submittedChanged=true;
        if(m.type==='characterData'||m.type==='childList'){
          if(m.target===document.body||m.target.closest?.('#accountBtn'))accountChanged=true;
        }
      }
      if(submittedChanged)scheduleRefresh();
      if(accountChanged){
        const text=$('#accountBtn')?.textContent||'';
        if(text.trim()==='Log in'){guessState={};clearGuessUI()}
        else{loadGuessState()}
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
    $$('.header-round').forEach(b=>b.addEventListener('click',()=>{activeRoundGuess=b.dataset.round;setTimeout(updateSubmitState,0)}));
  }

  async function init(){
    installInstruction();installSubmitBar();
    await loadDirectory();
    await loadGuessState();
    observeApp();
    setTimeout(renderAllSubmitted,250);
    setTimeout(renderAllSubmitted,900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
