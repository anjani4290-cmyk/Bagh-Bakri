/**
 * tutorial.js
 * ----------------------------------------------------------------
 * The "How to Play" walkthrough. Every board in it is drawn by the same
 * BB.render.drawBoard() from the same BB.board data as the real game, and
 * every highlighted square is asked of the real rules engine
 * (BB.game.computeMoves on a scratch position). It has its own scratch
 * pieces and never reads or writes the live game state, so opening,
 * finishing or skipping it cannot disturb a game in progress.
 */
window.BB = window.BB || {};

(function (BB) {
  function empty() {
    const p = {};
    Object.keys(BB.board.nodePos).forEach((id) => (p[id] = null));
    return p;
  }
  function withPieces(map) {
    const p = empty();
    Object.keys(map).forEach((id) => (p[id] = map[id]));
    return p;
  }

  // `pieces()` builds a fresh scratch position; `select` is the piece whose
  // moves are shown; `show` is 'normal' | 'capture' | 'none'.
  const STEPS = [
    {
      title: 'Goal',
      text: 'Bagh Bakri is a game of capture. Two players face each other across the board. Jump over your opponent\u2019s pieces to remove them \u2014 capture all of them to win.',
      pieces: () => BB.game.makeInitialPieces(), show: 'none'
    },
    {
      title: 'The pieces',
      text: 'Each side starts with 16 pieces: Red fills the top (the triangle plus two rows), Green fills the bottom. The centre point starts empty. Whichever side starts is picked at random.',
      pieces: () => BB.game.makeInitialPieces(), show: 'none'
    },
    {
      title: 'Moving',
      text: 'On your turn, move one piece one step along a drawn line to an empty point. From a junction like this one you can go in any direction that has a line. Tap a glowing point to try it.',
      pieces: () => withPieces({ g2_2: 'G' }), select: 'g2_2', show: 'normal'
    },
    {
      title: 'Only along lines',
      text: 'Lines matter. This point has no diagonal, so this piece can only step up, down, left or right. Diagonal lines run only through the junction points, one per square \u2014 never crossing.',
      pieces: () => withPieces({ g2_1: 'G' }), select: 'g2_1', show: 'normal'
    },
    {
      title: 'Capturing',
      text: 'Jump over an opponent\u2019s piece in a straight line, landing on the empty point right behind it. Your piece \u2192 their piece \u2192 empty point. The jumped piece is removed. Tap the glowing point to capture.',
      pieces: () => withPieces({ g3_2: 'G', g2_2: 'R' }), select: 'g3_2', show: 'capture'
    },
    {
      title: 'Multiple captures',
      text: 'If the same piece can jump again after a capture, it must keep going in the same turn. Here Green captures twice in one move. You can\u2019t switch pieces in the middle of a chain.',
      pieces: () => withPieces({ g4_0: 'G', g3_0: 'R', g2_1: 'R' }), select: 'g4_0', show: 'capture'
    },
    {
      title: 'Winning',
      text: 'Capture every one of your opponent\u2019s pieces to win. If a player has no legal move at all, the game is a draw. Against the computer you can pick Easy, Moderate or Hard \u2014 and change the board look any time.',
      pieces: () => withPieces({ g1_1: 'R', g2_2: 'G', g4_4: 'G', g0_3: 'R' }), show: 'none'
    }
  ];

  let overlay, svgEl, titleEl, textEl, dotsEl, nextBtn, backBtn, skipBtn, hintEl;
  let idx = 0, scratch = null, hl = null, sel = null, chainAt = null, onCloseCb = null;

  function computeHighlights() {
    const step = STEPS[idx];
    hl = { normal: [], capture: [] };
    sel = null;
    const from = chainAt || step.select;
    if (!from || step.show === 'none' || !scratch[from]) return;
    sel = from;
    const mv = BB.game.computeMoves(from, scratch); // the REAL rules engine
    if (step.show === 'normal') hl.normal = mv.normal.slice();
    if (step.show === 'capture') hl.capture = mv.captures.map((c) => c.to);
    hl.moves = mv;
  }

  function draw() {
    BB.render.drawBoard(svgEl, {
      pieces: scratch,
      highlights: hl,
      selected: sel,
      onClick: onNodeTap
    });
  }

  function onNodeTap(id) {
    const step = STEPS[idx];
    if (!sel || !hl.moves) return;
    if (step.show === 'normal' && hl.normal.includes(id)) {
      scratch[id] = scratch[sel];
      scratch[sel] = null;
      chainAt = null;
      hintEl.textContent = 'Nice \u2014 that\u2019s a legal step. Tap Reset to try again.';
      step.select = id;
      computeHighlights();
      draw();
    } else if (step.show === 'capture') {
      const cap = hl.moves.captures.find((c) => c.to === id);
      if (!cap) return;
      scratch[id] = scratch[sel];
      scratch[sel] = null;
      scratch[cap.through] = null;
      const further = BB.game.computeMoves(id, scratch).captures;
      if (further.length) {
        chainAt = id;
        hintEl.textContent = 'Captured! Another jump is available \u2014 the same piece must keep going.';
      } else {
        chainAt = null;
        step.select = null;
        hintEl.textContent = 'Captured! Tap Reset to watch it again.';
      }
      computeHighlights();
      draw();
    }
  }

  function loadStep() {
    const step = STEPS[idx];
    // steps mutate step.select while playing; restore from the source of truth
    step.select = STEP_SELECT[idx];
    chainAt = null;
    scratch = step.pieces();
    titleEl.textContent = `${idx + 1}. ${step.title}`;
    textEl.textContent = step.text;
    hintEl.textContent = step.show === 'none' ? '' : 'Tap a glowing point to try it.';
    computeHighlights();
    draw();
    dotsEl.innerHTML = STEPS.map((_, i) => `<span class="tdot${i === idx ? ' on' : ''}"></span>`).join('');
    backBtn.disabled = idx === 0;
    nextBtn.textContent = idx === STEPS.length - 1 ? 'Done' : 'Next \u2192';
    document.getElementById('tutResetBtn').classList.toggle('hidden', step.show === 'none');
  }
  const STEP_SELECT = STEPS.map((s) => s.select);

  function open(closeCb) {
    onCloseCb = closeCb || null;
    idx = 0;
    overlay.classList.remove('hidden');
    loadStep();
  }
  function close() {
    overlay.classList.add('hidden');
    if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
  }

  function init() {
    overlay = document.getElementById('tutorialOverlay');
    svgEl = document.getElementById('tutorialBoard');
    titleEl = document.getElementById('tutTitle');
    textEl = document.getElementById('tutText');
    dotsEl = document.getElementById('tutDots');
    hintEl = document.getElementById('tutHint');
    nextBtn = document.getElementById('tutNextBtn');
    backBtn = document.getElementById('tutBackBtn');
    skipBtn = document.getElementById('tutSkipBtn');
    nextBtn.addEventListener('click', () => { if (idx === STEPS.length - 1) close(); else { idx++; loadStep(); } });
    backBtn.addEventListener('click', () => { if (idx > 0) { idx--; loadStep(); } });
    skipBtn.addEventListener('click', close);
    document.getElementById('tutResetBtn').addEventListener('click', loadStep);
    document.addEventListener('bb-theme', () => { if (!overlay.classList.contains('hidden')) draw(); });
  }

  BB.tutorial = { init, open, close, STEPS, _scratch: () => scratch };
})(window.BB);
