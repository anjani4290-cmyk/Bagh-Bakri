/**
 * render.js
 * ----------------------------------------------------------------
 * Everything that touches the DOM for the board itself: drawing the
 * SVG graph and pieces, the counters/turn banner, the flash message,
 * and the win/draw overlay. Reads from game.js's state and board.js's
 * geometry; never mutates game state directly (click handling lives
 * in game.js, wired up here).
 */
window.BB = window.BB || {};

(function (BB) {
  const SVGNS = 'http://www.w3.org/2000/svg';
  let svg, messageEl, redCountEl, greenCountEl, turnEl, winOverlay, winText, winSub;

  function el(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function render(hideIds) {
    hideIds = hideIds || [];
    const { nodePos, edges } = BB.board;
    const s = BB.game.state;

    svg.innerHTML = '';
    edges.forEach(([a, b]) => {
      const pa = nodePos[a], pb = nodePos[b];
      svg.appendChild(el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, class: 'edge' }));
    });

    Object.keys(nodePos).forEach((id) => {
      const p = nodePos[id];

      if (s.highlights.capture.includes(id)) {
        svg.appendChild(el('circle', { cx: p.x, cy: p.y, r: 20, class: 'ring-capture' }));
      } else if (s.highlights.normal.includes(id)) {
        svg.appendChild(el('circle', { cx: p.x, cy: p.y, r: 17, class: 'ring-normal' }));
      }
      if (s.selected === id) {
        svg.appendChild(el('circle', { cx: p.x, cy: p.y, r: 22, class: 'ring-selected' }));
      }

      svg.appendChild(el('circle', { cx: p.x, cy: p.y, r: 4.5, class: 'node-dot' }));

      const owner = s.pieces[id];
      if (owner && !hideIds.includes(id)) {
        const piece = el('circle', { cx: p.x, cy: p.y, r: 14, class: `piece ${owner}` });
        piece.addEventListener('click', () => BB.game.onNodeClick(id));
        svg.appendChild(piece);
      }

      const hit = el('circle', { cx: p.x, cy: p.y, r: 19, fill: 'transparent', class: 'hit' });
      hit.addEventListener('click', () => BB.game.onNodeClick(id));
      svg.appendChild(hit);
    });
  }

  // ---------- Move animation (visible slide + colourful trail) ----------
  const ANIM_DURATION = 420; // ms

  // Animates the piece at fromId sliding to toId. Pass opts.through
  // for a capture (the jumped-over piece fades out during the slide).
  // Calls onDone() once the animation finishes, before any state
  // mutation - the caller is responsible for actually moving/removing
  // pieces in the real game state and re-rendering.
  function animateMove(fromId, toId, opts, onDone) {
    opts = opts || {};
    const { nodePos } = BB.board;
    const s = BB.game.state;
    const A = nodePos[fromId], B = nodePos[toId];
    const mover = s.pieces[fromId];
    const hideIds = [fromId];
    if (opts.through) hideIds.push(opts.through);

    render(hideIds);

    const movingPiece = el('circle', { cx: A.x, cy: A.y, r: 15, class: `piece ${mover} moving-piece` });
    svg.appendChild(movingPiece);

    let throughEl = null;
    if (opts.through) {
      const cp = nodePos[opts.through];
      throughEl = el('circle', { cx: cp.x, cy: cp.y, r: 14, class: `piece ${BB.game.opponent(mover)}` });
      throughEl.style.transition = `opacity ${ANIM_DURATION}ms ease`;
      svg.appendChild(throughEl);
      requestAnimationFrame(() => { throughEl.style.opacity = '0'; });
    }

    const startTime = performance.now();
    let lastTrailTime = 0;
    function step(now) {
      const t = Math.min(1, (now - startTime) / ANIM_DURATION);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
      const x = A.x + (B.x - A.x) * ease;
      const y = A.y + (B.y - A.y) * ease;
      movingPiece.setAttribute('cx', x);
      movingPiece.setAttribute('cy', y);

      if (now - lastTrailTime > 28) {
        lastTrailTime = now;
        const dot = el('circle', { cx: x, cy: y, r: 6, class: 'trail-dot' });
        dot.style.transition = 'opacity 380ms ease, r 380ms ease';
        svg.appendChild(dot);
        requestAnimationFrame(() => { dot.style.opacity = '0'; });
        setTimeout(() => dot.remove(), 400);
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        movingPiece.remove();
        if (throughEl) throughEl.remove();
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  // ---------- Win celebration ----------
  function launchConfetti() {
    const container = document.getElementById('confettiLayer');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#e53935', '#43a047', '#ffd166', '#f3ead4', '#c9a227'];
    for (let i = 0; i < 70; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      piece.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      piece.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
      container.appendChild(piece);
    }
    setTimeout(() => { container.innerHTML = ''; }, 4200);
  }

  function updateStatusBar() {
    const s = BB.game.state;
    const counts = { R: 0, G: 0 };
    Object.values(s.pieces).forEach((p) => {
      if (p) counts[p]++;
    });
    redCountEl.textContent = counts.R;
    greenCountEl.textContent = counts.G;

    let label = s.currentPlayer === 'R' ? "Red's Turn" : "Green's Turn";
    if (s.gameMode === 'pvc') {
      label += s.currentPlayer === s.computerColor ? ' (Computer)' : ' (You)';
    }
    turnEl.textContent = label;
    turnEl.classList.remove('R', 'G');
    turnEl.classList.add(s.currentPlayer);

    return counts;
  }

  function flashMessage(text) {
    messageEl.textContent = text;
    messageEl.classList.add('show');
    clearTimeout(flashMessage._t);
    flashMessage._t = setTimeout(() => messageEl.classList.remove('show'), 1600);
  }

  function showWinOverlay(title, sub) {
    winText.textContent = title;
    winSub.textContent = sub;
    winOverlay.classList.remove('hidden');
  }

  function hideWinOverlay() {
    winOverlay.classList.add('hidden');
  }

  function init() {
    svg = document.getElementById('board');
    messageEl = document.getElementById('message');
    redCountEl = document.getElementById('redCount');
    greenCountEl = document.getElementById('greenCount');
    turnEl = document.getElementById('turnIndicator');
    winOverlay = document.getElementById('winOverlay');
    winText = document.getElementById('winText');
    winSub = document.getElementById('winSub');
  }

  BB.render = { init, render, updateStatusBar, flashMessage, showWinOverlay, hideWinOverlay, animateMove, launchConfetti };
})(window.BB);
