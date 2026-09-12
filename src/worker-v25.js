import workerV24, { ParticipantVoteStore as V24ParticipantVoteStore } from './worker-v24.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await workerV24.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') && (url.pathname === '/' || url.pathname === '/index.html') && response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      return new HTMLRewriter().on('head', {
        element(el) {
          el.append('<link rel="stylesheet" href="/ui-v25.css"><script src="/ui-v25.js" defer></script>', { html: true });
        }
      }).transform(response);
    }
    return response;
  }
};

export class ParticipantVoteStore extends V24ParticipantVoteStore {}
