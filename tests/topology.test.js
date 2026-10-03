/**
 * Board topology audit (node --test tests/). No browser needed.
 * Proves the corrected board:
 *  - has no X inside any cell, and every diagonal joins two "even" points;
 *  - triangles have no crossing lines;
 *  - every legal move/jump the engine can produce lies on a drawn edge;
 *  - compared with the ORIGINAL rules (all diagonals, equal-vector jumps),
 *    the new jump set is a strict subset, and everything removed used a
 *    removed diagonal - i.e. no new capture path was invented.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(files, extra) {
  const ctx = Object.assign({ window: {}, console }, extra || {});
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', f), 'utf8'), ctx, { filename: f }));
  return ctx.window.BB;
}
const BB = load(['board.js']);
const { nodePos, edges, adj, jumps } = BB.board;
const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
const edgeSet = new Set(edges.map(([a, b]) => key(a, b)));

test('37 nodes, 76 edges, no duplicate edges', () => {
  assert.strictEqual(Object.keys(nodePos).length, 37);
  assert.strictEqual(edges.length, 76);
  assert.strictEqual(edgeSet.size, 76);
});

test('exactly one diagonal per grid cell, none crossing', () => {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const back = edgeSet.has(key(`g${r}_${c}`, `g${r + 1}_${c + 1}`));
    const fwd = edgeSet.has(key(`g${r}_${c + 1}`, `g${r + 1}_${c}`));
    assert.ok(back !== fwd, `cell ${r},${c} must have exactly one diagonal (has ${back ? 'back ' : ''}${fwd ? 'fwd' : ''})`);
    assert.strictEqual(back, (r + c) % 2 === 0);
  }
});

test('grid diagonals only join even points', () => {
  edges.forEach(([a, b]) => {
    const A = a.match(/^g(\d)_(\d)$/), B = b.match(/^g(\d)_(\d)$/);
    if (A && B && A[1] !== B[1] && A[2] !== B[2]) {
      assert.strictEqual((+A[1] + +A[2]) % 2, 0, a); assert.strictEqual((+B[1] + +B[2]) % 2, 0, b);
    }
  });
});

test('triangles: exactly the 10 straight lines, no crossings', () => {
  ['t', 'b'].forEach((p) => {
    const apex = p === 't' ? 'g0_2' : 'g4_2';
    const want = [
      [`${p}1_0`, `${p}1_1`], [`${p}1_1`, `${p}1_2`], [`${p}2_0`, `${p}2_1`], [`${p}2_1`, `${p}2_2`],
      [`${p}1_0`, `${p}2_0`], [`${p}1_1`, `${p}2_1`], [`${p}1_2`, `${p}2_2`],
      [`${p}2_0`, apex], [`${p}2_1`, apex], [`${p}2_2`, apex]
    ];
    const have = edges.filter(([a, b]) => a.startsWith(p + '') && a[1] !== 'x' && /^[tb]/.test(a) && a[0] === p || (b[0] === p && /^[tb]\d/.test(b)));
    want.forEach(([a, b]) => assert.ok(edgeSet.has(key(a, b)), `${a}-${b}`));
    // forbidden crossings
    [[`${p}1_0`, `${p}2_1`], [`${p}1_1`, `${p}2_0`], [`${p}1_1`, `${p}2_2`], [`${p}1_2`, `${p}2_1`]]
      .forEach(([a, b]) => assert.ok(!edgeSet.has(key(a, b)), `unwanted cross ${a}-${b}`));
    assert.strictEqual(adj[apex].filter((n) => n.startsWith(p + '2')).length, 3);
  });
});

test('every jump a->b->c runs along two drawn edges', () => {
  let n = 0;
  Object.keys(jumps).forEach((a) => Object.keys(jumps[a]).forEach((b) => jumps[a][b].forEach((c) => {
    n++;
    assert.ok(edgeSet.has(key(a, b)) && edgeSet.has(key(b, c)), `${a}->${b}->${c}`);
  })));
  assert.ok(n > 100);
});

test('new jumps are a subset of the original rules; every removed jump used a removed diagonal', () => {
  // ORIGINAL board + rule, reproduced verbatim from the shipped v1 source.
  const oldPos = {}, oldEdges = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) oldPos[`g${r}_${c}`] = { x: 100 + c * 75, y: 200 + r * 75 };
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) oldEdges.push([`g${r}_${c}`, `g${r}_${c + 1}`]);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) oldEdges.push([`g${r}_${c}`, `g${r + 1}_${c}`]);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { oldEdges.push([`g${r}_${c}`, `g${r + 1}_${c + 1}`]); oldEdges.push([`g${r}_${c + 1}`, `g${r + 1}_${c}`]); }
  Object.assign(oldPos, {
    t1_0: { x: 100, y: 50 }, t1_1: { x: 250, y: 50 }, t1_2: { x: 400, y: 50 }, t2_0: { x: 175, y: 125 }, t2_1: { x: 250, y: 125 }, t2_2: { x: 325, y: 125 },
    b2_0: { x: 175, y: 575 }, b2_1: { x: 250, y: 575 }, b2_2: { x: 325, y: 575 }, b1_0: { x: 100, y: 650 }, b1_1: { x: 250, y: 650 }, b1_2: { x: 400, y: 650 }
  });
  ['t', 'b'].forEach((p) => {
    const ap = p === 't' ? 'g0_2' : 'g4_2';
    oldEdges.push([`${p}1_0`, `${p}1_1`], [`${p}1_1`, `${p}1_2`], [`${p}2_0`, `${p}2_1`], [`${p}2_1`, `${p}2_2`],
      [`${p}1_0`, `${p}2_0`], [`${p}1_1`, `${p}2_1`], [`${p}1_2`, `${p}2_2`],
      [`${p}1_0`, `${p}2_1`], [`${p}1_1`, `${p}2_0`], [`${p}1_1`, `${p}2_2`], [`${p}1_2`, `${p}2_1`],
      [`${p}2_0`, ap], [`${p}2_1`, ap], [`${p}2_2`, ap]);
  });
  const oldAdj = {};
  oldEdges.forEach(([a, b]) => { (oldAdj[a] = oldAdj[a] || []).push(b); (oldAdj[b] = oldAdj[b] || []).push(a); });
  const oldJumps = new Set();
  Object.keys(oldPos).forEach((a) => oldAdj[a].forEach((b) => oldAdj[b].forEach((c) => {
    if (c === a) return;
    const A = oldPos[a], B = oldPos[b], C = oldPos[c];
    if (B.x - A.x === C.x - B.x && B.y - A.y === C.y - B.y) oldJumps.add(`${a}>${b}>${c}`);
  })));
  const newJumps = new Set();
  Object.keys(jumps).forEach((a) => Object.keys(jumps[a]).forEach((b) => jumps[a][b].forEach((c) => newJumps.add(`${a}>${b}>${c}`))));

  newJumps.forEach((j) => assert.ok(oldJumps.has(j), `NEW capture path invented: ${j}`));
  const removedEdges = new Set(oldEdges.map(([a, b]) => key(a, b)).filter((k) => !edgeSet.has(k)));
  let removed = 0;
  oldJumps.forEach((j) => {
    if (newJumps.has(j)) return;
    removed++;
    const [a, b, c] = j.split('>');
    assert.ok(removedEdges.has(key(a, b)) || removedEdges.has(key(b, c)), `jump ${j} lost without a removed line`);
  });
  assert.ok(removed > 0);
  // no OLD edge was dropped except the cross diagonals
  assert.strictEqual(removedEdges.size, 16 + 8, 'removed = 16 extra cell diagonals + 8 triangle crosses');
});
