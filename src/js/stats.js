/**
 * stats.js
 * ----------------------------------------------------------------
 * Tracks games played across sessions using localStorage: total
 * wins/draws per colour, the fastest win recorded for each colour,
 * and a short recent-games history. Nothing here is tied to a named
 * "player" account - it's per-browser, which is the right scope for
 * a game with no login.
 */
window.BB = window.BB || {};

(function (BB) {
  const STATS_KEY = 'baghBakriStats_v1';

  const LEVELS = ['easy', 'moderate', 'hard'];
  function emptyVsCpu() {
    const o = {};
    LEVELS.forEach((l) => (o[l] = { won: 0, drawn: 0, lost: 0 }));
    return o;
  }

  function load() {
    let s = null;
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) s = JSON.parse(raw);
    } catch (e) {}
    if (!s) s = { gamesPlayed: 0, redWins: 0, greenWins: 0, draws: 0, bestTimeRed: null, bestTimeGreen: null, history: [] };
    // Older saves have no per-difficulty table: add it without losing anything.
    if (!s.vsCpu) s.vsCpu = emptyVsCpu();
    LEVELS.forEach((l) => { if (!s.vsCpu[l]) s.vsCpu[l] = { won: 0, drawn: 0, lost: 0 }; });
    return s;
  }

  function save(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function reset() {
    try { localStorage.removeItem(STATS_KEY); } catch (e) {}
  }

  // result: 'R' | 'G' | 'draw'. ctx (optional, vs-computer only):
  // { difficulty, humanColor } so the result is filed under the right level
  // from the HUMAN's point of view. Returns true if this game set a new
  // fastest-win record for its colour.
  function record(result, seconds, mode, ctx) {
    ctx = ctx || {};
    const s = load();
    if (mode === 'pvc' && s.vsCpu[ctx.difficulty]) {
      const row = s.vsCpu[ctx.difficulty];
      if (result === 'draw') row.drawn++;
      else if (result === ctx.humanColor) row.won++;
      else row.lost++;
    }
    s.gamesPlayed++;
    let isBest = false;
    if (result === 'R') {
      s.redWins++;
      if (s.bestTimeRed === null || seconds < s.bestTimeRed) { s.bestTimeRed = seconds; isBest = true; }
    } else if (result === 'G') {
      s.greenWins++;
      if (s.bestTimeGreen === null || seconds < s.bestTimeGreen) { s.bestTimeGreen = seconds; isBest = true; }
    } else {
      s.draws++;
    }
    s.history.unshift({ result, seconds, mode, difficulty: ctx.difficulty || null, date: new Date().toISOString() });
    if (s.history.length > 20) s.history.length = 20;
    save(s);
    return isBest;
  }

  // Returns an HTML string ready to drop into the stats modal body.
  function renderHTML() {
    const s = load();
    const format = BB.timer.format;

    let bestOverall = 'No wins recorded yet.';
    if (s.bestTimeRed !== null || s.bestTimeGreen !== null) {
      if (s.bestTimeGreen === null || (s.bestTimeRed !== null && s.bestTimeRed <= s.bestTimeGreen)) {
        bestOverall = `🐯 Red — ${format(s.bestTimeRed)}`;
      } else {
        bestOverall = `🐐 Green — ${format(s.bestTimeGreen)}`;
      }
    }

    const historyHtml = s.history.slice(0, 8).map((h) => {
      const label = h.result === 'draw' ? 'Draw' : (h.result === 'R' ? '🐯 Red won' : '🐐 Green won');
      return `<div class="history-row"><span>${label}${h.mode === 'pvc' ? ' · vs CPU' + (h.difficulty ? ' (' + h.difficulty + ')' : '') : ''}</span><span>${format(h.seconds)}</span></div>`;
    }).join('') || '<p style="color:var(--line-dim);font-size:13px;">No games played yet.</p>';

    return `
      <div class="stat-row"><span>Games played</span><strong>${s.gamesPlayed}</strong></div>
      <div class="stat-row"><span>🐯 Red wins</span><strong>${s.redWins}</strong></div>
      <div class="stat-row"><span>🐐 Green wins</span><strong>${s.greenWins}</strong></div>
      <div class="stat-row"><span>Draws</span><strong>${s.draws}</strong></div>
      <div class="stat-row"><span>Best as Red</span><strong>${s.bestTimeRed !== null ? format(s.bestTimeRed) : '—'}</strong></div>
      <div class="stat-row"><span>Best as Green</span><strong>${s.bestTimeGreen !== null ? format(s.bestTimeGreen) : '—'}</strong></div>
      <h3>You vs Computer</h3>
      ${['easy', 'moderate', 'hard'].map((l) => {
        const r = s.vsCpu[l];
        return `<div class="stat-row"><span>${l.charAt(0).toUpperCase() + l.slice(1)}</span><strong>${r.won}W · ${r.drawn}D · ${r.lost}L</strong></div>`;
      }).join('')}
      <span class="best-badge">🏅 Fastest win overall: ${bestOverall}</span>
      <h3>Recent Games</h3>
      ${historyHtml}
    `;
  }

  BB.stats = { load, save, reset, record, renderHTML };
})(window.BB);
