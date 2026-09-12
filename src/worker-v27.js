import workerV26, { ParticipantVoteStore as V26ParticipantVoteStore } from './worker-v26.js';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...headers }
  });
}

function store(env, id, action, payload = {}) {
  const stub = env.PARTICIPANT_VOTES.get(env.PARTICIPANT_VOTES.idFromName(id));
  return stub.fetch('https://vote-store.internal/' + action, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({ participant_id:id, ...payload })
  });
}

async function sessionFor(request, env, ctx) {
  const response = await workerV26.fetch(new Request(new URL('/api/session', request.url), {
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

async function tournamentState(request, env, ctx) {
  const response = await workerV26.fetch(new Request(new URL('/api/tournament-state', request.url), {
    method:'GET',
    headers:request.headers
  }), env, ctx);
  if (!response.ok) return null;
  try { return (await response.json()).state || null; } catch { return null; }
}

const OLD_COLLAPSE = `  function collapseMatch(match,voteSongId){
    clearPendingUI(match); match.classList.add('submitted');
    matchSongs(match).forEach(s=>{const picked=s.dataset.songId===voteSongId;s.classList.toggle('vote-winner',picked);s.classList.toggle('vote-loser',!picked);$('.winner-check',s)?.remove();const slot=$('.player-slot',s);if(slot){slot.classList.remove('open');slot.replaceChildren()}const l=$('.listen-btn',s);if(l)l.setAttribute('aria-expanded','false');if(picked){const c=document.createElement('span');c.className='winner-check';c.setAttribute('aria-label','Your selected song');c.title='Your selected song';c.textContent='✓';s.appendChild(c)}});
  }`;

const NEW_COLLAPSE = `  function collapseMatch(match,voteSongId){
    clearPendingUI(match); match.classList.add('submitted');
    matchSongs(match).forEach(s=>{
      const picked=s.dataset.songId===voteSongId;
      s.classList.toggle('vote-winner',picked);s.classList.toggle('vote-loser',!picked);
      $('.winner-check',s)?.remove();$$('.submitted-guess',s).forEach(x=>x.remove());
      const slot=$('.player-slot',s);if(slot){slot.classList.remove('open');slot.replaceChildren()}
      const l=$('.listen-btn',s);if(l)l.setAttribute('aria-expanded','false');
      if(picked){const c=document.createElement('span');c.className='winner-check';c.setAttribute('aria-label','Your selected song');c.title='Your selected song';c.textContent='✓';s.appendChild(c)}
      const guess=sessionState?.guesses?.[s.dataset.songId];
      if(guess){
        const detail=document.createElement('div');detail.className='submitted-guess';
        const label=document.createElement('div');label.className='submitted-guess-label';label.textContent='Which Harry Man Submitted...?';
        const value=document.createElement('div');value.className='submitted-guess-value';
        value.textContent=participants.find(p=>p.id===guess.guessed_participant_id)?.name||guess.guessed_participant_id;
        detail.append(label,value);$('.artist',s)?.insertAdjacentElement('afterend',detail);
      }
    });
  }`;

function patchGuessing(js) {
  const collapsePatched = js.includes(OLD_COLLAPSE);
  if (collapsePatched) js = js.replace(OLD_COLLAPSE, NEW_COLLAPSE);
  return { js, collapsePatched };
}

async function resetRoundData(request, env, ctx) {
  const { response, body:sessionPayload } = await sessionFor(request, env, ctx);
  if (!response.ok) return response;
  const session = sessionPayload?.session;
  if (!session?.is_test || session.participant_id !== 'test-voter') {
    return json({ error:'Test Voter administrator access required.' }, 403);
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const { round, scope } = body;
  if (!['play-in','round-of-64'].includes(round)) return json({ error:'Unsupported round.' }, 400);
  if (!['test-only','user','all-users'].includes(scope)) return json({ error:'Unsupported reset scope.' }, 400);

  const state = await tournamentState(request, env, ctx);
  if (state?.results_visible?.[round] === true) {
    return json({ error:'Results for this round are already published. Round data can no longer be reset.' }, 409);
  }

  const directory = await participantDirectory(env);
  const byId = new Map(directory.map(p => [p.id, p]));
  byId.set('test-voter', byId.get('test-voter') || { id:'test-voter', is_test:true });
  let targets = [];
  if (scope === 'test-only') targets = ['test-voter'];
  if (scope === 'user') {
    if (!body.participant_id || !byId.has(body.participant_id)) return json({ error:'Choose a valid participant to reset.' }, 400);
    targets = [body.participant_id];
  }
  if (scope === 'all-users') targets = [...byId.keys()];

  const resetResults = await Promise.all(targets.map(async id => {
    const isTest = id === 'test-voter' || byId.get(id)?.is_test === true;
    try {
      const r = await store(env, id, 'reset-round', { round, is_test:isTest });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Reset failed (${r.status})`);
      return { ok:true, participant_id:id, is_test:isTest, votes_removed:data.votes_removed||0, guesses_removed:data.guesses_removed||0 };
    } catch (error) {
      return { ok:false, participant_id:id, error:error.message };
    }
  }));

  const failures = resetResults.filter(x => !x.ok);
  if (failures.length) return json({ error:'One or more participant resets failed.', round, scope, failures }, 503);

  const changed = resetResults.filter(x => x.votes_removed > 0 || x.guesses_removed > 0);
  const flushFailures = [];
  for (const item of changed) {
    const flush = await store(env, item.participant_id, 'flush', { is_test:item.is_test });
    if (!flush.ok) flushFailures.push({ participant_id:item.participant_id, status:flush.status });
  }
  if (flushFailures.length) {
    return json({ error:'Round reset completed, but one or more Git mirrors failed.', round, scope, summaries:resetResults, flush_failures:flushFailures }, 503);
  }

  return json({
    ok:true,
    round,
    scope,
    participants_reset:resetResults.length,
    flushes_performed:changed.length,
    flushes_skipped:resetResults.length - changed.length,
    summaries:resetResults
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/admin/reset-round-data' && request.method === 'POST') {
      return resetRoundData(request, env, ctx);
    }

    if (url.pathname === '/dev-reset-v26.js') {
      return new Response('/* superseded by dev-reset-v27.js */', {
        headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}
      });
    }

    if (url.pathname === '/guessing.js') {
      const response = await workerV26.fetch(request, env, ctx);
      if (!response.ok) return response;
      const original = await response.text();
      const patched = patchGuessing(original);
      const headers = new Headers(response.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-store');
      headers.set('x-hmpp-v27-patch', `submitted-guesses=${patched.collapsePatched ? 1 : 0}`);
      return new Response(patched.js, { status:response.status, headers });
    }

    const response = await workerV26.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') &&
        (url.pathname === '/' || url.pathname === '/index.html') &&
        response.ok &&
        (response.headers.get('content-type') || '').includes('text/html')) {
      return new HTMLRewriter().on('head', {
        element(el) {
          el.append('<link rel="stylesheet" href="/ui-v27.css"><script src="/ui-v27.js" defer></script><script src="/dev-reset-v27.js" defer></script>', { html:true });
        }
      }).transform(response);
    }
    return response;
  }
};

export class ParticipantVoteStore extends V26ParticipantVoteStore {}
