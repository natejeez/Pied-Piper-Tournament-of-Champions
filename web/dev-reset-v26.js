(() => {
  const $ = (s, root = document) => root.querySelector(s);
  let session = null;
  let participants = [];
  let installed = false;

  function currentRound() { return $('.header-round.active')?.dataset.round || 'play-in'; }
  function roundLabel(round) { return round === 'round-of-64' ? 'Round of 64' : 'Play-In'; }

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts });
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

  function listeningKey(id = 'test-voter') { return `hmpp:v2:${id}:listened`; }
  function roundSection(round) { return document.querySelector(`.round-section[data-round="${round}"]`); }
  function clearLocalListening(round) {
    try {
      const raw = localStorage.getItem(listeningKey());
      if (!raw) return;
      const listened = JSON.parse(raw);
      const ids = [...(roundSection(round)?.querySelectorAll('.song[data-song-id]') || [])].map(x => x.dataset.songId);
      ids.forEach(id => delete listened[id]);
      localStorage.setItem(listeningKey(), JSON.stringify(listened));
    } catch { localStorage.removeItem(listeningKey()); }
  }

  function userOptions() {
    return participants.map(p => `<option value="${p.id}">${p.name}${p.is_test ? ' — TEST' : ''}</option>`).join('');
  }

  async function resultsPublished(round) {
    try {
      const d = await api('/api/tournament-state');
      return d.state?.results_visible?.[round] === true;
    } catch { return false; }
  }

  function toggleUserSelect() {
    const scope = $('#resetScope')?.value;
    const wrap = $('#resetUserWrap');
    if (wrap) wrap.hidden = scope !== 'user';
  }

  async function syncVisibility() {
    const bar = $('#devRoundResetBar');
    if (!bar) return;
    const published = await resultsPublished(currentRound());
    bar.hidden = published;
    const roundName = $('#resetRoundName');
    if (roundName) roundName.textContent = roundLabel(currentRound());
  }

  async function performReset() {
    const round = currentRound();
    const scope = $('#resetScope').value;
    const participantId = scope === 'user' ? $('#resetUser').value : null;
    const descriptions = {
      'test-only': 'Test Voter only',
      'user': participants.find(p => p.id === participantId)?.name || participantId,
      'all-users': 'ALL participants, including official production votes'
    };
    const warning = scope === 'all-users'
      ? `Reset ${roundLabel(round)} data for ALL USERS? This deletes official votes and guesses for this round and cannot be undone.`
      : `Reset ${roundLabel(round)} data for ${descriptions[scope]}? Submitted votes and guesses for this round will be deleted.`;
    if (!confirm(warning)) return;

    const button = $('#resetRoundDataButton');
    button.disabled = true;
    button.textContent = 'Resetting…';
    try {
      await api('/api/admin/reset-round-data', {
        method: 'POST',
        body: JSON.stringify({ round, scope, participant_id: participantId })
      });
      if (scope === 'test-only' || scope === 'all-users' || participantId === 'test-voter') clearLocalListening(round);
      location.reload();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = 'Reset Round Data';
    }
  }

  async function install() {
    if (installed) return;
    try {
      if (!(await loadContext())) return;
    } catch { return; }
    const anchor = $('#devModeBanner') || $('#testModeBanner');
    if (!anchor) return;

    const bar = document.createElement('div');
    bar.id = 'devRoundResetBar';
    bar.className = 'dev-round-reset-bar v26';
    bar.innerHTML = `
      <div class="reset-copy"><strong>RESET ROUND DATA</strong><span>Admin-only recovery controls for <b id="resetRoundName"></b>. Hidden once this round's results are published.</span></div>
      <div class="reset-controls">
        <select id="resetScope" aria-label="Reset scope">
          <option value="test-only">Reset Test Only</option>
          <option value="user">Reset for User</option>
          <option value="all-users">Reset All Users</option>
        </select>
        <label id="resetUserWrap" hidden><span>Participant</span><select id="resetUser">${userOptions()}</select></label>
        <button id="resetRoundDataButton" type="button">Reset Round Data</button>
      </div>`;
    anchor.insertAdjacentElement('afterend', bar);
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
