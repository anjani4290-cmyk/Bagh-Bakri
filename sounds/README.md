# sounds/

Bagh Bakri now has sound effects, but they're **synthesized in code**
via the Web Audio API (`src/js/sound.js`) rather than played from
audio files — so there's nothing to put in this folder for the game
to work, and no files to keep small or license-check.

Currently wired up:
- A soft tap on a normal move
- A sharper two-tone sound when a goti is captured
- A short rising flourish when a game ends (win or draw)

Players can mute all of it with the 🔊/🔇 button in the controls row.

## If you'd rather use real audio files instead

Drop `.mp3`/`.wav` files in this folder and swap the `tone(...)` calls
in `src/js/sound.js`'s `playMove()` / `playCapture()` / `playWin()`
for something like:

```js
function playMove() {
  if (!enabled) return;
  new Audio('sounds/move.mp3').play();
}
```

Keep files short (well under a second for move/capture) and small
(well under 50KB each) so they play instantly and don't bloat the
app. Free sound effects for board games are available on sites like
freesound.org and zapsplat.com (check each clip's license before
shipping it).
