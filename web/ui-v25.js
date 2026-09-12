(() => {
  let participantId = null;
  let authenticatedInThisPage = false;
  let logoutReloadQueued = false;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  async function resolveParticipantId() {
    if (participantId) return participantId;
    try {
      const r = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return null;
      participantId = (await r.json())?.session?.participant_id || null;
      authenticatedInThisPage = !!participantId;
    } catch {}
    return participantId;
  }

  async function persistListened(songId) {
    const id = participantId || await resolveParticipantId();
    if (!id) return;
    const key = `hmpp:v2:${id}:listened`;
    try {
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      current[songId] = current[songId] || Date.now();
      localStorage.setItem(key, JSON.stringify(current));
    } catch {}
  }

  function syncMatchReady(match) {
    if (!match || match.classList.contains('submitted')) return;
    const songs = $$('.song[data-song-id]', match);
    if (songs.length !== 2) return;
    const bothListened = songs.every(song => !!$('.listened-pill', song));
    songs.forEach(song => {
      const button = $('.vote-btn', song);
      if (!button) return;
      button.disabled = !bothListened;
      button.setAttribute('aria-disabled', bothListened ? 'false' : 'true');
      button.classList.toggle('ready', bothListened);
    });
  }

  function markExternalListen(song) {
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

  function simplifyMatchForGuessing(match) {
    if (!match || !match.classList.contains('matchup-pending')) return;
    $$('.player-slot', match).forEach(slot => {
      slot.classList.remove('open');
      slot.replaceChildren();
    });
    $$('.listen-btn', match).forEach(button => {
      button.setAttribute('aria-expanded', 'false');
    });
    match.classList.add('guess-focus');
  }

  function queueCleanLogoutReload() {
    if (logoutReloadQueued || !authenticatedInThisPage) return;
    const account = $('#accountBtn');
    if (!account || account.textContent.trim() !== 'Log in') return;
    logoutReloadQueued = true;
    // Draft song choices and Daddy guesses are intentionally not persisted.
    // Reload after a successful logout so no pending DOM or in-memory vote choice can
    // leak into the next session on the same browser. Submitted state still restores
    // from the server, and listening progress remains in the participant's local cache.
    setTimeout(() => location.reload(), 0);
  }

  document.addEventListener('click', event => {
    const providerLink = event.target.closest('.provider-link');
    if (providerLink) {
      const song = providerLink.closest('.song[data-song-id]');
      // Opening either provider externally is sufficient proof of listening.
      // Spotify already does this in the base app; this extends the same behavior to YouTube.
      markExternalListen(song);
    }
  }, true);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const match = record.target.closest?.('.match') || (record.target.matches?.('.match') ? record.target : null);
      if (match?.classList.contains('matchup-pending')) simplifyMatchForGuessing(match);
    }
    queueCleanLogoutReload();
  });

  function init() {
    resolveParticipantId();
    $$('.match.matchup-pending').forEach(simplifyMatchForGuessing);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class']
    });
    setInterval(queueCleanLogoutReload, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
