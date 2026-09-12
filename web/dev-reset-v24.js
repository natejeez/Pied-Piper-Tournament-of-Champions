(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const LISTEN_STORAGE_KEY = 'hmpp:v2:test-voter:listened';
  const LISTEN_RESET_MARKER = 'hmpp:v2:test-voter:listening-reset-v241';

  function currentRound() {
    return $('.header-round.active')?.dataset.round || 'play-in';
  }

  function roundLabel(round) {
    return round === 'round-of-64' ? 'Round of 64' : 'Play-In';
  }

  function roundSection(round) {
    return document.querySelector(`.round-section[data-round="${round}"]`);
  }

  function roundSongIds(round) {
    const section = roundSection(round);
    if (!section) return [];
    return [...section.querySelectorAll('.song[data-song-id]')].map(s => s.dataset.songId).filter(Boolean);
  }

  function clearListeningForRound(round) {
    try {
      const raw = localStorage.getItem(LISTEN_STORAGE_KEY);
      if (!raw) return 0;
      const listened = JSON.parse(raw || '{}');
      let removed = 0;
      for (const songId of roundSongIds(round)) {
        if (Object.prototype.hasOwnProperty.call(listened, songId)) {
          delete listened[songId];
          removed++;
        }
      }
      localStorage.setItem(LISTEN_STORAGE_KEY, JSON.stringify(listened));
      return removed;
    } catch {
      localStorage.removeItem(LISTEN_STORAGE_KEY);
      return 0;
    }
  }

  function clearAllTestListeningOnce() {
    try {
      if (localStorage.getItem(LISTEN_RESET_MARKER) === '1') return false;
      const hadListening = !!localStorage.getItem(LISTEN_STORAGE_KEY);
      localStorage.removeItem(LISTEN_STORAGE_KEY);
      localStorage.setItem(LISTEN_RESET_MARKER, '1');
      return hadListening;
    } catch {
      return false;
    }
  }

  async function getSession() {
    try {
      const r = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return null;
      return (await r.json())?.session || null;
    } catch { return null; }
  }

  function updateButtonLabel() {
    const b = $('#devRoundResetButton');
    if (b) b.textContent = `Reset ${roundLabel(currentRound())} Test Voting`;
  }

  async function install() {
    const session = await getSession();
    if (!session?.is_test || session.participant_id !== 'test-voter') return;

    if (clearAllTestListeningOnce()) {
      location.reload();
      return;
    }

    if ($('#devRoundResetBar')) { updateButtonLabel(); return; }

    const anchor = $('#devModeBanner') || $('#testModeBanner');
    if (!anchor) { setTimeout(install, 250); return; }

    const bar = document.createElement('div');
    bar.id = 'devRoundResetBar';
    bar.className = 'dev-round-reset-bar';
    bar.innerHTML = '<div><strong>TEST RESET</strong><span>Clears Test Voter votes, submitter guesses, and listening progress for the selected round.</span></div><button id="devRoundResetButton" type="button"></button>';
    anchor.insertAdjacentElement('afterend', bar);
    updateButtonLabel();

    $('#devRoundResetButton').addEventListener('click', async () => {
      const round = currentRound();
      if (!confirm(`Reset all Test Voter voting, submitter guesses, and listening progress for ${roundLabel(round)}? Official participant data will not be touched.`)) return;
      const b = $('#devRoundResetButton');
      b.disabled = true;
      b.textContent = 'Resetting…';
      try {
        const r = await fetch('/api/admin/reset-test-round', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Reset failed (${r.status})`);
        clearListeningForRound(round);
        location.reload();
      } catch (err) {
        alert(err.message);
        b.disabled = false;
        updateButtonLabel();
      }
    });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.header-round')) setTimeout(updateButtonLabel, 0);
  });

  // Legacy/submitted-matchup dropdown hardening. These should remain operable until
  // both guesses are actually persisted.
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.match.submitted.needs-guesses .guess-select:not(:disabled)').forEach(s => {
      s.style.pointerEvents = 'auto';
      s.style.position = 'relative';
      s.style.zIndex = '4';
    });
    if (!$('#devRoundResetBar')) install();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
