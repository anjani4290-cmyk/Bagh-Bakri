/** AI tests (node --test): legality vs the rules engine, and real strength differences. */
const test = require('node:test');
const assert = require('node:assert');
const { loadEngine, selfPlay } = require('./harness');

function seeded(BB, seed) { BB.ai.setRng(() => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

test('every AI turn (all 3 levels) is legal per game.js, chains are completed', () => {
  const { BB } = loadEngine(); seeded(BB, 1);
  BB.ai.LEVELS.moderate.timeMs = 40; BB.ai.LEVELS.hard.timeMs = 60;
  ['easy', 'moderate', 'hard'].forEach((lv) => selfPlay(BB, lv, lv, 60, 'R')); // throws on any illegal move
});

test('Moderate and Hard beat Easy', () => {
  const { BB } = loadEngine(); seeded(BB, 42);
  BB.ai.LEVELS.moderate.timeMs = 40; BB.ai.LEVELS.hard.timeMs = 60;
  ['moderate', 'hard'].forEach((strong) => {
    let wins = 0;
    for (let i = 0; i < 4; i++) {
      const strongIsR = i % 2 === 0;
      const w = selfPlay(BB, strongIsR ? strong : 'easy', strongIsR ? 'easy' : strong, 150, i < 2 ? 'R' : 'G');
      if ((w === 'R') === strongIsR && (w === 'R' || w === 'G')) wins++;
    }
    assert.ok(wins >= 3, `${strong} won only ${wins}/4 against easy`);
  });
});

test('difficulty changes behaviour: Easy is not deterministic-greedy, Hard finds a 2-move capture combo', () => {
  const { BB } = loadEngine(); seeded(BB, 7);
  // Green to move. Green g4_0 can jump g3_0 then g2_1 (double). A single step elsewhere is worth 0.
  const p = BB.game.makeInitialPieces(); Object.keys(p).forEach((k) => (p[k] = null));
  p.g4_0 = 'G'; p.g3_0 = 'R'; p.g2_1 = 'R'; p.g0_4 = 'R'; p.g4_4 = 'G';
  const hard = BB.ai.chooseTurn(p, 'G', 'hard');
  assert.ok(hard.isCapture && hard.steps.length === 2, 'hard should take the double capture');
  const seen = new Set();
  for (let i = 0; i < 60; i++) { const t = BB.ai.chooseTurn(p, 'G', 'easy'); seen.add(t.isCapture ? 'cap' : 'step'); }
  assert.ok(seen.has('step'), 'easy should sometimes slip and not capture');
});

test('search stays inside its time budget', () => {
  const { BB } = loadEngine(); seeded(BB, 3);
  BB.ai.LEVELS.hard.timeMs = 300;
  const t0 = Date.now(); BB.ai.chooseTurn(BB.game.makeInitialPieces(), 'R', 'hard');
  assert.ok(Date.now() - t0 < 600, 'took ' + (Date.now() - t0) + 'ms');
});
