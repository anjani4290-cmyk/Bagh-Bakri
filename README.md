# Bagh Bakri

A classic two-player strategy board game, built as a small,
dependency-free web app that can also be packaged for Android and iOS.

- Play with a friend on the same device, or against a built-in
  computer opponent.
- 37-point board: a 5×5 grid plus a 6-point triangle attached at the
  top and bottom, with the centre point starting empty.
- Full rules: one-step moves along drawn lines only, jump-captures,
  **mandatory** multi-jump chains (the same piece must keep capturing
  while it can), win and stalemate detection.
- A visible, animated slide (with a glowing trail) for every move and
  capture — including the computer's — so nothing happens too fast to
  follow.
- A live match timer, confetti + applause on a win, and a persistent
  stats screen tracking games played and your fastest win time.

---

## Project structure

```
bagh-bakri/
├── android/            Placeholder — the real native project is generated
│                        by Cordova, not hand-written. See android/README.md.
├── assets/             App icons & store graphics (favicon, feature graphic).
├── src/
│   ├── js/
│   │   ├── board.js     Board graph: node positions + connections (pure data).
│   │   ├── sound.js     Synthesized sound effects (move, capture, win, applause).
│   │   ├── timer.js     Elapsed-time stopwatch shown during play and on the win screen.
│   │   ├── stats.js     Persists game history & best times in localStorage.
│   │   ├── game.js      Rules engine: state, moves, captures, win/draw.
│   │   ├── ai.js        Computer opponent (capture-chain lookahead).
│   │   ├── render.js    Draws the SVG board, animates moves, win confetti.
│   │   └── main.js      Wires up buttons/modals and boots the app.
│   └── css/
│       └── style.css    All styling.
├── lib/                Reserved for any third-party script you add later.
├── images/             Store screenshots / promo images (none needed to play).
├── sounds/             Reserved for sound effects (currently silent).
├── index.html          Entry point — loads style.css and the src/js files.
├── config.xml          Cordova config used when building Android/iOS.
├── package.json        npm metadata + convenience scripts.
└── README.md           This file.
```

### Why split into five JS files?

Each file has one job, all communicating through a single global
namespace (`window.BB`) — no build step or bundler required:

| File | Exposes | Depends on |
|---|---|---|
| `board.js` | `BB.board` (nodePos, edges, adj) | nothing |
| `game.js` | `BB.game` (state + rules) | `BB.board` |
| `ai.js` | `BB.ai` (computer opponent) | `BB.game` |
| `render.js` | `BB.render` (drawing + DOM) | `BB.board`, `BB.game` |
| `main.js` | — (event wiring only) | all of the above |

`index.html` loads them in exactly that order. If you rename or split
a file further, keep that order intact.

---

## Running it locally

No build step needed — it's static HTML/CSS/JS.

```bash
npx serve .
# or
python3 -m http.server 5000
```

Then open the printed local URL in a browser. (Opening `index.html`
directly with a `file://` URL also works fine, since these are plain
scripts, not ES modules.)

---

## Publishing

### Web (fastest — live in minutes)

Deploy the whole folder as-is to any static host:

- **GitHub Pages** — push this repo, enable Pages on the `main` branch.
- **Firebase Hosting** — `firebase init hosting` (public dir = this
  folder), then `npm run firebase:deploy`.
- **Netlify** — drag-and-drop the folder, or connect the repo.

### Android (Google Play)

There are two ways to get a release `.aab` (Android App Bundle):

#### Option A — GitHub Actions (recommended, no local install needed)

This repo includes `.github/workflows/build-android.yml`, which builds
a signed `bagh-bakri-release.aab` on GitHub's free hosted machines
(they already have the Android SDK, Gradle, and a JDK — nothing to
install on your own computer).

**One-time setup:**

1. Push this project to a GitHub repository.
2. Generate a signing keystore (do this once, keep the file forever):
   ```bash
   keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias baghbakri
   ```
3. Base64-encode it so it can be pasted into a GitHub secret:
   ```bash
   base64 -i release.keystore -o release.keystore.b64   # macOS/Linux
   # certutil -encode release.keystore release.keystore.b64   # Windows
   ```
4. In your GitHub repo: **Settings → Secrets and variables → Actions →
   New repository secret**. Add these four secrets:
   | Secret name | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | contents of `release.keystore.b64` |
   | `ANDROID_KEYSTORE_PASSWORD` | the keystore password you set in step 2 |
   | `ANDROID_KEY_ALIAS` | `baghbakri` (or whatever alias you used) |
   | `ANDROID_KEY_PASSWORD` | the key password you set in step 2 |

**Every time you want a build:**

1. Go to the **Actions** tab → **Build Android Release (.aab)** → **Run workflow**.
2. Wait for it to finish (a few minutes).
3. Open the completed run → download the **bagh-bakri-release** artifact
   → unzip it to get `bagh-bakri-release.aab`.
4. Upload that file to the Google Play Console (Release → Production →
   Create new release).

Without the four secrets, the workflow still runs and produces an
**unsigned** bundle so you can confirm the build itself works — but
Google Play will reject an unsigned upload, so you do need the
keystore secrets before submitting.

#### Option B — Build locally

The `android/` folder in this repo is a placeholder — Cordova
generates the real native project for you:

```bash
npm install -g cordova
cordova create cordova-shell com.yourname.baghbakri "Bagh Bakri"
cd cordova-shell
cp -r ../index.html ../src ../assets ../images ../sounds ../lib www/
cordova platform add android
cordova build android --release -- --packageType=bundle
```

This requires the Android SDK and a JDK installed locally (Android
Studio's SDK Manager is the easiest way to get both). The `.aab` lands
at `platforms/android/app/build/outputs/bundle/release/`. Sign it the
same way as in Option A (steps 2–3 above), reference the keystore via
a local `build.json`, and rebuild.

Full step-by-step Play Console setup (store listing, screenshots,
privacy policy, review process) is in the publishing guides delivered
alongside this project — see **PUBLISHING_GUIDE.md** and
**QUICK_START.md**.

### iOS (Apple App Store)

Same Cordova project, add the iOS platform instead (requires a Mac +
Xcode + a paid Apple Developer account):

```bash
npm run cordova:add-ios
npm run cordova:build-ios
```

Then open the generated Xcode project, sign it with your team
certificate, archive, and upload via App Store Connect.

### Assets you'll need before submitting

App icon, screenshots, and a privacy policy are required by both
stores. See `assets/README.md` for exact sizes, or the standalone
**ASSETS_NEEDED.md** guide for a full walkthrough (including free
tools like Canva and a ready-to-use privacy policy template).

---

## How the rules engine works (for anyone extending the code)

- **Board as a graph, not pixels.** `board.js` defines each of the 37
  points and which pairs of points have a line drawn between them.
  Nothing about movement is hard-coded to "up/down/left/right" —
  a move is legal wherever an edge exists in the graph.
- **Captures are pure geometry.** A jump from A over B to C is legal
  when B is an opponent piece, C is empty, edges A–B and B–C both
  exist, and the vector A→B exactly equals B→C (i.e. B sits exactly
  halfway between A and C in a straight line). This is what lets
  captures work correctly across the irregular triangle sections
  without a separate rule for every direction.
- **Chains are mandatory.** After a capture, `game.js` checks whether
  the same piece has another capture available. If so, the turn does
  not pass — the same piece must jump again.
- **The AI reuses the exact same rule functions.** `ai.js` never
  duplicates movement logic; it calls `BB.game.computeMoves(...)` on
  real and hypothetical boards to decide which legal move is best, the
  same way the human's move is validated.

---

## License

MIT — see `LICENSE`.
