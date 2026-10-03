/**
 * main.js
 * ----------------------------------------------------------------
 * Boots the app once the DOM is ready and wires every button:
 * setup (friend / computer -> side -> difficulty), theme picker,
 * tutorial, restart / play again, sound and stats.
 * Load order: board, theme, sound, timer, stats, game, ai, render,
 * tutorial, then this file.
 */
window.BB = window.BB || {};

document.addEventListener('DOMContentLoaded', () => {
  BB.render.init();
  BB.theme.init();
  BB.tutorial.init();

  const $ = (id) => document.getElementById(id);
  const modeOverlay = $('modeOverlay');
  const steps = [$('modeStep1'), $('modeStep2'), $('modeStep3')];
  const themeOverlay = $('themeOverlay');
  const winOverlay = $('winOverlay');
  let pendingColor = null; // computer's colour, held while the player picks a difficulty

  function showStep(n) {
    steps.forEach((el, i) => el.classList.toggle('hidden', i !== n));
  }

  // The setup screen always sits ABOVE the game-over screen (see CSS z-index);
  // we also close the game-over screen so nothing can be left underneath.
  function showModeSelect() {
    winOverlay.classList.add('hidden');
    showStep(0);
    const inProgress = BB.game.state.pieces && Object.values(BB.game.state.pieces).some(Boolean) && !BB.game.state.gameOver;
    $('btnSetupCancel').classList.toggle('hidden', !inProgress);
    $('setupThemeName').textContent = BB.theme.current().name;
    modeOverlay.classList.remove('hidden');
  }

  function startGame(mode, computerColor, difficulty) {
    modeOverlay.classList.add('hidden');
    BB.game.startGame(mode, computerColor, difficulty);
  }

  $('btnFriend').addEventListener('click', () => { BB.sound.unlock(); startGame('pvp', null); });
  $('btnComputer').addEventListener('click', () => { BB.sound.unlock(); showStep(1); });
  $('btnModeBack').addEventListener('click', () => showStep(0));
  $('btnPlayRed').addEventListener('click', () => { pendingColor = 'G'; showStep(2); });
  $('btnPlayGreen').addEventListener('click', () => { pendingColor = 'R'; showStep(2); });
  $('btnDiffBack').addEventListener('click', () => showStep(1));
  document.querySelectorAll('.diff-btn').forEach((b) => {
    b.addEventListener('click', () => startGame('pvc', pendingColor, b.dataset.level));
  });
  $('btnSetupCancel').addEventListener('click', () => modeOverlay.classList.add('hidden'));

  $('newGameBtn').addEventListener('click', showModeSelect);
  $('restartBtn').addEventListener('click', () => BB.game.restart());

  // Game over: Play Again restarts immediately with the same mode, side,
  // difficulty and theme. Change Settings goes back to the setup screen.
  $('playAgainBtn').addEventListener('click', () => BB.game.restart());
  $('changeSettingsBtn').addEventListener('click', showModeSelect);

  // ---- Theme picker ----------------------------------------------------
  function buildThemeGrid() {
    const grid = $('themeGrid');
    grid.innerHTML = '';
    BB.theme.ORDER.forEach((id) => {
      const t = BB.theme.THEMES[id];
      const b = document.createElement('button');
      b.className = 'theme-card' + (BB.theme.id() === id ? ' on' : '');
      b.dataset.theme = id;
      b.innerHTML =
        `<span class="swatch" style="background:${t.vars['--board-bg']}">` +
        `<i style="background:linear-gradient(135deg,${t.pieces.R[0]},${t.pieces.R[1]})"></i>` +
        `<i style="background:linear-gradient(135deg,${t.pieces.G[0]},${t.pieces.G[1]})"></i></span>` +
        `<strong>${t.name}</strong><small>${t.blurb}</small>`;
      b.addEventListener('click', () => {
        BB.theme.apply(id);
        grid.querySelectorAll('.theme-card').forEach((c) => c.classList.toggle('on', c === b));
        $('setupThemeName').textContent = t.name;
      });
      grid.appendChild(b);
    });
  }
  function openThemes() { buildThemeGrid(); themeOverlay.classList.remove('hidden'); }
  $('themeBtn').addEventListener('click', openThemes);
  $('btnSetupTheme').addEventListener('click', openThemes);
  $('closeTheme').addEventListener('click', () => themeOverlay.classList.add('hidden'));

  // ---- Tutorial --------------------------------------------------------
  $('howToPlayBtn').addEventListener('click', () => BB.tutorial.open());
  $('btnSetupTutorial').addEventListener('click', () => BB.tutorial.open());

  // ---- Sound / stats ---------------------------------------------------
  const soundBtn = $('soundToggleBtn');
  soundBtn.addEventListener('click', () => {
    const nowEnabled = !BB.sound.isEnabled();
    BB.sound.setEnabled(nowEnabled);
    soundBtn.textContent = nowEnabled ? '🔊 Sound' : '🔇 Muted';
  });

  const statsOverlay = $('statsOverlay');
  $('statsBtn').addEventListener('click', () => {
    $('statsBody').innerHTML = BB.stats.renderHTML();
    statsOverlay.classList.remove('hidden');
  });
  $('closeStats').addEventListener('click', () => statsOverlay.classList.add('hidden'));
  $('resetStatsBtn').addEventListener('click', () => {
    if (confirm('Reset all saved stats and history? This cannot be undone.')) {
      BB.stats.reset();
      $('statsBody').innerHTML = BB.stats.renderHTML();
    }
  });

  showModeSelect();
});
