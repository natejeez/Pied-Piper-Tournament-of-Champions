(() => {
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const LISTEN_RESET_MARKER='hmpp-v231-listening-reset-done';

  async function api(path,opts={}){
    const r=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    let body=null;try{body=await r.json()}catch{}
    if(!r.ok)throw new Error(body?.error||`Request failed (${r.status})`);
    return body;
  }

  function selectedRound(){return $('.header-round.active')?.dataset.round||'play-in'}
  function roundLabel(round){return round==='round-of-64'?'Round of 64':'Play-In'}
  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}

  function installStyles(){
    if($('#v231ResetStyles'))return;
    const style=document.createElement('style');style.id='v231ResetStyles';style.textContent=`
      .dev-reset-panel{max-width:1440px;margin:0 auto 14px;padding:12px 28px;display:flex;align-items:center;gap:12px;justify-content:space-between;background:#fff8e7;border:1px solid #d7b85a;border-left:5px solid var(--gold);border-radius:10px}
      .dev-reset-copy{font-size:11px;color:#5a4a1f}.dev-reset-copy strong{display:block;color:#111;font-size:12px;margin-bottom:2px}
      .dev-reset-btn{border:1px solid #7a2f2f;background:#8f3434;color:#fff;border-radius:8px;padding:9px 12px;font-weight:850;cursor:pointer;white-space:nowrap}.dev-reset-btn:hover{background:#6f2525}.dev-reset-btn:disabled{opacity:.6;cursor:wait}
      .dev-admin-note{grid-column:1/-1;color:#d8c7a4;font-size:10px;line-height:1.4;margin-top:2px}
      @media(max-width:720px){.dev-reset-panel{margin-left:16px;margin-right:16px;padding:12px 14px;align-items:flex-start;flex-direction:column}.dev-reset-btn{width:100%}}
    `;document.head.appendChild(style);
  }

  function ensureOneTimeListeningReset(){
    if(!$('#devModeBanner'))return false;
    try{
      if(localStorage.getItem(LISTEN_RESET_MARKER)==='1')return false;
      localStorage.removeItem('hmpp-listened-test-voter');
      localStorage.setItem(LISTEN_RESET_MARKER,'1');
      if($$('.listened-pill').length){location.reload();return true}
    }catch{}
    return false;
  }

  function installResetPanel(){
    const dev=$('#devModeBanner');
    if(!dev){$('#devResetPanel')?.remove();return}
    let panel=$('#devResetPanel');
    if(!panel){
      panel=document.createElement('section');panel.id='devResetPanel';panel.className='dev-reset-panel';
      panel.innerHTML='<div class="dev-reset-copy"><strong>Test Voter reset</strong><span id="devResetText"></span></div><button id="devResetBtn" class="dev-reset-btn" type="button"></button>';
      const anchor=$('#devAdminPanel')||$('#bracket');anchor?.insertAdjacentElement('afterend',panel);
      $('#devResetBtn',panel)?.addEventListener('click',resetRound);
    }
    updateResetPanel();
  }

  function updateResetPanel(){
    const panel=$('#devResetPanel');if(!panel)return;
    const round=selectedRound(),label=roundLabel(round);
    setText($('#devResetText',panel),`Clear only Test Voter's saved vote + Daddy guesses for ${label}. Official participant data is untouched.`);
    const b=$('#devResetBtn',panel);if(b&&!b.disabled)setText(b,`Reset Test Voting · ${label}`);
  }

  async function resetRound(){
    const round=selectedRound(),label=roundLabel(round);
    if(!confirm(`Reset Test Voter voting for ${label}?\n\nThis deletes Test Voter's saved song votes and submitter guesses for this round. Official participant votes are not affected.`))return;
    const b=$('#devResetBtn');b.disabled=true;setText(b,'Resetting…');
    try{
      await api('/api/admin/reset-test-round',{method:'POST',body:JSON.stringify({round})});
      try{localStorage.removeItem('hmpp-listened-test-voter')}catch{}
      location.reload();
    }catch(err){alert(err.message);b.disabled=false;updateResetPanel()}
  }

  function explainAdminButtons(){
    const panel=$('#devAdminPanel');if(!panel)return;
    let note=$('.dev-admin-note',panel);
    if(!note){note=document.createElement('div');note.className='dev-admin-note';$('.dev-admin-actions',panel)?.appendChild(note)}
    const status=$('#devAdminStatus')?.textContent||'';
    const incomplete=/Official Play-In voting:\s*\d+\s*\/\s*72 votes/i.test(status);
    setText(note,incomplete?'These publication controls unlock only after all 72 official Play-In votes are complete. Test Voter does not count toward 72.':'');
    $$('button[data-admin-action]',panel).forEach(btn=>{if(btn.disabled&&incomplete)btn.title='Locked until all 72 official Play-In votes are complete.';else btn.removeAttribute('title')});
  }

  function sync(){if(ensureOneTimeListeningReset())return;installResetPanel();explainAdminButtons();updateResetPanel()}

  function init(){
    installStyles();sync();
    const observer=new MutationObserver(()=>setTimeout(sync,0));observer.observe(document.body,{subtree:true,childList:true});
    $$('.header-round').forEach(b=>b.addEventListener('click',()=>setTimeout(sync,0)));
    setInterval(sync,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
