import workerV33, { ParticipantVoteStore as V33ParticipantVoteStore } from './worker-v33.js';

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function guessKey(round,songId){return round==='play-in'?songId:`${round}:${songId}`}
function findGuess(guesses,round,songId){return guesses?.[guessKey(round,songId)]||Object.values(guesses||{}).find(g=>g?.round===round&&g?.song_id===songId)||null}
async function sessionFor(request,env,ctx){const r=await workerV33.fetch(new Request(new URL('/api/session',request.url),{method:'GET',headers:request.headers}),env,ctx);let body={};try{body=await r.clone().json()}catch{}return{response:r,session:body.session||null}}
async function participantsFor(request,env,ctx){const r=await workerV33.fetch(new Request(new URL('/api/participants',request.url),{method:'GET',headers:request.headers}),env,ctx);if(!r.ok)return[];return(await r.json()).participants||[]}
async function personalizeStats(request,env,ctx,body,round){if(!body?.stats?.matches)return body;const {session}=await sessionFor(request,env,ctx);if(!session)return body;const names=Object.fromEntries((await participantsFor(request,env,ctx)).map(p=>[p.id,p.name]));const votes=session.votes||{},guesses=session.guesses||{};for(const match of body.stats.matches){match.active_user_ballot={selected_song_id:votes?.[match.id]?.round===round?votes[match.id].song_id:null};for(const song of match.songs||[]){const g=findGuess(guesses,round,song.id);song.active_user_guess_id=g?.guessed_participant_id||null;song.active_user_guess_name=g?(names[g.guessed_participant_id]||g.guessed_participant_id):null}}return body}
function replaceBlock(source,startMarker,endMarker,replacement){const start=source.indexOf(startMarker);if(start<0)return{source,replaced:false};const end=source.indexOf(endMarker,start+startMarker.length);if(end<0)return{source,replaced:false};return{source:source.slice(0,start)+replacement+source.slice(end),replaced:true}}
function patchClient(source){const applied=[];
const handler=`  async function handleAdminClick(e){
    const b=e.target.closest('button[data-admin-action]');if(!b||b.disabled)return;const action=b.dataset.adminAction;if(!adminRoundData)await refreshAdminPanel();if(!adminRoundData)return;
    if(action==='view-submissions'){showSubmissionStatus(adminRoundData.participant_status);return}
    if(action==='view-results'){showResultsModal(adminRoundData.stats||adminRoundData.aggregate);return}
    if(action==='view-matchups'){populateRound64(adminRoundData.preview_matchups,{preview:true});previewedRounds.add('round-of-64');syncRoundAccess();window.dispatchEvent(new CustomEvent('hmpp:v32:voter-view',{detail:{round:'round-of-64'}}));return}
    b.disabled=true;try{const state=adminRoundData.state||{};
      if(action==='toggle-results'){if(state.results_visible?.['play-in'])await api('/api/admin/unpublish-results',{method:'POST',body:JSON.stringify({round:'play-in'})});else await api('/api/admin/show-results',{method:'POST',body:JSON.stringify({round:'play-in'})});await refreshTournamentState()}
      if(action==='toggle-matchups'){
        if(state.published_rounds?.['round-of-64']){await api('/api/admin/unpublish-round',{method:'POST',body:JSON.stringify({round:'round-of-64'})});previewedRounds.delete('round-of-64');await refreshTournamentState()}
        else{
          try{await api('/api/admin/reset-round-data',{method:'POST',body:JSON.stringify({round:'round-of-64',scope:'test-only'})})}catch(resetError){console.warn('Could not pre-clear Test Voter R64 state',resetError)}
          try{const sd=await api('/api/session');sessionState=sd.session;sessionState.votes=sessionState.votes||{};sessionState.guesses=sessionState.guesses||{};pendingVotes.clear()}catch{}
          const d=await api('/api/admin/publish-round',{method:'POST',body:JSON.stringify({round:'round-of-64'})});populateRound64(d.matchups||[],{preview:false});await refreshTournamentState();window.dispatchEvent(new CustomEvent('hmpp:v32:voter-view',{detail:{round:'round-of-64'}}));
        }
        await refreshAdminPanel();
      }
    }catch(err){alert(err.message);b.disabled=false}
  }`;
let p=replaceBlock(source,'  async function handleAdminClick(e){','\n  function showSubmissionStatus(',handler+'\n\n');source=p.source;if(p.replaced)applied.push('publish-reset');
const results=`  function showResultsModal(data){
    const body=$('#resultsModalBody');$('#resultsModalTitle').textContent='Previous-round results';body.replaceChildren();const matches=data.matches||data.results||[];
    for(const r of matches){const box=document.createElement('div');box.className='v32-preview-match';box.innerHTML=\`<div class="v32-preview-id">\${esc(r.id||r.match_id)}</div>\`;
      for(const s of r.songs||[]){const sid=s.id||s.song_id,m=songMeta(sid),votes=s.vote_count??s.votes??0,total=r.total_votes||9,pct=total?Math.round(votes/total*100):0,winner=(r.winner_song_id===sid),yourVote=r.active_user_ballot?.selected_song_id===sid,guesses=(s.top_guesses||[]).map((g,i)=>\`<div><b>#\${i+1}</b> \${esc(g.name)} <span>\${g.count} vote\${g.count===1?'':'s'}</span></div>\`).join('');const row=document.createElement('div');row.className='v32-preview-song';row.innerHTML=\`<div class="v32-result-left"><div class="v32-result-tags"><span class="dev-song-id">\${esc(sid)}</span>\${yourVote?'<span class="v32-your-vote">YOUR VOTE</span>':''}\${winner?'<span class="v32-winner-badge">WINNER</span>':''}</div><strong>\${esc(m.title)}</strong><em>\${esc(m.artist)}</em><small><b>\${votes}</b> of \${total} votes · \${pct}%</small></div><div class="v32-result-right"><label>GROUP GUESSES:</label>\${guesses||'<div>—</div>'}<div class="v32-your-guess"><span>Your guess</span><b>\${esc(s.active_user_guess_name||'—')}</b></div></div>\`;box.appendChild(row)}body.appendChild(box)}openWorkflowModal($('#resultsModal'))
  }`;
p=replaceBlock(source,'  function showResultsModal(data){','\n  function makeSongCard(',results+'\n\n');source=p.source;if(p.replaced)applied.push('preview-layout');
const populate=`  function resetRoundCardToVoter(card){
    clearPendingUI(card);card.classList.remove('submitted','needs-guesses','matchup-pending','v32-published-results','v32-preview-overlay');card.classList.add('v32-voter-reset');$$('.winner-check,.submitted-guess,.v32-published-result,.v32-sim-result',card).forEach(x=>x.remove());matchSongs(card).forEach(song=>{song.classList.remove('vote-winner','vote-loser','pending-vote-choice','pending-vote-other');const btn=$('.vote-btn',song);if(btn){btn.textContent='Tap to vote';btn.classList.remove('submitted');btn.removeAttribute('data-submitted')}const listen=$('.listen-btn',song);if(listen){listen.disabled=false;listen.removeAttribute('disabled');listen.setAttribute('aria-expanded','false')}});setTimeout(()=>{card.classList.remove('v32-voter-reset');syncMatchReady(card)},0)
  }

  function populateRound64(matchups,{preview=false}={}){
    for(const m of matchups||[]){if(m.songs?.length!==2)continue;const card=document.querySelector(\`.match[data-match-id="\${CSS.escape(m.match_id)}"]\`);if(!card)continue;const fixedId=m.songs[1],desiredId=m.songs[0];let dynamic=$('.song.placeholder',card)||$('.song[data-v32-dynamic="play-in"]',card);if(!dynamic){const songs=matchSongs(card);dynamic=songs.find(s=>s.dataset.songId!==fixedId)||null}if(dynamic?.classList.contains('placeholder')||dynamic?.dataset.songId!==desiredId){const replacement=makeSongCard(desiredId,m.match_id);replacement.dataset.v32Dynamic='play-in';dynamic?.replaceWith(replacement)}else if(dynamic)dynamic.dataset.v32Dynamic='play-in';card.dataset.resolved='true';const vote=sessionState?.votes?.[m.match_id];if(vote?.round==='round-of-64'){collapseMatch(card,vote.song_id);const songs=matchSongs(card),complete=songs.length===2&&songs.every(x=>!!guessFor('round-of-64',x.dataset.songId));if(!complete)renderGuessControls(card,vote.song_id,{legacy:true})}else resetRoundCardToVoter(card)}
    const sec=$('#r');if(sec){sec.classList.toggle('dev-round-preview',preview);sec.classList.remove('round-unpublished')}installDevMode();setTimeout(mirrorListening,0)
  }`;
p=replaceBlock(source,'  function populateRound64(matchups,{preview=false}={}){','\n  async function applyPublishedResults(){',populate+'\n\n');source=p.source;if(p.replaced)applied.push('round64-voter-reset');
return{source,applied}}

