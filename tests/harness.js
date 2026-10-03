// Loads the real game + AI modules in a vm with inert stand-ins for the DOM layers.
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadEngine() {
  const ctx = { window: {}, console, setTimeout, clearTimeout, performance };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', f), 'utf8'), ctx, { filename: f });
  run('board.js');
  const BB = ctx.window.BB;
  const rec = [];
  BB.render = {
    hideWinOverlay() {}, clearTransient() {}, render() {}, flashMessage() {}, launchConfetti() {},
    updateStatusBar() { const c = { R: 0, G: 0 }; Object.values(BB.game.state.pieces).forEach((p) => p && c[p]++); return c; },
    showWinOverlay(t) { rec.push(t); }, animateMove(a, b, o, cb) { cb(); }
  };
  BB.timer = { start() {}, stop() {}, getElapsedSeconds: () => 0, format: () => '0:00' };
  BB.sound = { playMove() {}, playCapture() {}, playWin() {}, playClap() {}, unlock() {} };
  BB.stats = { calls: [], record(...a) { this.calls.push(a); return false; } };
  run('game.js'); run('ai.js');
  return { BB, rec };
}
// Play a complete game using ai.chooseTurn for both sides, validating EVERY step
// against the rules engine. Returns 'R' | 'G' | 'draw' | 'cap'.
function selfPlay(BB, levelR, levelG, maxTurns, firstPlayer) {
  const pieces = BB.game.makeInitialPieces();
  let side = firstPlayer || 'R';
  const lv = { R: levelR, G: levelG };
  for (let t = 0; t < maxTurns; t++) {
    const turn = BB.ai.chooseTurn(pieces, side, lv[side]);
    if (!turn) return 'draw';
    let pos = turn.from;
    turn.steps.forEach((st) => {
      if (st.from !== pos) throw new Error('chain discontinuity');
      if (pieces[st.from] !== side) throw new Error('moving a piece that is not ours');
      const mv = BB.game.computeMoves(st.from, pieces);
      if (st.through) {
        if (!mv.captures.some((c) => c.through === st.through && c.to === st.to)) throw new Error(`AI made an illegal capture ${st.from}>${st.through}>${st.to}`);
        pieces[st.through] = null;
      } else if (!mv.normal.includes(st.to)) throw new Error(`AI made an illegal step ${st.from}>${st.to}`);
      pieces[st.to] = pieces[st.from]; pieces[st.from] = null; pos = st.to;
    });
    if (turn.isCapture && BB.game.computeMoves(pos, pieces).captures.length) throw new Error('AI stopped a capture chain early');
    const left = { R: 0, G: 0 };
    Object.values(pieces).forEach((p) => p && left[p]++);
    if (left.R === 0) return 'G';
    if (left.G === 0) return 'R';
    side = side === 'R' ? 'G' : 'R';
  }
  const left = { R: 0, G: 0 };
  Object.values(pieces).forEach((p) => p && left[p]++);
  selfPlay.lastCounts = left;
  return 'cap';
}
module.exports = { loadEngine, selfPlay };
