import workerV29, { ParticipantVoteStore as V29ParticipantVoteStore } from './worker-v29.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/guessing.js') {
      const asset = await env.ASSETS.fetch(request);
      if (!asset.ok) return asset;
      const headers = new Headers(asset.headers);
      headers.set('content-type', 'application/javascript; charset=utf-8');
      headers.set('cache-control', 'no-store');
      headers.set('x-hmpp-build', 'v2.13-prod');
      headers.set('x-hmpp-voting-owner', 'modal-atomic-matchup');
      return new Response(asset.body, { status:asset.status, headers });
    }

    return workerV29.fetch(request, env, ctx);
  }
};

export class ParticipantVoteStore extends V29ParticipantVoteStore {}
