(() => {
  let participantId = null;
  let loggedInSeen = false;
  let logoutReloadQueued = false;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  async function resolveParticipantId() {
    try {
      const r = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return null;
      const session = (await r.json())?.session || null;
      participantId = session?.participant_id || null;
      if (participantId) loggedInSeen = true;
      return participantId;
    } catch { return null; }
  }

  function persistListened(songId) {
    if (!participantId || !songId) return;
    try {
      const key = `hmpp:v2:${participantId}:listened`;
      const listened = JSON.parse(localStorage.getItem(key) || '{}');
      listened[songId] = listened[songId] || Date.now();
      localStorage.setItem(key, JSON.stringify(listened));
    } catch {}
  }

  function syncMatchReady(match) {
    if (!match || match.classList.contains('submitted')) return;
    const songs = $$('.song[data-song-id]', match);
    if (songs.length !== 2) return;
    const ready = songs.every(song => !!$('.listened-pill', song));
    songs.forEach(song => {
      const button = $('.vote-btn', song);
      if (!button) return;
      button.disabled = !ready;
      button.setAttribute('aria-disabled', ready ? 'false' : 'true');
      button.classList.toggle('ready', ready);
    });
  }

  function markExternalListening(song) {
    if (!song) return;
    const songId = song.dataset.songId;
    if (!songId) return;
    if (!$('.listened-pill', song)) {
      const pill = document.createElement('div');
      pill.className = 'listened-pill';
      pill.textContent = '✓ Listening requirement met';
      song.appendChild(pill);
    }
    persistListened(songId);
    syncMatchReady(song.closest('.match'));
  }

  document.addEventListener('click', event => {
    const providerLink = event.target.closest('.provider-link');
    if (!providerLink) return;
    markExternalListening(providerLink.closest('.song[data-song-id]'));
  }, true);

  function maybeReloadAfterLogout() {
    if (!loggedInSeen || logoutReloadQueued) return;
    const account = $('#accountBtn');
    if (!account || account.textContent.trim() !== 'Log in') return;
    logoutReloadQueued = true;
    setTimeout(() => location.reload(), 0);
  }

  async function init() {
    await resolveParticipantId();
    setInterval(maybeReloadAfterLogout, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
