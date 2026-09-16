import workerV213, { ParticipantVoteStore as V213ParticipantVoteStore } from './worker-v213.js';

const STAGING_HOST = 'pied-piper-tournament-of-champions-v2-test';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await workerV213.fetch(request, env, ctx);
    if (!url.hostname.includes(STAGING_HOST)) return response;

    if (!url.pathname.startsWith('/api/') &&
        (url.pathname === '/' || url.pathname === '/index.html') &&
        response.ok &&
        (response.headers.get('content-type') || '').includes('text/html')) {
      const transformed = new HTMLRewriter().on('head', {
        element(el) {
          el.append('<link rel="stylesheet" href="/stats-v3.css?v=3.0.0"><script type="module" src="/stats-v3.js?v=3.0.0"></script>', { html:true });
        }
      }).transform(response);
      const headers = new Headers(transformed.headers);
      headers.set('cache-control', 'no-store');
      headers.set('x-hmpp-build', 'v3-stats-preview');
      return new Response(transformed.body, { status:transformed.status, headers });
    }
    return response;
  }
};

export class ParticipantVoteStore extends V213ParticipantVoteStore {}
