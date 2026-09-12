(() => {
  const $ = (s, root = document) => root.querySelector(s);
  let session = null;
  let participants = [];
  let installed = false;

  function currentRound() { return $('.header-round.active')?.dataset.round || 'play-in'; }
  function roundLabel(round) { return round === 'round-of-64' ? 'Round of 64' : 'Play-In'; }
  function listeningKey(id = 'test-voter') { return `hmpp:v2:${id}:listened`; }
  function roundSection(round) { return document.querySelector(`.round-section[data-round="${round}"]`); }

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials:'same-origin', headers:{'Content-Type':'application/json', ...(opts.headers || {})}, ...opts });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
    return body;
  }

  async function loadContext() {
    const s = await api('/api/session');
    session = s.session;
    if (!session?.is_test || session.participant_id !== 'test-voter') return false;
    const p = await api('/api/participants');
    participants = p.participants || [];
    return true;
  }

  function clearLocalListening(round, participantId = 'test-voter') {
    try {
      const raw = localStorage.getItem(listeningKey(participantId));
      if (!raw) return 0;
      const listened = JSON.parse(raw);
      const ids = [...(roundSection(round)?.querySelectorAll('.song[data-song-id]') || [])].map(x => x.dataset.songId);
      let removed = 0;
      ids.forEach(id => { if (Object.prototype.hasOwnProperty.call(listened,id)) { delete listened[id]; removed++; } });
      localStorage.setItem(listeningKey(participantId), JSON.stringify(listened));
      return removed;
    } catch { localStorage.removeItem(listeningKey(participantId)); return 0; }
  }

  function userOptions() {
    return participants.map(p => `<option value="${p.id}">${p.name}${p.is_test ? ' — TEST' : ''}</option>`).join('');
  }

  async function resultsPublished(round) {
    try { const d = await api('/api/tournament-state'); return d.state?.results_visible?.[round] === true; }
    catch { return false; }
  }

  function setStatus(message, kind = '') {
    const el = $('#resetStatus');
    if (!el) return;
    el.className = `reset-status ${kind}`.trim();
    el.textContent = message || '';
  }

  function toggleUserSelect() {
    const scope = $('#resetScope')?.value;
    const wrap = $('#resetUserWrap');
    if (wrap) wrap.hidden = scope !== 'user';
    setStatus('');
  }

  async function syncVisibility() {
    const bar = $('#devRoundResetBar');
    if (!bar) return;
    const published = await resultsPublished(currentRound());
    bar.hidden = published;
    const roundName = $('#resetRoundName');
    if (roundName) roundName.textContent = roundLabel(currentRound());
  }

  async function installAuthReadiness(anchor) {
    if ($('#devAuthReadiness')) return;
    const bar = document.createElement('div');
    bar.id = 'devAuthReadiness';
    bar.className = 'dev-auth-readiness';
    bar.innerHTML = '<strong>Participant Login Readiness</strong><span class="auth-state">Checking…</span>';
    anchor.insertAdjacentElement('afterend', bar);
    try {
      const d = await api('/api/admin/auth-readiness');
      bar.classList.toggle('ready', d.ready === true);
      bar.classList.toggle('not-ready', d.ready !== true);
      const missing = (d.missing || []).map(x => x.name).join(', ');
      $('.auth-state', bar).textContent = d.ready
        ? `${d.configured}/${d.total} accounts configured ✓`
        : `${d.configured}/${d.total} configured · Missing: ${missing || 'unknown'}`;
    } catch (error) {
      bar.classList.add('not-ready');
      $('.auth-state', bar).textContent = error.message;
    }
  }

  async function performReset() {
    const round = currentRound();
    const scope = $('#resetScope').value;
    const participantId = scope === 'user' ? $('#resetUser').value : null;
    const targetName = participants.find(p => p.id === participantId)?.name || participantId;
    const warning = scope === 'all-users'
      ? `Reset ${roundLabel(round)} data for ALL USERS? This deletes submitted votes and guesses for this round from the live stores and rewrites affected Git snapshots. Git history remains the audit trail.`
      : `Reset ${roundLabel(round)} data for ${scope === 'user' ? targetName : 'Test Voter'}? Submitted votes and guesses for this round will be deleted from current state.`;
    if (!confirm(warning)) return;

    const button = $('#resetRoundDataButton');
    button.disabled = true;
    button.textContent = 'Resetting…';
    setStatus(scope === 'all-users' ? 'Checking every participant. Only changed accounts will be synced to Git…' : 'Reset in progress…');
    const started = performance.now();
    try {
      const data = await api('/api/admin/reset-round-data', {
        method:'POST',
        body:JSON.stringify({ round, scope, participant_id:participantId })
      });
      if (scope === 'test-only' || scope === 'all-users' || participantId === 'test-voter') clearLocalListening(round, 'test-voter');
      const changed = (data.summaries || []).filter(x => (x.votes_removed || 0) + (x.guesses_removed || 0) > 0).length;
      const ms = Math.round(performance.now() - started);
      setStatus(`Reset complete in ${ms} ms · ${data.participants_reset || 0} account(s) checked · ${changed} changed · ${data.flushes_performed || 0} Git sync(s).`, 'success');
      button.textContent = 'Reset Complete ✓';
      setTimeout(() => location.reload(), 1400);
    } catch (error) {
      setStatus(error.message, 'error');
      button.disabled = false;
      button.textContent = 'Reset Round Data';
    }
  }

  async function install() {
    if (installed) return;
    try { if (!(await loadContext())) return; } catch { return; }
    const anchor = $('#devModeBanner') || $('#testModeBanner');
    if (!anchor) return;
    await installAuthReadiness(anchor);

    const authBar = $('#devAuthReadiness') || anchor;
    const bar = document.createElement('div');
    bar.id = 'devRoundResetBar';
    bar.className = 'dev-round-reset-bar v28';
    bar.innerHTML = `
      <div class="reset-copy"><strong>RESET ROUND DATA</strong><span>Admin-only recovery controls for <b id="resetRoundName"></b>. Hidden after this round's results are published.</span><div id="resetStatus" class="reset-status"></div></div>
      <div class="reset-controls">
        <select id="resetScope" aria-label="Reset scope">
          <option value="test-only">Reset Test Only</option>
          <option value="user">Reset for User</option>
          <option value="all-users">Reset All Users</option>
        </select>
        <label id="resetUserWrap" hidden><span>Participant</span><select id="resetUser">${userOptions()}</select></label>
        <button id="resetRoundDataButton" type="button">Reset Round Data</button>
      </div>`;
    authBar.insertAdjacentElement('afterend', bar);
    $('#resetScope').addEventListener('change', toggleUserSelect);
    $('#resetRoundDataButton').addEventListener('click', performReset);
    installed = true;
    toggleUserSelect();
    await syncVisibility();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.header-round')) setTimeout(syncVisibility, 0);
  });

  async function boot() {
    for (let i = 0; i < 20 && !installed; i++) {
      await install();
      if (!installed) await new Promise(r => setTimeout(r, 500));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else void boot();
})();
