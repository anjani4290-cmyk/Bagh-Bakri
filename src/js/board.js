/**
 * board.js
 * ----------------------------------------------------------------
 * Defines the Bagh Bakri board as a graph: 37 points (25 on the main
 * 5x5 grid + 6 in the top triangle + 6 in the bottom triangle) and
 * the lines that connect them. Nothing here knows about pieces or
 * turns - it's pure geometry, reused by both the rules engine
 * (game.js) and the renderer (render.js).
 *
 * All triangle nodes are aligned to the grid's 75-unit spacing so
 * that straight-line captures work correctly even when a jump
 * crosses from the main grid into a triangle.
 */
window.BB = window.BB || {};

(function (BB) {
  const nodePos = {};
  const edges = [];

  // ---- Main 5x5 grid -------------------------------------------------
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      nodePos[`g${r}_${c}`] = { x: 100 + c * 75, y: 200 + r * 75 };
    }
  }
  // horizontal lines
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      edges.push([`g${r}_${c}`, `g${r}_${c + 1}`]);
    }
  }
  // vertical lines
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      edges.push([`g${r}_${c}`, `g${r + 1}_${c}`]);
    }
  }
  // diagonals (both directions) in every cell - classic Alquerque-style
  // board that Bagh Bakri / Bagh Chal is based on
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      edges.push([`g${r}_${c}`, `g${r + 1}_${c + 1}`]); // \
      edges.push([`g${r}_${c + 1}`, `g${r + 1}_${c}`]); // /
    }
  }

  // ---- Top triangle (apex sits on g0_2, the top-middle grid point) ---
  Object.assign(nodePos, {
    t1_0: { x: 100, y: 50 }, t1_1: { x: 250, y: 50 }, t1_2: { x: 400, y: 50 },
    t2_0: { x: 175, y: 125 }, t2_1: { x: 250, y: 125 }, t2_2: { x: 325, y: 125 }
  });
  edges.push(
    ['t1_0', 't1_1'], ['t1_1', 't1_2'],
    ['t2_0', 't2_1'], ['t2_1', 't2_2'],
    ['t1_0', 't2_0'], ['t1_1', 't2_1'], ['t1_2', 't2_2'],
    ['t1_0', 't2_1'], ['t1_1', 't2_0'], ['t1_1', 't2_2'], ['t1_2', 't2_1'],
    ['t2_0', 'g0_2'], ['t2_1', 'g0_2'], ['t2_2', 'g0_2']
  );

  // ---- Bottom triangle (apex sits on g4_2, the bottom-middle grid point)
  Object.assign(nodePos, {
    b2_0: { x: 175, y: 575 }, b2_1: { x: 250, y: 575 }, b2_2: { x: 325, y: 575 },
    b1_0: { x: 100, y: 650 }, b1_1: { x: 250, y: 650 }, b1_2: { x: 400, y: 650 }
  });
  edges.push(
    ['b1_0', 'b1_1'], ['b1_1', 'b1_2'],
    ['b2_0', 'b2_1'], ['b2_1', 'b2_2'],
    ['b1_0', 'b2_0'], ['b1_1', 'b2_1'], ['b1_2', 'b2_2'],
    ['b1_0', 'b2_1'], ['b1_1', 'b2_0'], ['b1_1', 'b2_2'], ['b1_2', 'b2_1'],
    ['b2_0', 'g4_2'], ['b2_1', 'g4_2'], ['b2_2', 'g4_2']
  );

  // ---- Adjacency list --------------------------------------------------
  const adj = {};
  edges.forEach(([a, b]) => {
    (adj[a] = adj[a] || []).push(b);
    (adj[b] = adj[b] || []).push(a);
  });

  BB.board = { nodePos, edges, adj };
})(window.BB);
