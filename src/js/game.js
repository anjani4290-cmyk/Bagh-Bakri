/**
 * game.js
 * ----------------------------------------------------------------
 * The rules engine. Owns the mutable game state (whose turn it is,
 * where every piece sits, what's currently selected) and every rule:
 * normal moves, captures, forced multi-jump chains, win/draw
 * detection. Depends only on board.js. Calls into render.js to
 * repaint after a change, and into ai.js to let the computer take
 * its turn when it's the computer's move.
 */
window.BB = window.BB || {};

(function (BB) {
  const { nodePos, adj } = BB.board;

  const state = {
    pieces: {},
    currentPlayer: 'R',
    selected: null,
    mustContinue: null,
    currentMoves: { normal: [], captures: [] },
    highlights: { normal: [], capture: [] },
    gameOver: false,
    gameMode: 'pvp',        // 'pvp' or 'pvc'
    computerColor: null,   // 'R' or 'G' when gameMode === 'pvc'
    animating: false       // true while a piece is sliding, to block input
  };

  function opponent(p) {
    return p === 'R' ? 'G' : 'R';
  }

  /**
   * Computes every legal normal move and capture for the piece at
   * `id`. Optionally pass a plain {nodeId: 'R'|'G'|null} snapshot as
   * `board` to evaluate a hypothetical position (used by the AI's
   * lookahead) without touching the real game state.
   */
  function computeMoves(id, board) {
    board = board || state.pieces;
    const owner = board[id];
    const normal = [];
    const captures = [];
    (adj[id] || []).forEach((n) => {
      if (!board[n]) {
        normal.push(n);
      } else if (board[n] === opponent(owner)) {
        (adj[n] || []).forEach((m) => {
          if (m === id || board[m]) return;
          const A = nodePos[id], B = nodePos[n], C = nodePos[m];
          const dx1 = B.x - A.x, dy1 = B.y - A.y;
          const dx2 = C.x - B.x, dy2 = C.y - B.y;
          if (dx1 === dx2 && dy1 === dy2) {
            captures.push({ through: n, to: m });
          }
        });
      }
    });
    return { normal, captures };
  }

  function anyLegalMove(player) {
    return Object.keys(state.pieces).some((id) => {
      if (state.pieces[id] !== player) return false;
      const mv = computeMoves(id);
      return mv.normal.length > 0 || mv.captures.length > 0;
    });
  }

  function initGame() {
    const pieces = {};
    Object.keys(nodePos).forEach((id) => (pieces[id] = null));

    // Red: rows 0,1 of the grid + the whole top triangle
    for (let c = 0; c < 5; c++) {
      pieces[`g0_${c}`] = 'R';
      pieces[`g1_${c}`] = 'R';
    }
    ['t1_0', 't1_1', 't1_2', 't2_0', 't2_1', 't2_2'].forEach((id) => (pieces[id] = 'R'));

    // Green: rows 3,4 of the grid + the whole bottom triangle
    for (let c = 0; c < 5; c++) {
      pieces[`g3_${c}`] = 'G';
      pieces[`g4_${c}`] = 'G';
    }
    ['b1_0', 'b1_1', 'b1_2', 'b2_0', 'b2_1', 'b2_2'].forEach((id) => (pieces[id] = 'G'));

    // Row 2, including the centre point g2_2, starts empty.

    state.pieces = pieces;
    state.currentPlayer = Math.random() < 0.5 ? 'R' : 'G';
    state.selected = null;
    state.mustContinue = null;
    state.currentMoves = { normal: [], captures: [] };
    state.highlights = { normal: [], capture: [] };
    state.gameOver = false;
    state.animating = false;

    BB.render.hideWinOverlay();
    BB.render.updateStatusBar();
    BB.timer.start();
    BB.render.render();
    BB.ai.aiPlayIfNeeded();
  }

  function startGame(mode, computerColor) {
    state.gameMode = mode;
    state.computerColor = computerColor;
    initGame();
  }

  function selectPiece(id) {
    state.selected = id;
    state.currentMoves = computeMoves(id);
    state.highlights.normal = state.mustContinue ? [] : state.currentMoves.normal.slice();
    state.highlights.capture = state.currentMoves.captures.map((c) => c.to);
    BB.render.render();
  }

  function clearSelectionState() {
    state.selected = null;
    state.mustContinue = null;
    state.currentMoves = { normal: [], captures: [] };
    state.highlights = { normal: [], capture: [] };
  }

  function checkWin() {
    const counts = BB.render.updateStatusBar();
    if (counts.G === 0 || counts.R === 0) {
      state.gameOver = true;
      BB.timer.stop();
      const winnerColor = counts.G === 0 ? 'R' : 'G';
      const winner = counts.G === 0 ? 'Red' : 'Green';
      const loser = counts.G === 0 ? 'Green' : 'Red';
      const elapsed = BB.timer.getElapsedSeconds();
      const isBest = BB.stats.record(winnerColor, elapsed, state.gameMode);
      BB.render.showWinOverlay(
        `🏆 ${winner} Wins!`,
        `All 16 ${loser} pieces have been captured — won in ${BB.timer.format(elapsed)}.` +
          (isBest ? ' 🏅 New Best Time!' : '')
      );
      BB.sound.playWin();
      BB.render.launchConfetti();
      BB.sound.playClap();
      return true;
    }
    return false;
  }

  function endTurnAndCheckStalemate() {
    state.currentPlayer = opponent(state.currentPlayer);
    BB.render.updateStatusBar();
    if (!anyLegalMove(state.currentPlayer)) {
      state.gameOver = true;
      BB.timer.stop();
      const elapsed = BB.timer.getElapsedSeconds();
      BB.stats.record('draw', elapsed, state.gameMode);
      BB.render.showWinOverlay(
        "It's a Draw",
        `${state.currentPlayer === 'R' ? 'Red' : 'Green'} has no legal move remaining — game lasted ${BB.timer.format(elapsed)}.`
      );
      BB.sound.playWin();
    }
  }

  function doNormalMove(from, to) {
    state.animating = true;
    BB.render.animateMove(from, to, {}, () => {
      state.pieces[to] = state.pieces[from];
      state.pieces[from] = null;
      clearSelectionState();
      BB.sound.playMove();
      state.animating = false;
      if (!checkWin()) endTurnAndCheckStalemate();
      BB.render.render();
      BB.ai.aiPlayIfNeeded();
    });
  }

  function doCapture(from, through, to) {
    state.animating = true;
    const capturedOwner = state.pieces[through];
    const mover = state.pieces[from];
    BB.render.animateMove(from, to, { through }, () => {
      state.pieces[to] = mover;
      state.pieces[from] = null;
      state.pieces[through] = null;
      BB.sound.playCapture();
      BB.render.flashMessage(
        `${mover === 'R' ? 'Red' : 'Green'} captured ${capturedOwner === 'R' ? 'Red' : 'Green'}!`
      );
      state.animating = false;

      if (checkWin()) {
        BB.render.render();
        return;
      }

      const further = computeMoves(to).captures;
      if (further.length > 0) {
        // Same piece must keep jumping - no switching mid-chain.
        state.mustContinue = to;
        state.selected = to;
        state.currentMoves = { normal: [], captures: further };
        state.highlights.normal = [];
        state.highlights.capture = further.map((c) => c.to);
      } else {
        clearSelectionState();
        endTurnAndCheckStalemate();
      }
      BB.render.render();
      BB.ai.aiPlayIfNeeded();
    });
  }

  function onNodeClick(id) {
    if (state.gameOver || state.animating) return;
    if (state.gameMode === 'pvc' && state.currentPlayer === state.computerColor) return;

    if (state.selected) {
      if (id === state.selected) {
        clearSelectionState();
        BB.render.render();
        return;
      }
      const capMatch = state.currentMoves.captures.find((c) => c.to === id);
      if (capMatch) {
        doCapture(state.selected, capMatch.through, id);
        return;
      }
      if (!state.mustContinue && state.currentMoves.normal.includes(id)) {
        doNormalMove(state.selected, id);
        return;
      }
      if (!state.mustContinue && state.pieces[id] === state.currentPlayer) {
        selectPiece(id);
        return;
      }
      BB.render.flashMessage('Invalid Move');
      return;
    }

    if (state.mustContinue) return; // must click one of the highlighted jump targets
    if (state.pieces[id] === state.currentPlayer) selectPiece(id);
  }

  BB.game = {
    state,
    opponent,
    computeMoves,
    anyLegalMove,
    initGame,
    startGame,
    selectPiece,
    clearSelectionState,
    checkWin,
    endTurnAndCheckStalemate,
    doNormalMove,
    doCapture,
    onNodeClick
  };
})(window.BB);
