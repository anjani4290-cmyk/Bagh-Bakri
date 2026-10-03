"""
End-to-end browser audit (Playwright/Chromium). Run:  python3 tests/e2e.py
Serves nothing - opens index.html via file://. Screenshots go to $SHOTS (default ./shots).
"""
import json, os, sys, hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = Path(os.environ.get("SHOTS", ROOT / "shots")); SHOTS.mkdir(exist_ok=True, parents=True)
results = []
def ok(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))

THEMES = ["classic", "wooden", "neon", "denim", "pirate", "penguin", "alien", "diwali"]

def node_click(pg, nid):
    pg.locator(f'.hit[data-node="{nid}"]').click()

def setup_state(pg, pieces, player):
    pg.evaluate("""([pieces, player]) => {
        const s = BB.game.state;
        Object.keys(s.pieces).forEach(k => s.pieces[k] = null);
        Object.keys(pieces).forEach(k => s.pieces[k] = pieces[k]);
        s.currentPlayer = player; s.selected = null; s.mustContinue = null;
        s.highlights = {normal: [], capture: []}; s.currentMoves = {normal: [], captures: []};
        BB.render.updateStatusBar(); BB.render.render();
    }""", [pieces, player])

def counts(pg):
    return pg.evaluate("(() => { const c={R:0,G:0}; Object.values(BB.game.state.pieces).forEach(p=>p&&c[p]++); return c; })()")

def initial_ok(pg):
    return pg.evaluate("JSON.stringify(BB.game.state.pieces) === JSON.stringify(BB.game.makeInitialPieces())")

