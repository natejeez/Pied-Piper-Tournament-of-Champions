import workerV40, { ParticipantVoteStore as V40ParticipantVoteStore } from './worker-v40.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';

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
      headers.set('x-hmpp-build', 'v2.41-m005-round-isolation');
      headers.set('x-hmpp-voting-owner', 'modal-atomic-matchup');
      return new Response(source, {status:response.status, headers});
    }
    return workerV40.fetch(request, env, ctx);
  }
};

export class ParticipantVoteStore extends V40ParticipantVoteStore {}
