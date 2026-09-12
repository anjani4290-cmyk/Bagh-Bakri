/**
 * sound.js
 * ----------------------------------------------------------------
 * Two short sound effects, synthesized with the Web Audio API so the
 * game needs no external audio files:
 *   - playMove()     a soft, single tap - for an ordinary step
 *   - playCapture()  a sharper two-tone thud - for a goti being cut
 *
 * The AudioContext is created lazily on the first call (browsers
 * require a user gesture before audio can play), and every call
 * after that reuses the same context.
 */
window.BB = window.BB || {};

(function (BB) {
  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null; // very old browser - sounds just won't play
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Plays a single tone: frequency in Hz, duration in seconds, an
  // oscillator waveform, an optional start delay (seconds from now),
  // and a peak volume from 0-1. Uses a quick fade in/out envelope so
  // it doesn't click.
  function tone(freq, duration, type, delay, peakVolume) {
    const c = ensureCtx();
    if (!c) return;
    const start = c.currentTime + (delay || 0);

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakVolume || 0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function playMove() {
    if (!enabled) return;
    // A single soft, short tap.
    tone(520, 0.09, 'sine', 0, 0.22);
  }

  function playCapture() {
    if (!enabled) return;
    // A sharper, two-tone "cut" - lower and a touch louder than a move,
    // so it reads as more consequential.
    tone(300, 0.1, 'triangle', 0, 0.32);
    tone(170, 0.16, 'triangle', 0.06, 0.32);
  }

  function playWin() {
    if (!enabled) return;
    // A short rising flourish for the win/draw screen.
    tone(440, 0.12, 'sine', 0, 0.25);
    tone(550, 0.12, 'sine', 0.1, 0.25);
    tone(660, 0.18, 'sine', 0.2, 0.28);
  }

  // Synthesized applause: short filtered noise bursts fired with
  // randomized timing/pitch to approximate a crowd clapping. Used
  // only for an outright win (not a draw).
  let clapBuffer = null;
  function getClapBuffer(c) {
    if (clapBuffer) return clapBuffer;
    const len = Math.floor(c.sampleRate * 0.25);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    clapBuffer = buf;
    return buf;
  }
  function playSingleClap(c, delay, gainPeak, freq) {
    const src = c.createBufferSource();
    src.buffer = getClapBuffer(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.1;
    const gain = c.createGain();
    const start = c.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
    src.connect(bp); bp.connect(gain); gain.connect(c.destination);
    src.start(start);
    src.stop(start + 0.2);
  }
  function playClap() {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c) return;
    for (let i = 0; i < 26; i++) {
      playSingleClap(c, Math.random() * 1.6, 0.18 + Math.random() * 0.15, 1000 + Math.random() * 2500);
    }
  }

  function setEnabled(value) {
    enabled = value;
    if (enabled) ensureCtx(); // unlock audio on the gesture that re-enabled it
  }

  function isEnabled() {
    return enabled;
  }

  // Call this from any user click to unlock the AudioContext under
  // browser autoplay rules, even before the first real move sound.
  function unlock() {
    ensureCtx();
  }

  BB.sound = { playMove, playCapture, playWin, playClap, setEnabled, isEnabled, unlock };
})(window.BB);
