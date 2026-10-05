import workerV39, { ParticipantVoteStore as V39ParticipantVoteStore } from './worker-v39.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';

function patchGuessingSource(source) {
  // The V2 round-scope fix must be enforced at the final served client layer.
  // Historical Play-In guesses remain in session state for audit/history, but
  // R64 controls may only resolve guesses whose record belongs to R64.
  if (!source.includes('function hmppRoundGuessKey')) {
    const marker = '(() => {';
    const helper = `(() => {
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
`;
    if (source.startsWith(marker)) source = marker + helper.slice(marker.length);
  }

  source = source.replace(
    /sessionState\\.guesses\\[g\\.song_id\\]=g/g,
    'sessionState.guesses[hmppRoundGuessKey(match.dataset.round,g.song_id)]=g'
  );
  source = source.replace(
    /sessionState\\?\\.guesses\\?\\.\\[s\\.dataset\\.songId\\]/g,
    'hmppRoundGuessFor(sessionState,match.dataset.round,s.dataset.songId)'
  );
  source = source.replace(
    /const saved=sessionState\\?\\.guesses\\?\\.\\[sid\\];/g,
    'const saved=hmppRoundGuessFor(sessionState,match.dataset.round,sid);'
  );

  // Make the round explicit on dynamically resolved R64 match containers.
  source = source.replace(
    /card\\.dataset\\.resolved='true';/g,
    "card.dataset.round=m.round||'round-of-64';card.dataset.resolved='true';"
  );

  // Also protect any existing round-aware helper from accepting a malformed
  // legacy record whose key happens to collide with the current song ID.
  source = source.replace(
    /function guessFor\\(round,songId\\)\\{[^}]*Object\\.values\\(sessionState\\?\\.guesses\\|\\|\\{\\}\\)\\.find\\(g=>g\\?\\.round===round&&g\\?\\.song_id===songId\\)\\|\\|null\\}/g,
    "function guessFor(round,songId){return hmppRoundGuessFor(sessionState,round,songId)}"
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

      return new Response(source, {
        status: response.status,
        headers
      });
    }

    return workerV39.fetch(request, env, ctx);
  }
};

export class ParticipantVoteStore extends V39ParticipantVoteStore {}