def fresh_state_ok(pg):
    return pg.evaluate("""(() => { const s = BB.game.state;
        return !s.gameOver && !s.animating && s.selected === null && s.mustContinue === null
          && document.getElementById('winOverlay').classList.contains('hidden')
          && document.getElementById('modeOverlay').classList.contains('hidden'); })()""")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 430, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(f"file://{ROOT}/index.html")
    pg.evaluate("localStorage.clear()"); pg.reload()

    # ---------- BOARD ----------
    pg.click("#btnFriend"); pg.wait_for_timeout(300)
    n_lines = pg.locator("svg#board line.edge").count()
    ok("board draws 76 lines (one per topology edge)", n_lines == 76, n_lines)
    diag = pg.evaluate("""(() => { const out = {};
        document.querySelectorAll('svg#board line.edge').forEach(l => {
          const x1=+l.getAttribute('x1'), y1=+l.getAttribute('y1'), x2=+l.getAttribute('x2'), y2=+l.getAttribute('y2');
          if (Math.abs(x2-x1)===75 && Math.abs(y2-y1)===75) { const r=Math.round((Math.min(y1,y2)-200)/75), c=Math.round((Math.min(x1,x2)-100)/75);
            const k=r+','+c; out[k]=(out[k]||0)+1; } });
        return out; })()""")
    ok("exactly one diagonal drawn in each of the 16 grid cells (no X)", len(diag) == 16 and all(v == 1 for v in diag.values()), diag)
    drawn = pg.evaluate("""(() => { const T=BB.board; const a = Array.from(document.querySelectorAll('svg#board line.edge')).map(l=>[+l.getAttribute('x1'),+l.getAttribute('y1'),+l.getAttribute('x2'),+l.getAttribute('y2')].join());
        const b = T.edges.map(([u,v])=>[T.nodePos[u].x,T.nodePos[u].y,T.nodePos[v].x,T.nodePos[v].y].join()); return JSON.stringify(a)===JSON.stringify(b); })()""")
    ok("every drawn line IS a topology edge (renderer reads board.js)", drawn)
    pg.screenshot(path=str(SHOTS / "final_board.png"))

    # movement obeys topology: g2_1 (odd point) has only 4 steps; g2_2 has 8
    mv = pg.evaluate("""(() => { const s=BB.game.state; Object.keys(s.pieces).forEach(k=>s.pieces[k]=null); s.pieces.g2_1='R'; s.pieces.g2_2=null;
        const a = BB.game.computeMoves('g2_1').normal.length; s.pieces.g2_1=null; s.pieces.g2_2='R'; const c = BB.game.computeMoves('g2_2').normal.length; return [a,c]; })()""")
    ok("movement follows topology (odd point: 4 steps, junction: 8)", mv == [4, 8], mv)
    # diagonal capture that no longer exists must be illegal: piece at g0_1 over g1_2? (r+c odd cell (0,1) has '/' only: g0_2-g1_1)
    cap = pg.evaluate("""(() => { const s=BB.game.state; Object.keys(s.pieces).forEach(k=>s.pieces[k]=null);
        s.pieces.g0_1='G'; s.pieces.g1_2='R'; const a = BB.game.computeMoves('g0_1').captures.length;   // was legal on the old X board
        s.pieces.g0_1=null; s.pieces.g1_2=null; s.pieces.g0_2='G'; s.pieces.g1_1='R'; const b = BB.game.computeMoves('g0_2').captures.length; return [a,b]; })()""")
    ok("removed diagonal is no longer a capture path; the real one still is", cap == [0, 1], cap)

    # ---------- SETUP FLOW + DIFFICULTY ----------
    for level in ["easy", "moderate", "hard"]:
        pg.click("#newGameBtn"); pg.click("#btnComputer"); pg.click("#btnPlayRed"); pg.click(f'.diff-btn[data-level="{level}"]')
        pg.wait_for_timeout(200)
        ok(f"{level}: selected and stored in game state", pg.evaluate("BB.game.state.difficulty") == level)
        ok(f"{level}: label shown in HUD", level.capitalize() in pg.inner_text("#modeTag"))
        # spy on the AI entry point, then let the computer move
        pg.evaluate("""(() => { window.__lv = []; const o = BB.ai.chooseTurn; BB.ai.chooseTurn = function(a,b,c){ window.__lv.push(c); return o.apply(this, arguments); }; })()""")
        pg.evaluate("(() => { BB.game.state.currentPlayer = BB.game.state.computerColor; BB.ai.aiPlayIfNeeded(); })()")
        pg.wait_for_timeout(2600)
        lv = pg.evaluate("window.__lv")
        ok(f"{level}: the AI engine really receives '{level}'", len(lv) >= 1 and set(lv) == {level}, lv)
        ok(f"{level}: computer actually moved", not initial_ok(pg))

    # ---------- PLAY AGAIN: human win / computer win / draw ----------
    def play_again_check(label, before_mode, before_level, before_color, before_theme):
        vis = pg.evaluate("""(() => { const o = document.getElementById('winOverlay'); return !o.classList.contains('hidden'); })()""")
        ok(f"{label}: game-over dialog shown", vis)
        pg.click("#playAgainBtn"); pg.wait_for_timeout(250)
        ok(f"{label}: Play Again -> no dialog left, fresh unlocked game", fresh_state_ok(pg))
        ok(f"{label}: pieces back to the exact opening position", initial_ok(pg))
        ok(f"{label}: 16 v 16", counts(pg) == {"R": 16, "G": 16})
        ok(f"{label}: timer reset", pg.inner_text("#timerDisplay") in ("0:00", "0:01"))
        st = pg.evaluate("({m:BB.game.state.gameMode,l:BB.game.state.difficulty,c:BB.game.state.computerColor,t:BB.theme.id()})")
        ok(f"{label}: same mode, difficulty, side and theme kept", st == {"m": before_mode, "l": before_level, "c": before_color, "t": before_theme}, st)

    pg.evaluate("BB.theme.apply('neon')")
    pg.click("#newGameBtn"); pg.click("#btnComputer"); pg.click("#btnPlayRed"); pg.click('.diff-btn[data-level="hard"]')  # human = Red, cpu = Green
    pg.wait_for_timeout(150)
    # human wins: Red jumps the last Green piece
    setup_state(pg, {"g2_2": "R", "g3_2": "G"}, "R")
    node_click(pg, "g2_2"); node_click(pg, "g4_2"); pg.wait_for_timeout(700)
    ok("human win: overlay names Red the winner", "Red Wins" in pg.inner_text("#winText"))
    play_again_check("human win", "pvc", "hard", "G", "neon")
    # computer wins: Green (cpu) jumps the last Red piece
    setup_state(pg, {"g2_2": "G", "g1_2": "R"}, "G")
    pg.evaluate("BB.ai.aiPlayIfNeeded()"); pg.wait_for_timeout(2600)
    ok("computer win: overlay names Green the winner", "Green Wins" in pg.inner_text("#winText"))
    play_again_check("computer win", "pvc", "hard", "G", "neon")
    # draw: Red boxed in with no legal move after Green's move
    setup_state(pg, {"g0_0": "R", "g0_1": "G", "g0_2": "G", "g1_0": "G", "g2_0": "G", "g1_1": "G", "g2_2": "G", "g4_4": "G"}, "G")
    pg.evaluate("BB.game.state.gameMode='pvp'; BB.game.state.computerColor=null;"); pg.evaluate("BB.game.state.gameMode='pvp'")
    pg.evaluate("BB.game.doNormalMove('g4_4','g4_3')"); pg.wait_for_timeout(700)
    ok("draw: overlay says draw", "Draw" in pg.inner_text("#winText"), pg.inner_text("#winText"))
    pg.click("#playAgainBtn"); pg.wait_for_timeout(250)
    ok("draw: Play Again works (fresh, unlocked, opening position)", fresh_state_ok(pg) and initial_ok(pg) and counts(pg) == {"R": 16, "G": 16})
    # Change Settings from game over
    setup_state(pg, {"g2_2": "R", "g3_2": "G"}, "R"); node_click(pg, "g2_2"); node_click(pg, "g4_2"); pg.wait_for_timeout(700)
    pg.click("#changeSettingsBtn"); pg.wait_for_timeout(100)
    top = pg.evaluate("(() => { const e = document.elementFromPoint(215, 450); return e.closest('.modal-overlay').id; })()")
    ok("game over -> Change Settings: setup dialog is on top and reachable", top == "modeOverlay", top)
    pg.click("#btnFriend"); pg.wait_for_timeout(150)
    ok("new game starts from there", fresh_state_ok(pg) and initial_ok(pg))

    # stats filed under correct difficulty (human perspective)
    stats = pg.evaluate("JSON.stringify(BB.stats.load().vsCpu)")
    ok("stats: human win + computer win recorded under Hard, nothing under Easy/Moderate",
       json.loads(stats) == {"easy": {"won": 0, "drawn": 0, "lost": 0}, "moderate": {"won": 0, "drawn": 0, "lost": 0}, "hard": {"won": 1, "drawn": 0, "lost": 1}}, stats)

    # ---------- STALE TIMERS / ANIMATIONS ON RESTART ----------
    pg.evaluate("BB.game.startGame('pvc','G','easy')")
    pg.evaluate("(() => { BB.game.state.currentPlayer = 'G'; BB.ai.aiPlayIfNeeded(); })()")
    for _ in range(3): pg.evaluate("BB.game.restart()"); pg.wait_for_timeout(60)
    pg.evaluate("(() => { BB.game.state.currentPlayer = 'R'; })()")  # human to move: any AI move now would be a stale one
    pg.wait_for_timeout(2000)
    ok("restart while computer is thinking: stale AI timer never fires", initial_ok(pg))
    # restart mid-animation
    pg.evaluate("BB.game.startGame('pvp',null)")
    pg.evaluate("(() => { const s=BB.game.state; s.currentPlayer='R'; })()")
    pg.evaluate("BB.game.doNormalMove('g1_2','g2_2')")   # starts a 420ms slide
    pg.wait_for_timeout(120); pg.evaluate("BB.game.restart()"); pg.wait_for_timeout(900)
    ok("restart mid-animation: old animation cannot corrupt the new board", initial_ok(pg) and fresh_state_ok(pg))

    # ---------- THEMES ----------
    script = [("g1_2", "g2_2"), ("g3_2", "g1_2"), ]  # R steps in, G captures... run identical script under each theme
    outcomes = {}; edge_hash = {}
    for t in THEMES:
        pg.evaluate("BB.game.startGame('pvp',null); BB.game.state.currentPlayer='R'")
        pg.evaluate(f"BB.theme.apply('{t}')")
        applied = pg.evaluate("document.body.getAttribute('data-theme')") == t
        node_click(pg, "g1_2"); node_click(pg, "g2_2"); pg.wait_for_timeout(650)   # R: g1_2 -> g2_2
        node_click(pg, "g3_2"); node_click(pg, "g1_2"); pg.wait_for_timeout(650)   # G captures over g2_2 -> g1_2 ? (g1_2 now empty)
        outcomes[t] = pg.evaluate("JSON.stringify([BB.game.state.pieces, BB.game.state.currentPlayer, BB.game.state.mustContinue])")
        edge_hash[t] = pg.evaluate("JSON.stringify([BB.board.edges, BB.board.nodePos, BB.board.jumps])")
        pg.screenshot(path=str(SHOTS / f"theme_{t}.png"))
        ok(f"theme {t}: applied", applied)
    ok("all 8 themes play the identical scripted game to the identical position", len(set(outcomes.values())) == 1)
    ok("board topology object is byte-identical under every theme", len(set(edge_hash.values())) == 1)
    # persistence
    pg.evaluate("BB.theme.apply('diwali')"); pg.reload()
    ok("chosen theme persists across reload", pg.evaluate("document.body.getAttribute('data-theme')") == "diwali")
    # picker UI
    pg.click("#btnFriend"); pg.click("#themeBtn"); cards = pg.locator(".theme-card").count()
    ok("theme picker lists 8 themes", cards == 8, cards)
    pg.locator('.theme-card[data-theme="pirate"]').click()
    ok("picking a card switches the theme live", pg.evaluate("BB.theme.id()") == "pirate")
    pg.click("#closeTheme")

    # ---------- TUTORIAL ----------
    pg.evaluate("BB.game.startGame('pvp',null)"); node_click(pg, "g1_2"); node_click(pg, "g2_2"); pg.wait_for_timeout(650)
    before = pg.evaluate("JSON.stringify([BB.game.state.pieces, BB.game.state.currentPlayer, BB.game.state.selected, BB.game.state.gen])")
    pg.click("#howToPlayBtn"); pg.wait_for_timeout(100)
    ok("tutorial opens from the game screen", not pg.evaluate("document.getElementById('tutorialOverlay').classList.contains('hidden')"))
    seen = []
    for i in range(7):
        hl = pg.evaluate("(() => { const rings = document.querySelectorAll('#tutorialBoard .ring-normal, #tutorialBoard .ring-capture').length; return rings; })()")
        seen.append(hl)
        if i == 2: pg.screenshot(path=str(SHOTS / "tutorial_move.png"))
        if i == 4: pg.screenshot(path=str(SHOTS / "tutorial_capture.png"))
        if i < 6: pg.click("#tutNextBtn")
    ok("tutorial highlights come from the engine: 8 steps at a junction, 4 at a side point, 1 capture, 1 capture", seen[2:6] == [8, 4, 1, 1], seen)
    ok("tutorial boards use the same 76 lines", pg.locator("#tutorialBoard line.edge").count() == 76)
    pg.click("#tutNextBtn")   # Done on last step
    ok("tutorial can be completed", pg.evaluate("document.getElementById('tutorialOverlay').classList.contains('hidden')"))
    # interactive capture chain
    pg.click("#howToPlayBtn")
    for _ in range(5): pg.click("#tutNextBtn")
    pg.locator('#tutorialBoard .hit[data-node="g2_0"]').click()
    chain_hl = pg.evaluate("document.querySelectorAll('#tutorialBoard .ring-capture').length")
    pg.locator('#tutorialBoard .hit[data-node="g2_2"]').click()
    left = pg.evaluate("Object.values(BB.tutorial._scratch()).filter(Boolean).length")
    ok("tutorial multi-capture: first jump reveals a forced second jump, then ends with 1 piece", chain_hl == 1 and left == 1, [chain_hl, left])
    pg.click("#tutSkipBtn")
    ok("tutorial can be skipped", pg.evaluate("document.getElementById('tutorialOverlay').classList.contains('hidden')"))
    after = pg.evaluate("JSON.stringify([BB.game.state.pieces, BB.game.state.currentPlayer, BB.game.state.selected, BB.game.state.gen])")
    ok("tutorial leaves the live game untouched", before == after)
    pg.click("#newGameBtn"); pg.click("#btnSetupTutorial")
    ok("tutorial also reachable from the setup screen (opens above it)", pg.evaluate("(() => document.elementFromPoint(215,450).closest('.modal-overlay').id)()") == "tutorialOverlay")
    pg.click("#tutSkipBtn")

    # console cleanliness (ignore network font/icon failures)
    ok("no JavaScript errors during the whole run", not errors, errors)
    b.close()

fails = [n for n, c in results if not c]
print(f"\n{len(results) - len(fails)}/{len(results)} passed")
sys.exit(1 if fails else 0)
