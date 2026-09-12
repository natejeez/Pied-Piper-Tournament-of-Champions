import workerV27, { ParticipantVoteStore as V27ParticipantVoteStore } from './worker-v27.js';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...headers }
  });
}

async function sessionFor(request, env, ctx) {
  const response = await workerV27.fetch(new Request(new URL('/api/session', request.url), {
    method:'GET',
    headers:request.headers
  }), env, ctx);
  let body = null;
  try { body = await response.clone().json(); } catch {}
  return { response, body };
}

async function participantDirectory(env) {
  const r = await env.ASSETS.fetch(new Request('https://assets.local/data/2026/participants/public.json'));
  if (!r.ok) throw new Error('Participant directory unavailable.');
  return (await r.json()).participants || [];
}

function authMap(env) {
  if (!env.PARTICIPANT_AUTH_JSON) return {};
  try {
    const parsed = JSON.parse(env.PARTICIPANT_AUTH_JSON);
    return parsed.participants || parsed || {};
  } catch {
    return {};
  }
}

function authEntryConfigured(map, participantId) {
  const entry = map?.[participantId];
  if (typeof entry === 'string') return entry.length > 0;
  return !!entry?.email_sha256;
}

async function authReadiness(request, env, ctx) {
  const { response, body } = await sessionFor(request, env, ctx);
  if (!response.ok) return response;
  const session = body?.session;
  if (!session?.is_test || session.participant_id !== 'test-voter') {
    return json({ error:'Test Voter administrator access required.' }, 403);
  }
  const participants = await participantDirectory(env);
  const map = authMap(env);
  const status = participants.map(p => ({
    participant_id:p.id,
    name:p.name,
    is_test:p.is_test === true,
    configured:authEntryConfigured(map, p.id)
  }));
  const missing = status.filter(x => !x.configured);
  return json({
    configured:status.length - missing.length,
    total:status.length,
    ready:missing.length === 0,
    missing:missing.map(x => ({ participant_id:x.participant_id, name:x.name })),
    participants:status
  });
}

async function loginPreflight(request, env) {
  let body = {};
  try { body = await request.clone().json(); } catch {}
  if (!body?.participant_id) return null;
  const participants = await participantDirectory(env);
  const participant = participants.find(p => p.id === body.participant_id);
  if (!participant) return null;
  if (!authEntryConfigured(authMap(env), participant.id)) {
    return json({
      error:`Login is not activated for ${participant.name} on this Worker. The tournament administrator must update PARTICIPANT_AUTH_JSON.`
    }, 503);
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/admin/auth-readiness' && request.method === 'GET') {
      try { return await authReadiness(request, env, ctx); }
      catch (error) { console.error(error); return json({ error:'Unable to verify participant login configuration.' }, 500); }
    }

    if (url.pathname === '/api/login' && request.method === 'POST') {
      try {
        const preflight = await loginPreflight(request, env);
        if (preflight) return preflight;
      } catch (error) {
        console.error(error);
        return json({ error:'Unable to verify participant login configuration.' }, 500);
      }
      return workerV27.fetch(request, env, ctx);
    }

    if (url.pathname === '/ui-v27.js') {
      return new Response('/* superseded by ui-v28.js */', {
        headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}
      });
    }
    if (url.pathname === '/dev-reset-v27.js') {
      return new Response('/* superseded by dev-reset-v28.js */', {
        headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}
      });
    }

    const response = await workerV27.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') &&
        (url.pathname === '/' || url.pathname === '/index.html') &&
        response.ok &&
        (response.headers.get('content-type') || '').includes('text/html')) {
      const transformed = new HTMLRewriter().on('head', {
        element(el) {
          el.append('<link rel="stylesheet" href="/ui-v28.css"><script src="/ui-v28.js" defer></script><script src="/dev-reset-v28.js" defer></script>', { html:true });
        }
      }).transform(response);
      const headers = new Headers(transformed.headers);
      headers.set('x-hmpp-build', 'v2.8');
      return new Response(transformed.body, { status:transformed.status, headers });
    }
    return response;
  }
};

export class ParticipantVoteStore extends V27ParticipantVoteStore {}
