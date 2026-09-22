import workerV213Prod, { ParticipantVoteStore as V213ParticipantVoteStore } from './worker-v213-prod.js';

const BUILD = 'v2.14-prod';

export default {
  async fetch(request, env, ctx) {
    const response = await workerV213Prod.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('x-hmpp-build', BUILD);
    if (new URL(request.url).pathname === '/api/logout' && request.method === 'POST') {
      headers.set('x-hmpp-logout-mode', 'durable-first-nonblocking-mirror');
    }
    return new Response(response.body, { status:response.status, headers });
  }
};

export class ParticipantVoteStore extends V213ParticipantVoteStore {}
