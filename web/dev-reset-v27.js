(() => {
  const $ = (s, root = document) => root.querySelector(s);
  let participants = [];
  let installed = false;

  function currentRound() { return $('.header-round.active')?.dataset.round || 'play-in'; }
  function roundLabel(round) { return round === 'round-of-64' ? 'Round of 64' : 'Play-In'; }
  function roundSection(round) { return document.querySelector(`.round-section[data-round="${round}"]`); }

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials:'same-origin', headers:{'Content-Type':'application/json', ...(opts.headers||{})}, ...opts });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
    return body;
  }

  async function loadContext() {
    const session = (await api('/api/session')).session;
    if (!session?.is_test || session.participant_id !== 'test-voter') return false;
    participants = (await api('/api/participants')).participants || [];
    return true;
  }

  function userOptions() {
    return participants.map(p => `<option value="${p.id}">${p.name}${p.is_test ? ' — TEST' : ''}</option>`).join('');
  }

  function clearLocalListening(round) {
    try {
      const key = 'hmpp:v2:test-voter:listened';
      const listened = JSON.parse(localStorage.getItem(key) || '{}');
      const ids = [...(roundSection(round)?.querySelectorAll('.song[data-song-id]') || [])].map(x => x.dataset.songId);
      ids.forEach(id => delete listened[id]);
      localStorage.setItem(key, JSON.stringify(listened));
    } catch {}
  }

  function syncUserVisibility() {
    const wrap = $('#resetV27UserWrap');
    if (wrap) wrap.hidden = $('#resetV27Scope')?.value !== 'user';
  }

  async function syncRoundState() {
    const bar = $('#devRoundResetBarV27');
    if (!bar) return;
    try {
      const state = (await api('/api/tournament-state')).state || {};
      bar.hidden = state.results_visible?.[currentRound()] === true;
    } catch {}
    const name = $('#resetV27RoundName');
    if (name) name.textContent = roundLabel(currentRound());
  }

  async function performReset() {
    const round = currentRound();
    const scope = $('#resetV27Scope').value;
    const participantId = scope === 'user' ? $('#resetV27User').value : null;
    const display = participants.find(p => p.id === participantId)?.name || participantId;
    const warning = scope === 'all-users'
      ? `Reset ${roundLabel(round)} data for ALL USERS? This removes official votes and guesses for this round and cannot be undone.`
      : `Reset ${roundLabel(round)} data for ${scope === 'test-only' ? 'Test Voter' : display}?`;
    if (!confirm(warning)) return;

    const button = $('#resetV27Button');
    button.disabled = true;
    button.textContent = 'Resetting…';
    try {
      const result = await api('/api/admin/reset-round-data', {
        method:'POST',
        body:JSON.stringify({ round, scope, participant_id:participantId })
      });
      if (scope === 'test-only' || scope === 'all-users' || participantId === 'test-voter') clearLocalListening(round);
      const skipped = result.flushes_skipped || 0;
      if (skipped) console.info(`HMPP reset skipped ${skipped} empty Git mirror flush(es).`);
      location.reload();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = 'Reset Round Data';
    }
  }

  async function install() {
    if (installed) return;
    try { if (!(await loadContext())) return; } catch { return; }
    const anchor = $('#devModeBanner') || $('#testModeBanner');
    if (!anchor) return;

    const bar = document.createElement('div');
    bar.id = 'devRoundResetBarV27';
    bar.className = 'dev-round-reset-bar v27';
    bar.innerHTML = `
      <div class="reset-copy"><strong>RESET ROUND DATA</strong><span>Admin-only recovery controls for <b id="resetV27RoundName"></b>. Removed after this round's results publish.</span></div>
      <div class="reset-controls">
        <select id="resetV27Scope" aria-label="Reset scope">
          <option value="test-only">Reset Test Only</option>
          <option value="user">Reset for User</option>
          <option value="all-users">Reset All Users</option>
        </select>
        <label id="resetV27UserWrap" hidden><span>Participant</span><select id="resetV27User">${userOptions()}</select></label>
        <button id="resetV27Button" type="button">Reset Round Data</button>
      </div>`;
    anchor.insertAdjacentElement('afterend', bar);
    $('#resetV27Scope').addEventListener('change', syncUserVisibility);
    $('#resetV27Button').addEventListener('click', performReset);
    installed = true;
    syncUserVisibility();
    await syncRoundState();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.header-round')) setTimeout(syncRoundState, 0);
  });

  async function boot() {
    for (let i=0; i<20 && !installed; i++) {
      await install();
      if (!installed) await new Promise(r => setTimeout(r, 300));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
