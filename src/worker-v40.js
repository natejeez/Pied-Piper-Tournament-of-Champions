import workerV39, { ParticipantVoteStore as V39ParticipantVoteStore } from './worker-v39.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';

function patchGuessingSource(source) {
  if (!source.includes('function hmppRoundGuessKey')) {
    source = source.replace(
      '(() => {',
      `(() => {
  function hmppRoundGuessKey(round, songId) {
    return round === 'play-in' ? songId : round + ':' + songId;
  }
  function hmppRoundGuessFor(state, round, songId) {
    if (!state || !round || !songId) return null;
    const key = hmppRoundGuessKey(round, songId);
    const exact = state.guesses?.[key];
    if (exact && exact.round === round && exact.song_id === songId) return exact;
    return Object.values(state.guesses || {}).find(g =>
      g?.round === round && g?.song_id === songId
    ) || null;
  }
`
    );
  }

  source = source.replace(
    'function renderGuessControls(match,voteSongId,{legacy=false}={}){',
    'function renderGuessControls(match,voteSongId,{legacy=false}={}){'
  );
  source = source.replace(
    'const songs=matchSongs(match); if(songs.length!==2||!participants.length)return;',
    'const songs=matchSongs(match); if(songs.length!==2||!participants.length)return; const round=match.dataset.round||selectedRound();'
  );
  source = source.replace(
    'const sid=song.dataset.songId; const saved=sessionState?.guesses?.[sid];',
    'const sid=song.dataset.songId; const saved=hmppRoundGuessFor(sessionState,round,sid);'
  );
  source = source.replace(
    '(data.guesses||[]).forEach(g=>sessionState.guesses[g.song_id]=g);',
    '(data.guesses||[]).forEach(g=>sessionState.guesses[hmppRoundGuessKey(match.dataset.round||selectedRound(),g.song_id)]=g);'
  );
  source = source.replace(
    'const guessesComplete=songs.every(s=>!!sessionState.guesses?.[s.dataset.songId]);',
    'const guessesComplete=songs.every(s=>!!hmppRoundGuessFor(sessionState,match.dataset.round||selectedRound(),s.dataset.songId));'
  );
  source = source.replace(
    "card.dataset.resolved='true';",
    "card.dataset.round=m.round||'round-of-64';card.dataset.resolved='true';"
  );
  return source;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const staging = url.hostname.includes(STAGING_HOST);

    if (staging && url.pathname === '/guessing.js') {
      const response = await workerV39.fetch(request, env, ctx);
      if (!response.ok) return response;

      const source = patchGuessingSource(await response.text());
      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/javascript; charset=utf-8');
      headers.set('cache-control', 'no-store');
      headers.set('x-hmpp-build', 'v2.40-round-isolation');
      headers.set('x-hmpp-voting-owner', 'modal-atomic-matchup');
      headers.set('x-hmpp-client-fixes', 'round-scoped-guess-key');
      return new Response(source, {
        status: response.status,
        headers
      });
    }

    return workerV39.fetch(request, env, ctx);
  }
};

export class ParticipantVoteStore extends V39ParticipantVoteStore {}
