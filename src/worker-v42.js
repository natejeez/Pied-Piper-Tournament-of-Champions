import workerV40, { ParticipantVoteStore as V40ParticipantVoteStore } from './worker-v40.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';

function patchM005Client(source) {
  const startMarker = '  function renderGuessControls(match,voteSongId,{legacy=false}={}){';
  const endMarker = '  function updateMatchSubmit(match){';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start >= 0 && end >= 0) {
    const replacement = `  function renderGuessControls(match,voteSongId,{legacy=false}={}){
    if(!match)return;
    const songs=matchSongs(match); if(songs.length!==2||!participants.length)return;
    const round=match.dataset.round||selectedRound();
    match.classList.add('needs-guesses'); if(!legacy)match.classList.add('matchup-pending');
    songs.forEach(song=>{
      const sid=song.dataset.songId;
      const saved=typeof hmppRoundGuessFor==='function' ? hmppRoundGuessFor(sessionState,round,sid) : null;
      if(!$('.guess-prompt',song)){const p=document.createElement('div');p.className='guess-prompt';p.textContent='Which Harry Man Submitted...';$('.title',song)?.insertAdjacentElement('beforebegin',p)}
      let select=$('.guess-select',song);
      if(!select){select=document.createElement('select');select.className='guess-select';select.dataset.songId=sid;select.setAttribute('aria-label',`Guess who submitted ${song.dataset.title}`);select.innerHTML=guessOptions('');select.addEventListener('change',()=>updateMatchSubmit(match));$('.artist',song)?.insertAdjacentElement('afterend',select)}
      select.value=saved?.guessed_participant_id||'';
      select.disabled=!!saved;
      select.setAttribute('aria-disabled',saved?'true':'false');
    });
    if(!$('.matchup-submit-wrap',match)){const wrap=document.createElement('div');wrap.className='matchup-submit-wrap';wrap.innerHTML='<button class="matchup-submit-btn" type="button" disabled>Submit Matchup</button>';match.appendChild(wrap)}
    updateMatchSubmit(match);
  }
`;
    source = source.slice(0,start) + replacement + source.slice(end);
  }
  source = source.replace(
    'const guessesComplete=songs.every(s=>!!sessionState.guesses?.[s.dataset.songId]);',
    "const guessesComplete=songs.every(s=>!!hmppRoundGuessFor(sessionState,match.dataset.round||selectedRound(),s.dataset.songId));"
  );
  source = source.replace(
    'const complete=songs.length===2&&songs.every(x=>!!sessionState?.guesses?.[x.dataset.songId]);',
    "const complete=songs.length===2&&songs.every(x=>!!hmppRoundGuessFor(sessionState,card.dataset.round||selectedRound(),x.dataset.songId));"
  );
  return source;
}


function patchGuessingSource(source) {
  if (!source.includes('hmppM005RoundIsolated')) {
    // v2.36 introduced guessFor(). Replace that helper at the final served layer
    // so Play-In records can never satisfy an R64 lookup, even if wrappers above
    // it are changed or bypassed later.
    source = source.replace(
      /function guessFor\(round,songId\)\{[\s\S]*?\n  \}/,
      `function guessFor(round,songId,matchId){
    if (!round || !songId) return null;
    const key=round==='play-in'?songId:round+':'+songId;
    const exact=sessionState?.guesses?.[key];
    if (exact && exact.round===round && exact.song_id===songId && (!matchId || exact.match_id===matchId)) return exact;
    return null;
  }
  function hmppM005RoundIsolated() { return true; }`
    );
    source = source.replace(
      'const saved=guessFor(match.dataset.round,sid);',
      'const saved=guessFor(match.dataset.round,sid,match.dataset.matchId);'
    );
  }
  return source;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname.includes(STAGING_HOST) && url.pathname === '/guessing.js') {
      const response = await workerV40.fetch(request, env, ctx);
      if (!response.ok) return response;
      const source = patchGuessingSource(await response.text());
      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/javascript; charset=utf-8');
      headers.set('cache-control', 'no-store');
      headers.set('x-hmpp-build', 'v2.42-m005-stale-select-guard');
      headers.set('x-hmpp-voting-owner', 'modal-atomic-matchup');
      return new Response(source, {status:response.status, headers});
    }
    return workerV40.fetch(request, env, ctx);
  }
};

export class ParticipantVoteStore extends V40ParticipantVoteStore {}
