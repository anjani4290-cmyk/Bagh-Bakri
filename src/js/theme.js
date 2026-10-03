/**
 * theme.js
 * ----------------------------------------------------------------
 * Board themes. A theme is PURELY visual: a bag of CSS variables, two
 * colour pairs for the pieces, optional glyphs stamped on the pieces, and
 * four decorative corner emoji. Themes never touch board.js, game.js or
 * ai.js, so rules, topology and AI are identical under every theme.
 * The chosen theme is remembered in localStorage.
 */
window.BB = window.BB || {};

(function (BB) {
  const KEY = 'baghBakriTheme_v1';

  // pieces: [highlight, shade] gradient stops for each side.
  const THEMES = {
    classic: {
      name: 'Classic', blurb: 'The original walnut board',
      corners: ['🐯', '🐯', '🐐', '🐐'],
      pieces: { R: ['#d9573a', '#8f2411'], G: ['#5e9a5e', '#2a4d2a'] },
      glyph: { R: '', G: '' },
      vars: {
        '--bg': '#191009', '--bg2': '#2a1c0f', '--panel': '#241708',
        '--cream': '#f3ead4', '--line-dim': '#b89f74', '--brass': '#c9a227', '--accent-ink': '#241708',
        '--red': '#b5361c', '--green': '#3f6b3f',
        '--board-bg': 'linear-gradient(160deg,#7a4a26,#4a2c14)',
        '--board-pattern': 'repeating-linear-gradient(45deg,rgba(255,193,110,.06) 0 10px,transparent 10px 20px)',
        '--board-border': 'rgba(233,220,184,.2)',
        '--edge': '#e9dcb8', '--edge-w': '2', '--edge-op': '.55', '--edge-dash': 'none', '--edge-glow': 'none',
        '--node': '#3a2a18', '--piece-stroke': 'rgba(0,0,0,.45)', '--piece-glow': 'none',
        '--ring-normal': '#8fd18f', '--ring-capture': '#ff8a3d', '--ring-selected': '#c9a227',
        '--motif-op': '.14'
      }
    },
    wooden: {
      name: 'Wooden', blurb: 'Polished oak and turned pieces',
      corners: ['🪵', '🪵', '🌳', '🌳'],
      pieces: { R: ['#e0784a', '#8a2d12'], G: ['#a3bf6a', '#4a6326'] },
      glyph: { R: '', G: '' },
      vars: {
        '--bg': '#1c130b', '--bg2': '#33210f', '--panel': '#2a1b0c',
        '--cream': '#f6ecd6', '--line-dim': '#c4a878', '--brass': '#d9a441', '--accent-ink': '#2a1b0c',
        '--red': '#c2532b', '--green': '#6f8c3a',
        '--board-bg': 'linear-gradient(160deg,#e2b878,#b9803f)',
        '--board-pattern': 'repeating-linear-gradient(92deg,rgba(90,50,15,.16) 0 2px,transparent 2px 9px),repeating-linear-gradient(88deg,rgba(255,235,190,.10) 0 1px,transparent 1px 23px)',
        '--board-border': 'rgba(70,40,10,.7)',
        '--edge': '#4a2a10', '--edge-w': '2.6', '--edge-op': '.9', '--edge-dash': 'none', '--edge-glow': 'none',
        '--node': '#4a2a10', '--piece-stroke': 'rgba(40,20,5,.7)', '--piece-glow': 'none',
        '--ring-normal': '#2f7d32', '--ring-capture': '#d84315', '--ring-selected': '#3e2200',
        '--motif-op': '.22'
      }
    },
    neon: {
      name: 'Neon', blurb: 'Glowing lines on a dark grid',
      corners: ['⚡', '⚡', '✨', '✨'],
      pieces: { R: ['#ff7aa6', '#d10057'], G: ['#8dffa0', '#00b84a'] },
      glyph: { R: '', G: '' },
      vars: {
        '--bg': '#04050d', '--bg2': '#0e1030', '--panel': '#0a0c22',
        '--cream': '#e6f7ff', '--line-dim': '#7fb6d1', '--brass': '#00e5ff', '--accent-ink': '#001318',
        '--red': '#ff2e7e', '--green': '#2bff7a',
        '--board-bg': 'linear-gradient(160deg,#0a0d2a,#05061a)',
        '--board-pattern': 'linear-gradient(rgba(0,229,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.05) 1px,transparent 1px)',
        '--board-border': 'rgba(0,229,255,.55)',
        '--edge': '#00e5ff', '--edge-w': '2.2', '--edge-op': '.95', '--edge-dash': 'none', '--edge-glow': 'drop-shadow(0 0 3px #00e5ff)',
        '--node': '#00e5ff', '--piece-stroke': 'rgba(255,255,255,.75)', '--piece-glow': 'drop-shadow(0 0 4px rgba(255,255,255,.75))',
        '--ring-normal': '#39ff88', '--ring-capture': '#ffea00', '--ring-selected': '#00e5ff',
        '--motif-op': '.3'
      }
    },
    denim: {
      name: 'Denim', blurb: 'Stitched blue jeans with button pieces',
      corners: ['🧵', '🪡', '🧵', '🪡'],
      pieces: { R: ['#f08a6a', '#b23a20'], G: ['#9fd88a', '#3d8030'] },
      glyph: { R: '', G: '' },
      vars: {
        '--bg': '#0b1526', '--bg2': '#16294a', '--panel': '#10203a',
        '--cream': '#eaf1fb', '--line-dim': '#92abcf', '--brass': '#f2c14e', '--accent-ink': '#10203a',
        '--red': '#d0533a', '--green': '#4f9a3c',
        '--board-bg': 'linear-gradient(160deg,#3b6aa5,#264a80)',
        '--board-pattern': 'repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,rgba(0,0,30,.10) 0 1px,transparent 1px 4px)',
        '--board-border': '#f2c14e',
        '--edge': '#f6dfa4', '--edge-w': '2.2', '--edge-op': '.9', '--edge-dash': '7 5', '--edge-glow': 'none',
        '--node': '#f2c14e', '--piece-stroke': 'rgba(255,255,255,.6)', '--piece-glow': 'none',
        '--ring-normal': '#b8f5a5', '--ring-capture': '#ffb347', '--ring-selected': '#ffffff',
        '--motif-op': '.28'
      }
    },
    pirate: {
      name: 'Pirate', blurb: 'Treasure map, skulls and anchors',
      corners: ['🏴‍☠️', '🦜', '⚓', '🧭'],
      pieces: { R: ['#e0473a', '#7d100c'], G: ['#3fb3a3', '#0f5a51'] },
      glyph: { R: '☠', G: '⚓' },
      vars: {
        '--bg': '#07141f', '--bg2': '#0f3550', '--panel': '#0c2233',
        '--cream': '#f7ecd0', '--line-dim': '#a9bfcc', '--brass': '#e0b040', '--accent-ink': '#1b1205',
        '--red': '#c9382c', '--green': '#2c9c8d',
        '--board-bg': 'linear-gradient(160deg,#ecd9a8,#c9a566)',
        '--board-pattern': 'radial-gradient(circle at 20% 25%,rgba(120,70,20,.20) 0,transparent 32%),radial-gradient(circle at 80% 80%,rgba(120,70,20,.22) 0,transparent 36%),repeating-linear-gradient(45deg,rgba(120,80,30,.06) 0 6px,transparent 6px 14px)',
        '--board-border': '#6b4218',
        '--edge': '#5a3410', '--edge-w': '2.4', '--edge-op': '.9', '--edge-dash': '2 6', '--edge-glow': 'none',
        '--node': '#5a3410', '--piece-stroke': 'rgba(20,10,0,.75)', '--piece-glow': 'none',
        '--ring-normal': '#1b7f3a', '--ring-capture': '#c62828', '--ring-selected': '#1b1205',
        '--motif-op': '.35'
      }
    },
    penguin: {
      name: 'Penguin', blurb: 'Icy floe with snowy friends',
      corners: ['❄️', '🧊', '🐧', '❄️'],
      pieces: { R: ['#ff9d78', '#d1452b'], G: ['#7ee0a6', '#1f8f57'] },
      glyph: { R: '🐧', G: '🐻‍❄️' },
      vars: {
        '--bg': '#0a1c2e', '--bg2': '#1b4a6e', '--panel': '#0f2b45',
        '--cream': '#eaf7ff', '--line-dim': '#9cc4de', '--brass': '#7fd6ff', '--accent-ink': '#062033',
        '--red': '#e8603f', '--green': '#2fa46a',
        '--board-bg': 'linear-gradient(160deg,#eaf8ff,#a8d8f0)',
        '--board-pattern': 'radial-gradient(circle,rgba(255,255,255,.9) 0 1.5px,transparent 2px) 0 0/28px 28px,radial-gradient(circle,rgba(255,255,255,.7) 0 1px,transparent 1.5px) 14px 14px/28px 28px',
        '--board-border': '#ffffff',
        '--edge': '#2b6f9e', '--edge-w': '2.4', '--edge-op': '.85', '--edge-dash': 'none', '--edge-glow': 'none',
        '--node': '#2b6f9e', '--piece-stroke': 'rgba(10,50,90,.7)', '--piece-glow': 'none',
        '--ring-normal': '#1b9e5a', '--ring-capture': '#e65100', '--ring-selected': '#0d47a1',
        '--motif-op': '.4'
      }
    },
    alien: {
      name: 'Alien', blurb: 'Deep space and glowing green tech',
      corners: ['🛸', '🪐', '👽', '⭐'],
      pieces: { R: ['#ff8ae2', '#8a1f7a'], G: ['#7dffc0', '#0f8a55'] },
      glyph: { R: '👾', G: '👽' },
      vars: {
        '--bg': '#05030d', '--bg2': '#1a0f3d', '--panel': '#120a2b',
        '--cream': '#ecffe9', '--line-dim': '#9fd9a6', '--brass': '#7cff6b', '--accent-ink': '#04140a',
        '--red': '#e64fc4', '--green': '#3fe08f',
        '--board-bg': 'radial-gradient(circle at 50% 40%,#2a1a5e,#0a0620 75%)',
        '--board-pattern': 'radial-gradient(circle,rgba(255,255,255,.85) 0 1px,transparent 1.5px) 0 0/37px 41px,radial-gradient(circle,rgba(124,255,107,.6) 0 1px,transparent 1.5px) 19px 22px/53px 47px',
        '--board-border': 'rgba(124,255,107,.6)',
        '--edge': '#7cff6b', '--edge-w': '2', '--edge-op': '.8', '--edge-dash': 'none', '--edge-glow': 'drop-shadow(0 0 2px #7cff6b)',
        '--node': '#7cff6b', '--piece-stroke': 'rgba(255,255,255,.55)', '--piece-glow': 'none',
        '--ring-normal': '#7cff6b', '--ring-capture': '#ff5cf0', '--ring-selected': '#ffffff',
        '--motif-op': '.32'
      }
    },
    diwali: {
      name: 'Diwali', blurb: 'Festival of lights in maroon and gold',
      corners: ['🪔', '🎆', '🪔', '✨'],
      pieces: { R: ['#ffb04a', '#c2410c'], G: ['#8fdc8a', '#1f7a3a'] },
      glyph: { R: '🪔', G: '✨' },
      vars: {
        '--bg': '#1a0410', '--bg2': '#4a0a24', '--panel': '#2b0716',
        '--cream': '#fff1d6', '--line-dim': '#e0b98a', '--brass': '#ffb703', '--accent-ink': '#2b0716',
        '--red': '#f0741e', '--green': '#3aa15a',
        '--board-bg': 'linear-gradient(160deg,#7a1236,#3d0820)',
        '--board-pattern': 'radial-gradient(circle,rgba(255,200,80,.55) 0 1.4px,transparent 2px) 0 0/22px 22px,repeating-linear-gradient(60deg,rgba(255,183,3,.07) 0 8px,transparent 8px 16px)',
        '--board-border': '#ffb703',
        '--edge': '#ffcf5a', '--edge-w': '2.2', '--edge-op': '.9', '--edge-dash': 'none', '--edge-glow': 'drop-shadow(0 0 2px rgba(255,183,3,.8))',
        '--node': '#ffb703', '--piece-stroke': 'rgba(255,230,160,.7)', '--piece-glow': 'none',
        '--ring-normal': '#9dff9d', '--ring-capture': '#ff5252', '--ring-selected': '#ffffff',
        '--motif-op': '.4'
      }
    }
  };
  const ORDER = ['classic', 'wooden', 'neon', 'denim', 'pirate', 'penguin', 'alien', 'diwali'];

  let currentId = 'classic';

  function current() { return THEMES[currentId]; }
  function currentIdValue() { return currentId; }

  function apply(id, persist) {
    if (!THEMES[id]) id = 'classic';
    currentId = id;
    const t = THEMES[id];
    const root = document.documentElement;
    Object.keys(t.vars).forEach((k) => root.style.setProperty(k, t.vars[k]));
    document.body.setAttribute('data-theme', id);
    const motifs = document.querySelectorAll('.corner-motif');
    motifs.forEach((m, i) => (m.textContent = t.corners[i] || ''));
    if (persist !== false) { try { localStorage.setItem(KEY, id); } catch (e) {} }
    if (BB.render && BB.render.render && BB.game) BB.render.render(); // repaint with new piece looks
    document.dispatchEvent(new CustomEvent('bb-theme', { detail: id }));
  }

  function init() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    apply(saved && THEMES[saved] ? saved : 'classic', false);
  }

  BB.theme = { THEMES, ORDER, current, id: currentIdValue, apply, init };
})(window.BB);
