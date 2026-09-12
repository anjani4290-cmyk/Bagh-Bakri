/**
 * main.js
 * ----------------------------------------------------------------
 * Boots the app once the DOM is ready: initializes the renderer,
 * wires up the mode-select screen (Friend vs Computer), the
 * How-to-Play modal, and the New Game / Play Again buttons.
 * Load order matters: board.js, game.js, ai.js, render.js, then
 * this file.
 */
window.BB = window.BB || {};

document.addEventListener('DOMContentLoaded', () => {
  BB.render.init();

  const modeOverlay = document.getElementById('modeOverlay');
  const modeStep1 = document.getElementById('modeStep1');
  const modeStep2 = document.getElementById('modeStep2');
  const helpOverlay = document.getElementById('helpOverlay');

  function showModeSelect() {
    modeStep1.classList.remove('hidden');
    modeStep2.classList.add('hidden');
    modeOverlay.classList.remove('hidden');
  }

  function startGame(mode, computerColor) {
    modeOverlay.classList.add('hidden');
    BB.game.startGame(mode, computerColor);
  }

  document.getElementById('btnFriend').addEventListener('click', () => { BB.sound.unlock(); startGame('pvp', null); });
  document.getElementById('btnComputer').addEventListener('click', () => {
    BB.sound.unlock();
    modeStep1.classList.add('hidden');
    modeStep2.classList.remove('hidden');
  });
  document.getElementById('btnModeBack').addEventListener('click', () => {
    modeStep2.classList.add('hidden');
    modeStep1.classList.remove('hidden');
  });
  document.getElementById('btnPlayRed').addEventListener('click', () => startGame('pvc', 'G'));
  document.getElementById('btnPlayGreen').addEventListener('click', () => startGame('pvc', 'R'));

  document.getElementById('newGameBtn').addEventListener('click', showModeSelect);
  document.getElementById('playAgainBtn').addEventListener('click', showModeSelect);

  document.getElementById('howToPlayBtn').addEventListener('click', () => {
    helpOverlay.classList.remove('hidden');
  });
  document.getElementById('closeHelp').addEventListener('click', () => {
    helpOverlay.classList.add('hidden');
  });

  const soundBtn = document.getElementById('soundToggleBtn');
  soundBtn.addEventListener('click', () => {
    const nowEnabled = !BB.sound.isEnabled();
    BB.sound.setEnabled(nowEnabled);
    soundBtn.textContent = nowEnabled ? '🔊 Sound' : '🔇 Muted';
  });

  const statsOverlay = document.getElementById('statsOverlay');
  document.getElementById('statsBtn').addEventListener('click', () => {
    document.getElementById('statsBody').innerHTML = BB.stats.renderHTML();
    statsOverlay.classList.remove('hidden');
  });
  document.getElementById('closeStats').addEventListener('click', () => {
    statsOverlay.classList.add('hidden');
  });
  document.getElementById('resetStatsBtn').addEventListener('click', () => {
    if (confirm('Reset all saved stats and history? This cannot be undone.')) {
      BB.stats.reset();
      document.getElementById('statsBody').innerHTML = BB.stats.renderHTML();
    }
  });

  showModeSelect();
});
