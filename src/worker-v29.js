import workerV28, { ParticipantVoteStore as V28ParticipantVoteStore } from './worker-v28.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/ui-v28.js') {
      return new Response('/* superseded by ui-v29.js */', { headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'} });
    }
    if (url.pathname === '/dev-reset-v28.js') {
      return new Response('/* superseded by dev-reset-v29.js */', { headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'} });
    }
    const response = await workerV28.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') && (url.pathname === '/' || url.pathname === '/index.html') && response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const transformed = new HTMLRewriter().on('head', {
        element(el) {
          el.append('<style>html.hmpp-boot-pending body{visibility:hidden!important}</style><script>document.documentElement.classList.add("hmpp-boot-pending")</script><link rel="stylesheet" href="/ui-v29.css"><script src="/ui-v29.js" defer></script><script src="/dev-reset-v29.js" defer></script>', { html:true });
        }
      }).transform(response);
      const headers = new Headers(transformed.headers);
      headers.set('x-hmpp-build', 'v2.9');
      return new Response(transformed.body, { status:transformed.status, headers });
    }
    return response;
  }
};

export class ParticipantVoteStore extends V28ParticipantVoteStore {}