async function personalizedResponse(request,env,ctx,response,round){if(!response.ok)return response;const body=await response.json();await personalizeStats(request,env,ctx,body,round);return json(body,response.status,Object.fromEntries([...response.headers].filter(([k])=>!['content-length','content-type'].includes(k.toLowerCase()))))}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/admin/round'&&request.method==='GET'){const round=url.searchParams.get('round')||'play-in';return personalizedResponse(request,env,ctx,await workerV33.fetch(request,env,ctx),round)}
    if(url.pathname==='/api/admin/simulate-round'&&request.method==='POST'){const clone=request.clone();let body={};try{body=await clone.json()}catch{}const round=body.round||'play-in';return personalizedResponse(request,env,ctx,await workerV33.fetch(request,env,ctx),round)}
    if(url.pathname==='/api/published-results'&&request.method==='GET'){const round=url.searchParams.get('round')||'play-in';return personalizedResponse(request,env,ctx,await workerV33.fetch(request,env,ctx),round)}
    if(url.pathname==='/guessing.js'){
      const response=await workerV33.fetch(request,env,ctx);if(!response.ok)return response;const patched=patchClient(await response.text());const missing=['publish-reset','preview-layout','round64-voter-reset'].filter(x=>!patched.applied.includes(x));if(missing.length)return new Response(`throw new Error(${JSON.stringify('HMPP V2.34 patch failed: ')}+${JSON.stringify(missing.join(', '))});`,{status:500,headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-hmpp-build':'v2.34-patch-failed'}});const headers=new Headers(response.headers);headers.set('content-type','application/javascript; charset=utf-8');headers.set('cache-control','no-store');headers.set('x-hmpp-build','v2.34-r64-ready');headers.set('x-hmpp-v34-patches',patched.applied.join(','));return new Response(patched.source,{status:response.status,headers})
    }
    return workerV33.fetch(request,env,ctx)
  }
};

export class ParticipantVoteStore extends V33ParticipantVoteStore {}
