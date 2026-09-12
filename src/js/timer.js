/**
 * timer.js
 * ----------------------------------------------------------------
 * A simple stopwatch: starts when a new game begins, stops the
 * moment the game ends, and formats the result as m:ss (e.g. "2:43")
 * for both the live display and the win screen.
 */
window.BB = window.BB || {};

(function (BB) {
  let startedAt = null;
  let intervalId = null;
  let displayEl = null;

  function format(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function getElapsedSeconds() {
    if (!startedAt) return 0;
    return Math.floor((Date.now() - startedAt) / 1000);
  }

  function start() {
    if (!displayEl) displayEl = document.getElementById('timerDisplay');
    startedAt = Date.now();
    clearInterval(intervalId);
    displayEl.textContent = '0:00';
    intervalId = setInterval(() => {
      displayEl.textContent = format(getElapsedSeconds());
    }, 1000);
  }

  function stop() {
    clearInterval(intervalId);
    if (displayEl) displayEl.textContent = format(getElapsedSeconds());
  }

  BB.timer = { start, stop, getElapsedSeconds, format };
})(window.BB);
