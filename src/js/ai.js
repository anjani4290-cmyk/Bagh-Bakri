/**
 * ai.js
 * ----------------------------------------------------------------
 * The computer opponent, with three genuinely different strengths.
 * It plays by exactly the same rules as a human. It never keeps its own
 * copy of the board: on load it compiles BB.board (adjacency + jump
 * table) into integer arrays for speed, so it cannot disagree with the
 * rules engine about which lines exist.
 *
 *   EASY      No lookahead. 35% of the time it plays a random legal turn
 *             (it may even walk past a capture); otherwise it plays the
 *             turn that wins the most pieces right now and ignores
 *             whether it is then recaptured.
 *   MODERATE  Alpha-beta search 3 plies deep + capture quiescence,
 *             ~350 ms budget. Sees simple traps and recaptures.
 *   HARD      Iterative-deepening alpha-beta up to 8 plies + capture
 *             quiescence, ~1.1 s budget. Plays the best move it finds.
 *
 * A "turn" is either one step, or a whole forced capture chain (the same
 * piece keeps jumping while it can), which mirrors game.js exactly.
 * Searches are time-boxed so the UI never freezes.
 */
window.BB = window.BB || {};

(function (BB) {
  // ---------------- Difficulty settings ---------------------------------
  const LEVELS = {
    easy:     { label: 'Easy',     depth: 0, timeMs: 0,    randomRate: 0.35 },
    moderate: { label: 'Moderate', depth: 3, timeMs: 350,  randomRate: 0 },
    hard:     { label: 'Hard',     depth: 8, timeMs: 1100, randomRate: 0 }
  };

  // ---------------- Compile the board topology ---------------------------
  const ids = Object.keys(BB.board.nodePos);
  const N = ids.length;
  const idx = {};
  ids.forEach((id, i) => (idx[id] = i));
  const adjI = ids.map((id) => BB.board.adj[id].map((n) => idx[n]));
  const jumpI = ids.map((id) => {
    const out = [];
    const byOver = BB.board.jumps[id] || {};
    Object.keys(byOver).forEach((over) => byOver[over].forEach((land) => out.push([idx[over], idx[land]])));
    return out;
  });
  // Row (0 = top .. ) of each point, used for a tiny "advance" bonus.
  const ys = ids.map((id) => BB.board.nodePos[id].y);
  const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  const advNorm = ys.map((y) => (y - minY) / (maxY - minY)); // 0 top .. 1 bottom

  let rng = Math.random;
  function setRng(fn) { rng = fn || Math.random; }

  // ---------------- Board <-> array ------------------------------------
  // 0 empty, 1 = 'R', 2 = 'G'
  function toArray(pieces) {
    const bd = new Int8Array(N);
    for (let i = 0; i < N; i++) bd[i] = pieces[ids[i]] === 'R' ? 1 : pieces[ids[i]] === 'G' ? 2 : 0;
    return bd;
  }
  const sideNum = (c) => (c === 'R' ? 1 : 2);

  // ---------------- Turn generation -------------------------------------
  // A turn: { f, path: [dest...], caps: [captured...] } ; caps is empty for a step.
  function genChains(bd, start, pos, side, path, caps, out) {
    const opp = 3 - side;
    let any = false;
    const js = jumpI[pos];
    for (let k = 0; k < js.length; k++) {
      const over = js[k][0], land = js[k][1];
      if (bd[over] === opp && bd[land] === 0) {
        any = true;
        bd[pos] = 0; bd[over] = 0; bd[land] = side;
        path.push(land); caps.push(over);
        genChains(bd, start, land, side, path, caps, out);
        path.pop(); caps.pop();
        bd[land] = 0; bd[over] = opp; bd[pos] = side;
      }
    }
    if (!any && path.length) out.push({ f: start, path: path.slice(), caps: caps.slice() });
  }

  function genTurns(bd, side, capturesOnly) {
    const out = [];
    for (let i = 0; i < N; i++) {
      if (bd[i] !== side) continue;
      genChains(bd, i, i, side, [], [], out);
      if (!capturesOnly) {
        const a = adjI[i];
        for (let k = 0; k < a.length; k++) {
          if (bd[a[k]] === 0) out.push({ f: i, path: [a[k]], caps: [] });
        }
      }
    }
    return out;
  }

  const cnt = [0, 0, 0];
  function apply(bd, t, side) {
    bd[t.f] = 0;
    bd[t.path[t.path.length - 1]] = side;
    for (let i = 0; i < t.caps.length; i++) { bd[t.caps[i]] = 0; cnt[3 - side]--; }
  }
  function undo(bd, t, side) {
    bd[t.path[t.path.length - 1]] = 0;
    bd[t.f] = side;
    for (let i = 0; i < t.caps.length; i++) { bd[t.caps[i]] = 3 - side; cnt[3 - side]++; }
  }

  // ---------------- Evaluation & search ---------------------------------
  const WIN = 100000;
  const TIMEOUT = { timeout: true };
  let deadline = 0, nodes = 0;

  function checkTime() {
    if ((++nodes & 255) === 0 && deadline && performance_now() > deadline) throw TIMEOUT;
  }
  function performance_now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  // Score from `side`'s point of view.
  function evaluate(bd, side) {
    const opp = 3 - side;
    let score = (cnt[side] - cnt[opp]) * 100;
    // Small bonus for pieces further advanced toward the enemy side, so a
    // side that is ahead keeps making progress instead of shuffling.
    let adv = 0;
    for (let i = 0; i < N; i++) {
      if (bd[i] === 0) continue;
      const progress = bd[i] === 1 ? advNorm[i] : 1 - advNorm[i]; // R moves down, G moves up
      adv += bd[i] === side ? progress : -progress;
    }
    return score + adv * 0.6;
  }

  function orderTurns(turns) {
    // most captures first; tiny random jitter so equal turns vary
    for (let i = 0; i < turns.length; i++) turns[i].k = turns[i].caps.length * 10 + rng();
    turns.sort((a, b) => b.k - a.k);
    return turns;
  }

  // Captures-only extension so the search does not stop in the middle of a
  // trade ("horizon effect").
  function quiesce(bd, side, alpha, beta, qd) {
    checkTime();
    if (cnt[3 - side] === 0) return WIN;
    if (cnt[side] === 0) return -WIN;
    let best = evaluate(bd, side);
    if (qd <= 0) return best;
    if (best >= beta) return best;
    if (best > alpha) alpha = best;
    const turns = orderTurns(genTurns(bd, side, true));
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      apply(bd, t, side);
      const v = -quiesce(bd, 3 - side, -beta, -alpha, qd - 1);
      undo(bd, t, side);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function negamax(bd, side, depth, alpha, beta, ply) {
    checkTime();
    if (cnt[3 - side] === 0) return WIN - ply;   // opponent has nothing left
    if (cnt[side] === 0) return -WIN + ply;
    if (depth <= 0) return quiesce(bd, side, alpha, beta, 4);
    const turns = orderTurns(genTurns(bd, side, false));
    if (turns.length === 0) return 0;            // no legal turn = draw (game.js rule)
    let best = -Infinity;
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      apply(bd, t, side);
      const v = -negamax(bd, 3 - side, depth - 1, -beta, -alpha, ply + 1);
      undo(bd, t, side);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function searchRoot(bd, side, turns, depth) {
    let bestScore = -Infinity, bestTurn = null;
    let alpha = -Infinity;
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      apply(bd, t, side);
      const v = -negamax(bd, 3 - side, depth - 1, -Infinity, -alpha, 1);
      undo(bd, t, side);
      t.score = v;
      if (v > bestScore) { bestScore = v; bestTurn = t; }
      if (v > alpha) alpha = v;
    }
    return { turn: bestTurn, score: bestScore };
  }

  // ---------------- Public: choose a turn ---------------------------------
  // pieces: {nodeId: 'R'|'G'|null}; color: 'R'|'G'; level: easy|moderate|hard.
  // Returns { from, steps:[{from,through,to}], isCapture, depth } or null.
  function chooseTurn(pieces, color, level) {
    const cfg = LEVELS[level] || LEVELS.moderate;
    const side = sideNum(color);
    const bd = toArray(pieces);
    cnt[1] = cnt[2] = 0;
    for (let i = 0; i < N; i++) if (bd[i]) cnt[bd[i]]++;

    let turns = genTurns(bd, side, false);
    if (turns.length === 0) return null;

    let chosen = null, reached = 0;
    if (cfg.depth === 0) {
      // EASY: random slip, otherwise best immediate material only.
      if (rng() < cfg.randomRate) {
        chosen = turns[Math.floor(rng() * turns.length)];
      } else {
        let bestN = -1, pool = [];
        turns.forEach((t) => {
          if (t.caps.length > bestN) { bestN = t.caps.length; pool = [t]; }
          else if (t.caps.length === bestN) pool.push(t);
        });
        chosen = pool[Math.floor(rng() * pool.length)];
      }
    } else {
      turns = orderTurns(turns);
      chosen = turns[0];
      nodes = 0;
      deadline = performance_now() + cfg.timeMs;
      try {
        for (let d = 1; d <= cfg.depth; d++) {
          const r = searchRoot(bd, side, turns, d);
          if (r.turn) { chosen = r.turn; reached = d; }
          if (Math.abs(r.score) >= WIN - 100) break; // forced result found
          // best-first ordering for the next, deeper pass
          turns.sort((a, b) => (b.score === undefined ? -Infinity : b.score) - (a.score === undefined ? -Infinity : a.score));
        }
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        // out of time: keep the best turn from the last COMPLETED depth
        // (bd/cnt are unwound below by re-deriving them, since a throw skips undo)
      }
      deadline = 0;
    }

    // Convert to id-based steps
    const steps = [];
    let pos = chosen.f;
    chosen.path.forEach((land, i) => {
      steps.push({ from: ids[pos], through: chosen.caps[i] === undefined ? null : ids[chosen.caps[i]], to: ids[land] });
      pos = land;
    });
    return { from: ids[chosen.f], steps, isCapture: chosen.caps.length > 0, depth: reached, level };
  }

  // ---------------- Scheduling into the live game -------------------------
  let timerId = null;
  let plan = null; // remaining steps of a capture chain we already decided on

  function state() { return BB.game.state; }

  function cancel() {
    if (timerId !== null) { clearTimeout(timerId); timerId = null; }
    plan = null;
  }

  function aiPlayIfNeeded() {
    const s = state();
    if (s.gameMode !== 'pvc' || s.gameOver) return;
    if (s.currentPlayer !== s.computerColor) return;
    if (timerId !== null) clearTimeout(timerId); // never queue two moves
    if (!s.mustContinue) BB.render.flashMessage("Computer's move...");
    const gen = s.gen;
    timerId = setTimeout(() => {
      timerId = null;
      if (gen !== state().gen) return; // game restarted while we waited
      performAIMove();
    }, 600);
  }

  // Fallback used only if a planned chain no longer matches the board.
  function greedyContinue(from) {
    const caps = BB.game.computeMoves(from).captures;
    return caps.length ? { from, through: caps[0].through, to: caps[0].to } : null;
  }

  function performAIMove() {
    const s = state();
    if (s.gameOver || s.currentPlayer !== s.computerColor) return;

    // Mid-chain: the same piece must keep jumping.
    if (s.mustContinue) {
      let step = null;
      if (plan && plan.gen === s.gen && plan.steps.length && plan.steps[0].from === s.mustContinue) {
        step = plan.steps.shift();
      } else {
        step = greedyContinue(s.mustContinue);
      }
      if (!step) {
        BB.game.clearSelectionState();
        BB.game.endTurnAndCheckStalemate();
        BB.render.render();
        aiPlayIfNeeded();
        return;
      }
      BB.game.doCapture(step.from, step.through, step.to);
      return;
    }

    const turn = BB.ai.chooseTurn(s.pieces, s.currentPlayer, s.difficulty);
    if (!turn) return; // no legal move; stalemate already handled by game.js
    if (turn.isCapture) {
      plan = { gen: s.gen, steps: turn.steps.slice(1) };
      const first = turn.steps[0];
      BB.game.doCapture(first.from, first.through, first.to);
    } else {
      plan = null;
      BB.game.doNormalMove(turn.from, turn.steps[0].to);
    }
  }

  BB.ai = { LEVELS, chooseTurn, aiPlayIfNeeded, performAIMove, cancel, setRng };
})(window.BB);
