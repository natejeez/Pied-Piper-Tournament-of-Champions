(() => {
  const PENDING_KEY = 'hmpp:v28:pending-listened';
  let participantId = null;
  let loggedInSeen = false;
  let logoutReloadQueued = false;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function userKey(id) { return `hmpp:v2:${id}:listened`; }
  function safeRead(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; }
    catch { return {}; }
  }
  function safeWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function queuePending(songId) {
    if (!songId) return;
    const pending = safeRead(PENDING_KEY);
    pending[songId] = pending[songId] || Date.now();
    safeWrite(PENDING_KEY, pending);
  }

  function persistForParticipant(songId) {
    if (!participantId || !songId) return false;
    const listened = safeRead(userKey(participantId));
    listened[songId] = listened[songId] || Date.now();
    safeWrite(userKey(participantId), listened);
    return true;
  }

  function flushPending() {
    if (!participantId) return;
    const pending = safeRead(PENDING_KEY);
    const ids = Object.keys(pending);
    if (!ids.length) return;
    const listened = safeRead(userKey(participantId));
    for (const id of ids) listened[id] = listened[id] || pending[id] || Date.now();
    safeWrite(userKey(participantId), listened);
    try { localStorage.removeItem(PENDING_KEY); } catch {}
  }

  async function resolveParticipantId() {
    try {
      const r = await fetch('/api/session', { credentials:'same-origin', cache:'no-store' });
      if (!r.ok) return null;
      const session = (await r.json())?.session || null;
      participantId = session?.participant_id || null;
      if (participantId) {
        loggedInSeen = true;
        flushPending();
      }
      return participantId;
    } catch { return null; }
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

  function syncAllMatchReady() { $$('.match').forEach(syncMatchReady); }

  function markSongListened(song) {
    if (!song) return;
    const songId = song.dataset.songId;
    if (!songId) return;
    if (!$('.listened-pill', song)) {
      const pill = document.createElement('div');
      pill.className = 'listened-pill';
      pill.textContent = '✓ Listening requirement met';
      song.appendChild(pill);
    }
    queuePending(songId);
    if (persistForParticipant(songId)) {
      const pending = safeRead(PENDING_KEY);
      delete pending[songId];
      if (Object.keys(pending).length) safeWrite(PENDING_KEY, pending);
      else { try { localStorage.removeItem(PENDING_KEY); } catch {} }
    } else {
      void resolveParticipantId().then(() => flushPending());
    }
    syncMatchReady(song.closest('.match'));
  }

  function externalProviderLink(event) {
    return event.target?.closest?.('a.provider-link[href], .provider-link[href]') || null;
  }

  function handleExternalIntent(event) {
    if ('button' in event && event.button !== 0 && event.button !== 1) return;
    const link = externalProviderLink(event);
    if (link) markSongListened(link.closest('.song[data-song-id]'));
  }

  document.addEventListener('pointerdown', handleExternalIntent, true);
  document.addEventListener('mousedown', handleExternalIntent, true);
  document.addEventListener('auxclick', event => {
    if (event.button === 1) handleExternalIntent(event);
  }, true);
  document.addEventListener('click', handleExternalIntent, true);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const link = externalProviderLink(event);
    if (link) markSongListened(link.closest('.song[data-song-id]'));
  }, true);

  function restoreParticipantListening() {
    if (!participantId) return;
    const listened = safeRead(userKey(participantId));
    for (const songId of Object.keys(listened)) {
      $$(`.song[data-song-id="${CSS.escape(songId)}"]`).forEach(song => {
        if (!$('.listened-pill', song)) {
          const pill = document.createElement('div');
          pill.className = 'listened-pill';
          pill.textContent = '✓ Listening requirement met';
          song.appendChild(pill);
        }
      });
    }
    syncAllMatchReady();
  }

  function maybeReloadAfterLogout() {
    if (!loggedInSeen || logoutReloadQueued) return;
    const account = $('#accountBtn');
    if (!account || account.textContent.trim() !== 'Log in') return;
    logoutReloadQueued = true;
    participantId = null;
    try { localStorage.removeItem(PENDING_KEY); } catch {}
    setTimeout(() => location.reload(), 0);
  }

  async function init() {
    await resolveParticipantId();
    flushPending();
    restoreParticipantListening();
    setInterval(maybeReloadAfterLogout, 650);
  }

  window.addEventListener('focus', () => {
    if (!participantId) void resolveParticipantId().then(() => { flushPending(); restoreParticipantListening(); });
    else { flushPending(); restoreParticipantListening(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      flushPending();
      restoreParticipantListening();
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else void init();
})();
