import { simulateRound, summarizeRound } from './js/stats-v3-core.mjs';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const PREFIX='hmpp:v3:simulated-results:';
let session=null;
let participants=[];
const authoritative=new Map();

function activeRound(){return $('.header-round.active')?.dataset.round||'play-in'}
function section(round){return $(`.round-section[data-round="${round}"]`)}
function key(round){return PREFIX+round}
function load(round){try{return JSON.parse(localStorage.getItem(key(round))||'null')}catch{return null}}
function save(round,data){localStorage.setItem(key(round),JSON.stringify(data))}
function clear(round){localStorage.removeItem(key(round));authoritative.delete(round)}
function label(round){return $('.header-round[data-round="'+round+'"]')?.textContent.trim()||round}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function api(path,opts={}){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`);return b}

function collectMatches(round){const root=section(round);if(!root)return[];return $$('.match[data-match-id]',root).map(match=>{const songs=$$('.song[data-song-id]',match).map(song=>({id:song.dataset.songId,title:song.dataset.title||$('.title',song)?.textContent.trim()||song.dataset.songId,artist:song.dataset.artist||$('.artist',song)?.textContent.trim()||''}));return songs.length===2?{id:match.dataset.matchId,songs}:null}).filter(Boolean)}

function ensureShell(){
  if($('#v3SimControls'))return;
  const toolbar=$('#bracket');if(!toolbar)return;
  const controls=document.createElement('div');controls.id='v3SimControls';controls.className='v3-sim-controls';controls.innerHTML='<div class="v3-sim-status" id="v3SimStatus">Test-only preview · current round only</div><button class="v3-clear-btn" id="v3ClearResults" type="button">Clear Preview</button><button class="v3-simulate-btn" id="v3LoadProduction" type="button">Load Prod + Fill 3</button><button class="v3-simulate-btn" id="v3SimulateResults" type="button">Simulate Results</button>';
  toolbar.insertAdjacentElement('afterend',controls);
  const summary=document.createElement('div');summary.id='v3RoundSummary';summary.className='v3-round-summary';controls.insertAdjacentElement('afterend',summary);
  $('#v3SimulateResults').addEventListener('click',simulateCurrentRound);
  $('#v3LoadProduction').addEventListener('click',loadProductionFixture);
  $('#v3ClearResults').addEventListener('click',()=>{clear(activeRound());renderCurrentRound()});
}

function setVisible(on){ensureShell();$('#v3SimControls')?.classList.toggle('show',on);if(!on)$('#v3RoundSummary')?.classList.remove('show')}
function status(text,strong=''){const el=$('#v3SimStatus');if(el)el.innerHTML=strong?`<strong>${esc(strong)}</strong> · ${esc(text)}`:esc(text)}

function summaryFor(data){if(data?.summary)return data.summary;return summarizeRound(data)}
function renderSummary(data){const host=$('#v3RoundSummary');if(!host)return;if(!data){host.classList.remove('show');host.innerHTML='';return}const s=summaryFor(data);const source=data.source==='durable-object-aggregate'?'published/test aggregate':'simulated preview';host.innerHTML=`<div class="v3-summary-inner"><div class="v3-stat"><small>Round</small><strong>${esc(label(data.round))}</strong><em>${source}</em></div><div class="v3-stat"><small>Voters</small><strong>${data.voter_count??s.voter_count??'—'}</strong><em>group ballots</em></div><div class="v3-stat"><small>Closest</small><strong>${esc(s.closest?.id||'—')}</strong><em>${s.closest?`${s.closest.margin}-vote margin`:'no data'}</em></div><div class="v3-stat"><small>Widest</small><strong>${esc(s.widest?.id||'—')}</strong><em>${s.widest?`${s.widest.margin}-vote margin`:'no data'}</em></div><div class="v3-stat"><small>Most guessed</small><strong>${esc(s.most_guessed?.name||'—')}</strong><em>${s.most_guessed?`${s.most_guessed.count} group guesses`:'no data'}</em></div></div>`;host.classList.add('show')}

function resultHtml(song,match){const winner=match.winner_song_id===song.id;const yourVote=match.active_user_ballot?.selected_song_id===song.id;const guesses=(song.top_guesses||[]).map((g,i)=>`<div class="v3-guess-chip"><small>#${i+1} group guess</small><strong>${esc(g.name)}</strong><em>${g.count} vote${g.count===1?'':'s'}</em></div>`).join('');return `<div class="v3-song-result" data-v3-result-song="${esc(song.id)}"><div class="v3-result-top"><div class="v3-vote-line"><strong>${song.vote_count}</strong> of ${match.total_votes} votes · ${Math.round((song.vote_share||0)*100)}%</div><div class="v3-result-tags">${yourVote?'<span class="v3-badge v3-your-vote">Your vote</span>':''}${winner?'<span class="v3-badge v3-winner">Winner</span>':''}</div></div><div class="v3-guess-line"><span>Your guess</span><b>${esc(song.active_user_guess_name||'—')}</b></div><div class="v3-top-guesses">${guesses}</div><div class="v3-preview-note">Top 3 is the group guess, not the actual submitter.</div></div>`}

function clearRender(root){if(!root)return;root.classList.remove('v3-simulated');$$('[data-v3-result-song]',root).forEach(x=>x.remove())}
function renderRound(data){const root=section(data.round);if(!root)return;clearRender(root);root.classList.add('v3-simulated');data.matches.forEach(m=>{const card=$(`.match[data-match-id="${m.id}"]`,root);if(!card)return;m.songs.forEach(song=>{const node=$(`.song[data-song-id="${song.id}"]`,card);if(node)node.insertAdjacentHTML('beforeend',resultHtml(song,m))})})}
function renderCurrentRound(){const round=activeRound();$$('.round-section').forEach(clearRender);const data=authoritative.get(round)||load(round);renderSummary(data);const button=$('#v3SimulateResults');if(data){renderRound(data);if(data.source==='durable-object-aggregate')status(`${data.voter_count} official-style test ballots`,`${label(round)} authoritative QA`);else status(`seed ${data.seed} · ${data.matches.length} matchups`,`${label(round)} simulated`);if(button)button.textContent='Re-simulate Results'}else{status('Test-only preview · current round only');if(button)button.textContent='Simulate Results'}}

async function refreshAuthoritative(round=activeRound(),{force=false}={}){if(session?.is_test!==true)return;try{const data=await api(`/api/admin/round?round=${encodeURIComponent(round)}`);if(data?.stats&&(force||data.state?.results_visible?.[round]===true)){authoritative.set(round,data.stats);renderCurrentRound();return data}if(!force){authoritative.delete(round);renderCurrentRound()}return data}catch{return null}}

async function loadProductionFixture(){const button=$('#v3LoadProduction');button.disabled=true;button.textContent='Loading…';status('Reading production ballots from main and filling only Juh, Chuck, and JJ.');try{const data=await api('/api/admin/seed-production-playin',{method:'POST',body:'{}'});authoritative.set('play-in',data.stats);clear('play-in');authoritative.set('play-in',data.stats);renderCurrentRound();const sims=(data.seeded||[]).filter(x=>x.simulated_votes||x.simulated_guesses).map(x=>x.name).join(', ');status(`${data.aggregate.received_votes} / ${data.aggregate.expected_votes} seeded · simulated: ${sims}`, 'Production QA fixture ready');setTimeout(()=>window.dispatchEvent(new Event('focus')),0)}catch(error){status(error.message)}finally{button.disabled=false;button.textContent='Reload Prod + Fill 3'}}

async function simulateCurrentRound(){const round=activeRound();const matches=collectMatches(round);if(!matches.length){status('No complete two-song matchups exist for this round yet.');return}const button=$('#v3SimulateResults');button.disabled=true;button.textContent='Simulating…';try{if(!participants.length)participants=(await api('/api/participants')).participants||[];const seed=new Uint32Array(1);crypto.getRandomValues(seed);const data=simulateRound({round,matches,participants,seed:seed[0],activeUser:{id:session?.participant_id||'test-voter',name:session?.name||'Test Voter'}});authoritative.delete(round);save(round,data);renderCurrentRound()}catch(error){status(error.message)}finally{button.disabled=false;button.textContent=load(round)?'Re-simulate Results':'Simulate Results'}}

function watchReset(){const attach=()=>{const node=$('#resetStatus');if(!node||node.dataset.v3Observed)return;node.dataset.v3Observed='1';new MutationObserver(()=>{if(/reset complete/i.test(node.textContent||'')){clear(activeRound());renderCurrentRound()}}).observe(node,{childList:true,subtree:true,characterData:true})};attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true})}

async function boot(){try{session=(await api('/api/session')).session||null}catch{session=null}const test=session?.is_test===true&&session?.participant_id==='test-voter';setVisible(test);if(!test)return;try{participants=(await api('/api/participants')).participants||[]}catch{participants=[]}document.addEventListener('click',e=>{if(e.target.closest('.header-round'))setTimeout(()=>refreshAuthoritative(activeRound()),50);const admin=e.target.closest('[data-admin-action="show-results"],[data-admin-action="publish-matchups"]');if(admin)setTimeout(()=>refreshAuthoritative(activeRound(),{force:true}),450)});watchReset();await refreshAuthoritative(activeRound());renderCurrentRound()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
