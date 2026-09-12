import workerV24, { ParticipantVoteStore as V24ParticipantVoteStore } from './worker-v24.js';

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
  const response = await workerV24.fetch(new Request(new URL('/api/session', request.url), {
    method: 'GET',
    headers: request.headers
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

async function publicTournamentState(request, env, ctx) {
  const response = await workerV24.fetch(new Request(new URL('/api/tournament-state', request.url), {
    method: 'GET',
    headers: request.headers
  }), env, ctx);
  if (!response.ok) return null;
  try { return (await response.json()).state || null; } catch { return null; }
}

const OLD_OBSERVER = `  function observeApp(){
    const observer=new MutationObserver(mutations=>{
      let submittedChanged=false,accountChanged=false,listeningChanged=false;
      for(const m of mutations){if(m.type==='attributes'&&m.target.classList?.contains('match'))submittedChanged=true;if(m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1&&(n.classList?.contains('listened-pill')||n.querySelector?.('.listened-pill'))))listeningChanged=true;if(m.target===document.body||m.target.closest?.('#accountBtn'))accountChanged=true;}
      if(listeningChanged){clearTimeout(refreshTimer);refreshTimer=setTimeout(mirrorListening,30)}
      if(submittedChanged&&sessionState)setTimeout(renderSessionState,30);
      if(accountChanged){const t=$('#accountBtn')?.textContent||'';if(t!==accountSnapshot){accountSnapshot=t;if(t.trim()==='Log in'){sessionState=null;pendingVotes.clear();$$('.dev-song-id,#devModeBanner,#devAdminPanel').forEach(x=>x.remove())}else setTimeout(refreshSession,50)}}
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }`;

const NEW_OBSERVER = `  function observeApp(){
    const observer=new MutationObserver(mutations=>{
      let accountChanged=false,listeningChanged=false;
      for(const m of mutations){
        if(m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1&&(n.classList?.contains('listened-pill')||n.querySelector?.('.listened-pill'))))listeningChanged=true;
        if(m.target===document.body||m.target.closest?.('#accountBtn'))accountChanged=true;
      }
      if(listeningChanged){clearTimeout(refreshTimer);refreshTimer=setTimeout(mirrorListening,30)}
      if(accountChanged){const t=$('#accountBtn')?.textContent||'';if(t!==accountSnapshot){accountSnapshot=t;if(t.trim()==='Log in'){sessionState=null;pendingVotes.clear();$$('.dev-song-id,#devModeBanner,#devAdminPanel').forEach(x=>x.remove())}else setTimeout(refreshSession,50)}}
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }`;

const OLD_SELECT = `  function selectVote(btn){
    const song=btn.closest('.song'),match=song?.closest('.match'); if(!song||!match||match.classList.contains('submitted'))return;
    pendingVotes.set(match.dataset.matchId,song.dataset.songId); renderGuessControls(match,song.dataset.songId); updateMatchSubmit(match);
  }`;

const NEW_SELECT = `  function selectVote(btn){
    const song=btn.closest('.song'),match=song?.closest('.match'); if(!song||!match||match.classList.contains('submitted'))return;
    match.querySelectorAll('.player-slot').forEach(slot=>{slot.classList.remove('open');slot.replaceChildren()});
    match.querySelectorAll('.listen-btn').forEach(b=>b.setAttribute('aria-expanded','false'));
    pendingVotes.set(match.dataset.matchId,song.dataset.songId); renderGuessControls(match,song.dataset.songId); updateMatchSubmit(match);
  }`;

function patchGuessing(js) {
  const observerPatched = js.includes(OLD_OBSERVER);
  const selectPatched = js.includes(OLD_SELECT);
  if (observerPatched) js = js.replace(OLD_OBSERVER, NEW_OBSERVER);
  if (selectPatched) js = js.replace(OLD_SELECT, NEW_SELECT);
  return { js, observerPatched, selectPatched };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/admin/reset-round-data' && request.method === 'POST') {
      const { response, body: sessionPayload } = await sessionFor(request, env, ctx);
      if (!response.ok) return response;
      const session = sessionPayload?.session;
      if (!session?.is_test || session.participant_id !== 'test-voter') {
        return json({ error: 'Test Voter administrator access required.' }, 403);
      }

      let body = {};
      try { body = await request.json(); } catch {}
      const round = body.round;
      const scope = body.scope;
      if (!['play-in', 'round-of-64'].includes(round)) return json({ error: 'Unsupported round.' }, 400);
      if (!['test-only', 'user', 'all-users'].includes(scope)) return json({ error: 'Unsupported reset scope.' }, 400);

      const tournament = await publicTournamentState(request, env, ctx);
      if (tournament?.results_visible?.[round] === true) {
        return json({ error: 'Results for this round are already published. Round data can no longer be reset.' }, 409);
      }

      const directory = await participantDirectory(env);
      const ids = new Set(directory.map(p => p.id).filter(Boolean));
      ids.add('test-voter');
      let targets = [];
      if (scope === 'test-only') targets = ['test-voter'];
      if (scope === 'user') {
        if (!body.participant_id || !ids.has(body.participant_id)) return json({ error: 'Choose a valid participant to reset.' }, 400);
        targets = [body.participant_id];
      }
      if (scope === 'all-users') targets = [...ids];

      const summaries = [];
      const failures = [];
      for (const id of targets) {
        const isTest = id === 'test-voter';
        try {
          const reset = await store(env, id, 'reset-round', { round, is_test: isTest });
          const data = await reset.json().catch(() => ({}));
          if (!reset.ok) throw new Error(data.error || `Reset failed (${reset.status})`);
          const flush = await store(env, id, 'flush', { is_test: isTest });
          if (!flush.ok) throw new Error(`Reset succeeded but Git sync failed (${flush.status})`);
          summaries.push({ participant_id: id, votes_removed: data.votes_removed || 0, guesses_removed: data.guesses_removed || 0 });
        } catch (error) {
          failures.push({ participant_id: id, error: error.message });
        }
      }

      if (failures.length) return json({ error: 'One or more participant resets failed.', round, scope, summaries, failures }, 503);
      return json({ ok: true, round, scope, participants_reset: summaries.length, summaries });
    }

    if (url.pathname === '/dev-reset-v24.js') {
      return new Response('/* superseded by dev-reset-v26.js */', { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (url.pathname === '/guessing.js') {
      const asset = await env.ASSETS.fetch(request);
      if (!asset.ok) return asset;
      const original = await asset.text();
      const patched = patchGuessing(original);
      const headers = new Headers(asset.headers);
      headers.set('content-type', 'application/javascript; charset=utf-8');
      headers.set('cache-control', 'no-store');
      headers.set('x-hmpp-v26-patch', `observer=${patched.observerPatched ? 1 : 0};select=${patched.selectPatched ? 1 : 0}`);
      return new Response(patched.js, { status: asset.status, headers });
    }

    const response = await workerV24.fetch(request, env, ctx);
    if (!url.pathname.startsWith('/api/') && (url.pathname === '/' || url.pathname === '/index.html') && response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      return new HTMLRewriter().on('head', {
        element(el) {
          el.append('<link rel="stylesheet" href="/ui-v26.css"><script src="/ui-v26.js" defer></script><script src="/dev-reset-v26.js" defer></script>', { html: true });
        }
      }).transform(response);
    }
    return response;
  }
};

export class ParticipantVoteStore extends V24ParticipantVoteStore {}
