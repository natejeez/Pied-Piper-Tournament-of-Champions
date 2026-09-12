(() => {
  const $ = (s, root = document) => root.querySelector(s);
  let session = null;
  let participants = [];
  let installedFor = null;

  function currentRound() { return $('.header-round.active')?.dataset.round || 'play-in'; }
  function roundLabel(round) { return round === 'round-of-64' ? 'Round of 64' : 'Play-In'; }
  function roundSection(round) { return document.querySelector(`.round-section[data-round="${round}"]`); }
  function listeningKey(id) { return `hmpp:v2:${id}:listened`; }
  function draftKey(id) { return `hmpp:v29:${id}:drafts`; }

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials:'same-origin', cache:'no-store', headers:{'Content-Type':'application/json', ...(opts.headers || {})}, ...opts });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
    return body;
  }

  function clearLocalRound(round, participantId) {
    const ids = [...(roundSection(round)?.querySelectorAll('.song[data-song-id]') || [])].map(x => x.dataset.songId);
    try {
      const listened = JSON.parse(localStorage.getItem(listeningKey(participantId)) || '{}');
      ids.forEach(id => delete listened[id]);
      localStorage.setItem(listeningKey(participantId), JSON.stringify(listened));
    } catch { localStorage.removeItem(listeningKey(participantId)); }
    try {
      const drafts = JSON.parse(localStorage.getItem(draftKey(participantId)) || '{}');
      for (const match of [...(roundSection(round)?.querySelectorAll('.match[data-match-id]') || [])]) delete drafts[match.dataset.matchId];
      localStorage.setItem(draftKey(participantId), JSON.stringify(drafts));
    } catch { localStorage.removeItem(draftKey(participantId)); }
  }

  function removeControls() {
    $('#devRoundResetBar')?.remove();
    $('#devAuthReadiness')?.remove();
    installedFor = null;
  }

  function userOptions() {
    return participants.map(p => `<option value="${p.id}">${p.name}${p.is_test ? ' — TEST' : ''}</option>`).join('');
  }

  function setStatus(message, kind = '') {
    const el = $('#resetStatus'); if (!el) return;
    el.className = `reset-status ${kind}`.trim(); el.textContent = message || '';
  }

  function toggleUserSelect() {
    const wrap = $('#resetUserWrap');
    if (wrap) wrap.hidden = $('#resetScope')?.value !== 'user';
    setStatus('');
  }

  async function resultsPublished(round) {
    try { const d = await api('/api/tournament-state'); return d.state?.results_visible?.[round] === true; }
    catch { return false; }
  }

  async function syncVisibility() {
    const bar = $('#devRoundResetBar'); if (!bar) return;
    bar.hidden = await resultsPublished(currentRound());
    const label = $('#resetRoundName'); if (label) label.textContent = roundLabel(currentRound());
  }

  async function installAuthReadiness(anchor) {
    let bar = $('#devAuthReadiness');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'devAuthReadiness';
      bar.className = 'dev-auth-readiness';
      bar.innerHTML = '<strong>Participant Login Readiness</strong><span class="auth-state">Checking…</span>';
      anchor.insertAdjacentElement('afterend', bar);
    }
    try {
      const d = await api('/api/admin/auth-readiness');
      bar.classList.toggle('ready', d.ready === true);
      bar.classList.toggle('not-ready', d.ready !== true);
      const missing = (d.missing || []).map(x => x.name).join(', ');
      $('.auth-state', bar).textContent = d.ready ? `${d.configured}/${d.total} accounts configured ✓` : `${d.configured}/${d.total} configured · Missing: ${missing || 'unknown'}`;
    } catch (error) {
      bar.classList.add('not-ready'); $('.auth-state', bar).textContent = error.message;
    }
    return bar;
  }

  async function performReset() {
    const round = currentRound();
    const scope = $('#resetScope').value;
    const participantId = scope === 'user' ? $('#resetUser').value : null;
    const targetName = participants.find(p => p.id === participantId)?.name || participantId;
    const warning = scope === 'all-users'
      ? `Reset ${roundLabel(round)} data for ALL USERS? This deletes submitted votes and guesses for this round from live state. Git history remains the audit trail.`
      : `Reset ${roundLabel(round)} data for ${scope === 'user' ? targetName : 'Test Voter'}? Submitted votes and guesses for this round will be deleted from current state.`;
    if (!confirm(warning)) return;
    const button = $('#resetRoundDataButton');
    button.disabled = true; button.textContent = 'Resetting…';
    setStatus(scope === 'all-users' ? 'Checking participants and syncing only accounts whose data changed…' : 'Reset in progress…');
    const started = performance.now();
    try {
      const data = await api('/api/admin/reset-round-data', { method:'POST', body:JSON.stringify({ round, scope, participant_id:participantId }) });
      if (scope === 'test-only') clearLocalRound(round, 'test-voter');
      if (scope === 'user' && participantId) clearLocalRound(round, participantId);
      if (scope === 'all-users') participants.forEach(p => clearLocalRound(round, p.id));
      const changed = (data.summaries || []).filter(x => (x.votes_removed || 0) + (x.guesses_removed || 0) > 0).length;
      const ms = Math.round(performance.now() - started);
      setStatus(`Reset complete in ${ms} ms · ${data.participants_reset || 0} checked · ${changed} changed · ${data.flushes_performed || 0} Git sync(s).`, 'success');
      button.textContent = 'Reset Complete ✓';
      setTimeout(() => location.reload(), 900);
    } catch (error) {
      setStatus(error.message, 'error'); button.disabled = false; button.textContent = 'Reset Round Data';
    }
  }

  async function ensureInstalled() {
    let data;
    try { data = await api('/api/session'); }
    catch { removeControls(); return; }
    session = data.session || null;
    if (!session?.is_test || session.participant_id !== 'test-voter') { removeControls(); return; }
    if (!participants.length) {
      try { participants = (await api('/api/participants')).participants || []; } catch { participants = []; }
    }
    if (installedFor === 'test-voter' && $('#devRoundResetBar')) { await syncVisibility(); return; }
    removeControls();
    const anchor = $('#devModeBanner') || $('#testModeBanner'); if (!anchor) return;
    const auth = await installAuthReadiness(anchor);
    const bar = document.createElement('div');
    bar.id = 'devRoundResetBar'; bar.className = 'dev-round-reset-bar v29';
    bar.innerHTML = `<div class="reset-copy"><strong>RESET ROUND DATA</strong><span>Admin-only recovery controls for <b id="resetRoundName"></b>. Hidden after this round's results are published.</span><div id="resetStatus" class="reset-status"></div></div><div class="reset-controls"><select id="resetScope" aria-label="Reset scope"><option value="test-only">Reset Test Only</option><option value="user">Reset for User</option><option value="all-users">Reset All Users</option></select><label id="resetUserWrap" hidden><span>Participant</span><select id="resetUser">${userOptions()}</select></label><button id="resetRoundDataButton" type="button">Reset Round Data</button></div>`;
    auth.insertAdjacentElement('afterend', bar);
    $('#resetScope').addEventListener('change', toggleUserSelect);
    $('#resetRoundDataButton').addEventListener('click', performReset);
    toggleUserSelect(); installedFor = 'test-voter'; await syncVisibility();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.header-round')) setTimeout(syncVisibility, 0);
  });

  function boot() {
    void ensureInstalled();
    const account = $('#accountBtn');
    if (account) new MutationObserver(() => setTimeout(() => void ensureInstalled(), 50)).observe(account, { childList:true, subtree:true, characterData:true });
    setInterval(() => { if (!$('#devRoundResetBar') || installedFor !== 'test-voter') void ensureInstalled(); }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
