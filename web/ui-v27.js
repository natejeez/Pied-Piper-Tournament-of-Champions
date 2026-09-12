(() => {
  let participantId = null;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  async function resolveParticipantId() {
    if (participantId) return participantId;
    try {
      const r = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return null;
      participantId = (await r.json())?.session?.participant_id || null;
    } catch {}
    return participantId;
  }

  async function persistListened(songId) {
    const id = participantId || await resolveParticipantId();
    if (!id || !songId) return;
    try {
      const key = `hmpp:v2:${id}:listened`;
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

  function markExternalListening(link) {
    const song = link?.closest('.song[data-song-id]');
    if (!song) return;
    const songId = song.dataset.songId;
    if (!songId) return;
    if (!$('.listened-pill', song)) {
      const pill = document.createElement('div');
      pill.className = 'listened-pill';
      pill.textContent = '✓ Listening requirement met';
      song.appendChild(pill);
    }
    void persistListened(songId);
    syncMatchReady(song.closest('.match'));
  }

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.button !== 1) return;
    const link = event.target.closest('.provider-link');
    if (link) markExternalListening(link);
  }, true);

  document.addEventListener('auxclick', event => {
    if (event.button !== 1) return;
    const link = event.target.closest('.provider-link');
    if (link) markExternalListening(link);
  }, true);

  document.addEventListener('click', event => {
    const link = event.target.closest('.provider-link');
    if (link) markExternalListening(link);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const link = event.target.closest?.('.provider-link');
    if (link) markExternalListening(link);
  }, true);

  function init() { void resolveParticipantId(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
