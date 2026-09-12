import v23Worker, { ParticipantVoteStore as V23ParticipantVoteStore } from './worker-v23.js';

const RESET_MARKER = 'test-voter-play-in-reset-v24';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

function store(env, id, action, payload = {}) {
  const stub = env.PARTICIPANT_VOTES.get(env.PARTICIPANT_VOTES.idFromName(id));
  return stub.fetch('https://vote-store.internal/' + action, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ participant_id: id, ...payload })
  });
}

async function sessionFor(request, env, ctx) {
  const url = new URL('/api/session', request.url);
  const response = await v23Worker.fetch(new Request(url, {
    method: 'GET',
    headers: request.headers
  }), env, ctx);
  let body = null;
  try { body = await response.clone().json(); } catch {}
  return { response, body };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/admin/reset-test-round' && request.method === 'POST') {
      const { response, body: sessionPayload } = await sessionFor(request, env, ctx);
      if (!response.ok) return response;
      const session = sessionPayload?.session;
      if (!session?.is_test || session.participant_id !== 'test-voter') {
        return json({ error: 'Test Voter access required.' }, 403);
      }

      let body = {};
      try { body = await request.json(); } catch {}
      const round = body.round;
      if (!['play-in', 'round-of-64'].includes(round)) {
        return json({ error: 'Only Play-In and Round of 64 can be reset in this test build.' }, 400);
      }

      const reset = await store(env, session.participant_id, 'reset-round', { round, is_test: true });
      const data = await reset.json();
      if (!reset.ok) return json(data, reset.status);

      // Reset is an explicit administrator action, so mirror it immediately instead of
      // waiting for the normal five-minute debounce.
      const flush = await store(env, session.participant_id, 'flush', { is_test: true });
      if (!flush.ok) return json({ error: 'Round reset succeeded, but Git sync failed. Please retry logout before continuing.' }, 503);

      return json({ ok: true, round, votes_removed: data.votes_removed, guesses_removed: data.guesses_removed });
    }

    if (!url.pathname.startsWith('/api/')) {
      const response = await v23Worker.fetch(request, env, ctx);
      if ((url.pathname === '/' || url.pathname === '/index.html') && response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
        return new HTMLRewriter().on('head', {
          element(el) {
            el.append('<link rel="stylesheet" href="/dev-reset-v24.css"><script src="/dev-reset-v24.js" defer></script>', { html: true });
          }
        }).transform(response);
      }
      return response;
    }

    return v23Worker.fetch(request, env, ctx);
  }
};

export class ParticipantVoteStore extends V23ParticipantVoteStore {
  async fetch(request) {
    const action = new URL(request.url).pathname.slice(1);
    const body = await request.clone().json().catch(() => ({}));

    if (body.participant_id) await this.state.storage.put('participant_id', body.participant_id);
    if (typeof body.is_test === 'boolean') await this.state.storage.put('is_test', body.is_test);

    // One-time staging cleanup so the next Test Voter login begins Play-In from zero.
    if (action === 'state' && body.participant_id === 'test-voter' && (await this.state.storage.get(RESET_MARKER)) !== true) {
      let votes = (await this.state.storage.get('votes')) || {};
      let guesses = (await this.state.storage.get('guesses')) || {};
      votes = Object.fromEntries(Object.entries(votes).filter(([, v]) => v.round !== 'play-in'));
      guesses = Object.fromEntries(Object.entries(guesses).filter(([, g]) => g.round !== 'play-in'));
      await this.state.storage.put('votes', votes);
      await this.state.storage.put('guesses', guesses);
      await this.state.storage.put(RESET_MARKER, true);
      return json({ votes, guesses, test_playin_reset_applied: true });
    }

    if (action === 'reset-round') {
      const round = body.round;
      if (!['play-in', 'round-of-64'].includes(round)) return json({ error: 'Unsupported reset round.' }, 400);
      const votes = (await this.state.storage.get('votes')) || {};
      const guesses = (await this.state.storage.get('guesses')) || {};
      const voteEntries = Object.entries(votes);
      const guessEntries = Object.entries(guesses);
      const nextVotes = Object.fromEntries(voteEntries.filter(([, v]) => v.round !== round));
      const nextGuesses = Object.fromEntries(guessEntries.filter(([, g]) => g.round !== round));
      await this.state.storage.put('votes', nextVotes);
      await this.state.storage.put('guesses', nextGuesses);
      return json({
        ok: true,
        round,
        votes_removed: voteEntries.length - Object.keys(nextVotes).length,
        guesses_removed: guessEntries.length - Object.keys(nextGuesses).length
      });
    }

    return super.fetch(request);
  }
}
