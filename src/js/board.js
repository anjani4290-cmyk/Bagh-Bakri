/**
 * board.js
 * ----------------------------------------------------------------
 * THE single authoritative definition of the Bagh Bakri board.
 * 37 points: a 5x5 grid + a 6-point triangle on top and on the bottom.
 * Everything else derives from this file:
 *
 *   nodePos  -> where each point is drawn
 *   edges    -> which pairs of points have a line (drawn AND walkable)
 *   adj      -> adjacency list built from edges (one-step moves)
 *   jumps    -> jumps[a][b] = list of points c such that a -> b -> c is a
 *               straight-line jump over b (both a-b and b-c are lines)
 *
 * The renderer draws `edges`; the rules engine, the AI, and the tutorial
 * read `adj` / `jumps`. A line that is not in `edges` can therefore
 * neither be drawn nor walked/captured on.
 *
 * Geometry (matches the reference board):
 *  - Main grid: every cell carries exactly ONE diagonal. The diagonals
 *    run only through the "even" points (row+col even), i.e. the classic
 *    Alquerque pattern - never an X inside a cell.
 *  - Triangles: two rows of three points (3 across the outer row, 3 across
 *    the inner row). Each triangle point is joined to its neighbour in the
 *    same row, to the point straight "below" it in the next row, and each
 *    inner-row point continues on to the grid apex (g0_2 / g4_2). The
 *    outer lines are therefore straight and there are no crossing lines
 *    inside the triangle.
 */
window.BB = window.BB || {};

(function (BB) {
  const U = 75; // grid spacing
  const nodePos = {};
  const edges = [];

  // ---- Main 5x5 grid -------------------------------------------------
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      nodePos[`g${r}_${c}`] = { x: 100 + c * U, y: 200 + r * U };
    }
  }
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) edges.push([`g${r}_${c}`, `g${r}_${c + 1}`]); // horizontal
  }
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) edges.push([`g${r}_${c}`, `g${r + 1}_${c}`]); // vertical
  }
  // Exactly ONE diagonal per cell. If the cell's top-left corner is an
  // "even" point (row+col even) the diagonal runs top-left -> bottom-right,
  // otherwise it runs top-right -> bottom-left. Diagonals therefore only
  // ever join two even points and never cross inside a cell.
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if ((r + c) % 2 === 0) edges.push([`g${r}_${c}`, `g${r + 1}_${c + 1}`]); // \
      else edges.push([`g${r}_${c + 1}`, `g${r + 1}_${c}`]);                   // /
    }
  }

  // ---- Triangles -----------------------------------------------------
  // The outer row sits one grid step from the apex, the inner row half
  // a step (see the reference screenshot).
  const half = U / 2;
  function addTriangle(prefix, apex, dir) {
    // dir = -1 for the top triangle (grows upward), +1 for the bottom one
    const ap = nodePos[apex];
    const innerY = ap.y + dir * half;
    const outerY = ap.y + dir * U;
    for (let i = 0; i < 3; i++) {
      nodePos[`${prefix}1_${i}`] = { x: ap.x + (i - 1) * U, y: outerY };
      nodePos[`${prefix}2_${i}`] = { x: ap.x + (i - 1) * half, y: innerY };
    }
    edges.push(
      [`${prefix}1_0`, `${prefix}1_1`], [`${prefix}1_1`, `${prefix}1_2`], // outer row
      [`${prefix}2_0`, `${prefix}2_1`], [`${prefix}2_1`, `${prefix}2_2`], // inner row
      [`${prefix}1_0`, `${prefix}2_0`], [`${prefix}1_1`, `${prefix}2_1`], [`${prefix}1_2`, `${prefix}2_2`], // sides + spine
      [`${prefix}2_0`, apex], [`${prefix}2_1`, apex], [`${prefix}2_2`, apex]                                 // into the grid
    );
  }
  addTriangle('t', 'g0_2', -1);
  addTriangle('b', 'g4_2', +1);

  // ---- Adjacency -------------------------------------------------------
  const adj = {};
  Object.keys(nodePos).forEach((id) => (adj[id] = []));
  edges.forEach(([a, b]) => {
    adj[a].push(b);
    adj[b].push(a);
  });

  // ---- Jumps -----------------------------------------------------------
  // a -> b -> c is a straight jump when a-b and b-c are both lines and
  // both steps point in the same direction. Direction is compared as a
  // reduced vector, so it does not depend on how far apart the points are
  // (grid steps and the shorter triangle steps still line up).
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  function dirKey(p, q) {
    const dx = Math.round((q.x - p.x) * 2), dy = Math.round((q.y - p.y) * 2);
    const g = gcd(Math.abs(dx), Math.abs(dy)) || 1;
    return `${dx / g},${dy / g}`;
  }
  const jumps = {};
  Object.keys(nodePos).forEach((a) => {
    jumps[a] = {};
    adj[a].forEach((b) => {
      const landings = adj[b].filter(
        (c) => c !== a && dirKey(nodePos[a], nodePos[b]) === dirKey(nodePos[b], nodePos[c])
      );
      if (landings.length) jumps[a][b] = landings;
    });
  });

  // Bounding box for the SVG viewBox, padded for the piece radius.
  const xs = Object.values(nodePos).map((p) => p.x);
  const ys = Object.values(nodePos).map((p) => p.y);
  const pad = 40;
  const viewBox = {
    x: Math.min(...xs) - pad, y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
    h: Math.max(...ys) - Math.min(...ys) + 2 * pad
  };

  BB.board = { nodePos, edges, adj, jumps, viewBox };
})(window.BB);
