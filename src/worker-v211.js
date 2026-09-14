import workerV29, { ParticipantVoteStore as V29ParticipantVoteStore } from './worker-v29.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';
const LEGACY_VOTE_BRANCH = "const v=e.target.closest('.vote-btn.ready');if(v)beginVote(v)";
const LEGACY_VOTE_REPLACEMENT = "/* v2.11 staging: atomic matchup voting owns .vote-btn.ready */";

function stagingOnly(url) {
  return url.hostname.includes(STAGING_HOST);
}

function withHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!stagingOnly(url)) return workerV29.fetch(request, env, ctx);

    // Use the already-proven v2.9/v2.6 guessing.js path rather than rewriting
    // the whole client again. v2.6 owns the narrow observer/select patch and
    // v2.7 owns submitted-guess rendering. v2.11 only prevents the obsolete
    // single-vote UI in index.html from competing with the atomic workflow.
    if (url.pathname === '/guessing.js') {
      const response = await workerV29.fetch(request, env, ctx);
      if (!response.ok) return response;
      return new Response(response.body, {
        status: response.status,
        headers: withHeaders(response, {
          'cache-control': 'no-store',
          'x-hmpp-build': 'v2.11-test',
          'x-hmpp-voting-owner': 'atomic-guessing-js'
        })
      });
    }

    const response = await workerV29.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') &&
        (url.pathname === '/' || url.pathname === '/index.html') &&
        response.ok &&
        (response.headers.get('content-type') || '').includes('text/html')) {
      let html = await response.text();
      if (!html.includes(LEGACY_VOTE_BRANCH)) {
        console.error('HMPP v2.11 could not locate legacy single-vote click branch.');
        return new Response('Staging client build mismatch: legacy vote handler was not found.', {
          status: 500,
          headers: { 'content-type':'text/plain; charset=utf-8', 'cache-control':'no-store', 'x-hmpp-build':'v2.11-test' }
        });
      }
      html = html.replace(LEGACY_VOTE_BRANCH, LEGACY_VOTE_REPLACEMENT);
      html = html.replace('</head>', '<script>window.__HMPP_ATOMIC_MATCHUP_VOTING__=true;</script></head>');
      return new Response(html, {
        status: response.status,
        headers: withHeaders(response, {
          'cache-control':'no-store',
          'x-hmpp-build':'v2.11-test',
          'x-hmpp-legacy-vote-handler':'disabled'
        })
      });
    }

    return response;
  }
};

export class ParticipantVoteStore extends V29ParticipantVoteStore {}
