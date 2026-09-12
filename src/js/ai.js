/**
 * ai.js
 * ----------------------------------------------------------------
 * The computer opponent. It plays by the exact same rules as a human:
 * a capture is mandatory whenever one is available, and a capture
 * chain must be followed through with the same piece until no more
 * jumps are possible. This module just decides WHICH legal move to
 * make; game.js still enforces the rules.
 *
 * Strategy (simple, deliberately not a full minimax):
 *  1. If any capture is available, take the one whose forced chain
 *     nets the most total pieces (looked ahead recursively).
 *  2. Otherwise, make a normal move, preferring one that doesn't
 *     leave the piece somewhere the opponent can jump it back
 *     immediately. Falls back to a random legal move.
 */
window.BB = window.BB || {};

(function (BB) {
  function state() {
    return BB.game.state;
  }

  // How many pieces a chain starting with a jump from `atNode` could
  // net in total, if the computer always continues with its best
  // available follow-up jump. Operates on a scratch copy of the
  // board so the real game state is never touched.
  function maxChainCaptures(board, atNode) {
    const mv = BB.game.computeMoves(atNode, board);
    if (mv.captures.length === 0) return 0;
    let best = 0;
    mv.captures.forEach((c) => {
      const copy = Object.assign({}, board);
      copy[c.to] = copy[atNode];
      copy[atNode] = null;
      copy[c.through] = null;
      const rest = maxChainCaptures(copy, c.to);
      if (1 + rest > best) best = 1 + rest;
    });
    return best;
  }

  function chainScoreFor(from, through, to) {
    const copy = Object.assign({}, state().pieces);
    copy[to] = copy[from];
    copy[from] = null;
    copy[through] = null;
    return 1 + maxChainCaptures(copy, to);
  }

  // True if moving `from` to `to` would leave the piece somewhere the
  // opponent can immediately jump it on their next turn.
  function destinationIsUnsafe(from, to) {
    const pieces = state().pieces;
    const mover = pieces[from];
    const copy = Object.assign({}, pieces);
    copy[to] = mover;
    copy[from] = null;
    const oppColor = BB.game.opponent(mover);
    for (const id in copy) {
      if (copy[id] !== oppColor) continue;
      const mv = BB.game.computeMoves(id, copy);
      if (mv.captures.some((c) => c.through === to)) return true;
    }
    return false;
  }

  function pickBestCapture(captures, fromId) {
    let best = null, bestScore = -1;
    captures.forEach((c) => {
      const score = chainScoreFor(fromId, c.through, c.to);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    });
    return best;
  }

  function aiPlayIfNeeded() {
    const s = state();
    if (s.gameMode !== 'pvc' || s.gameOver) return;
    if (s.currentPlayer !== s.computerColor) return;
    if (!s.mustContinue) BB.render.flashMessage("Computer's move...");
    setTimeout(performAIMove, 600);
  }

  function performAIMove() {
    const s = state();
    if (s.gameOver || s.currentPlayer !== s.computerColor) return;

    // Mid-chain: the same piece must keep jumping if it still can.
    if (s.mustContinue) {
      const mv = BB.game.computeMoves(s.mustContinue);
      if (mv.captures.length === 0) {
        BB.game.clearSelectionState();
        BB.game.endTurnAndCheckStalemate();
        BB.render.render();
        aiPlayIfNeeded();
        return;
      }
      const best = pickBestCapture(mv.captures, s.mustContinue);
      BB.game.doCapture(s.mustContinue, best.through, best.to);
      return;
    }

    // Any piece with a capture available? Captures are mandatory.
    let allCaptures = [];
    Object.keys(s.pieces).forEach((id) => {
      if (s.pieces[id] !== s.currentPlayer) return;
      BB.game.computeMoves(id).captures.forEach((c) =>
        allCaptures.push({ from: id, through: c.through, to: c.to })
      );
    });
    if (allCaptures.length > 0) {
      let best = null, bestScore = -1;
      allCaptures.forEach((mv) => {
        const score = chainScoreFor(mv.from, mv.through, mv.to);
        if (score > bestScore) {
          bestScore = score;
          best = mv;
        }
      });
      BB.game.doCapture(best.from, best.through, best.to);
      return;
    }

    // No captures - make the safest available normal move.
    let candidates = [];
    Object.keys(s.pieces).forEach((id) => {
      if (s.pieces[id] !== s.currentPlayer) return;
      BB.game.computeMoves(id).normal.forEach((dest) => candidates.push({ from: id, to: dest }));
    });
    if (candidates.length === 0) return; // no legal move; stalemate already handled
    const safe = candidates.filter((mv) => !destinationIsUnsafe(mv.from, mv.to));
    const pool = safe.length ? safe : candidates;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    BB.game.doNormalMove(choice.from, choice.to);
  }

  BB.ai = { aiPlayIfNeeded, performAIMove };
})(window.BB);
