/* =============================================================================
   ÁUDIO — tudo sintetizado em WebAudio (sem arquivos externos).
   Música de suspense em camadas que reagem ao cronômetro + SFX de cena.
   ========================================================================== */

let ctx = null, master = null, musicBus = null, sfxBus = null, ambBus = null;
let started = false;
const state = {
  music: 0.6, sfx: 0.8, muted: false,
  tension: 0,          // 0..1 — cresce com o tempo
  intensityTarget: 0,
  noiseBuf: null
};

/* ---------------------------------------------------------------- utils */
function makeNoise(seconds = 2) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
function now() { return ctx.currentTime; }
function env(node, t0, a, d, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  node.connect(g);
  return g;
}
function osc(type, freq, t0, dur, gain, dest, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest || sfxBus);
  o.start(t0); o.stop(t0 + dur + 0.05);
  return o;
}
function noise(t0, dur, filterType, freq, gain, q = 1, dest) {
  const s = ctx.createBufferSource();
  s.buffer = state.noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filterType; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(dest || sfxBus);
  s.start(t0); s.stop(t0 + dur + 0.05);
  return { src: s, filter: f, gain: g };
}

/* ---------------------------------------------------------------- init */
export function initAudio() {
  if (started) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 6; comp.attack.value = 0.005; comp.release.value = 0.25;
  comp.connect(master);

  musicBus = ctx.createGain(); musicBus.gain.value = state.music; musicBus.connect(comp);
  sfxBus = ctx.createGain(); sfxBus.gain.value = state.sfx; sfxBus.connect(comp);
  ambBus = ctx.createGain(); ambBus.gain.value = 0.5; ambBus.connect(comp);

  state.noiseBuf = makeNoise(3);
  startAmbience();
  startMusic();
  started = true;
}
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

/* ------------------------------------------------------------- ambience */
let ambNodes = null;
function startAmbience() {
  // vento/chuva: ruído filtrado com LFO
  const s = ctx.createBufferSource(); s.buffer = state.noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.7;
  const g = ctx.createGain(); g.gain.value = 0.10;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
  const lfoG = ctx.createGain(); lfoG.gain.value = 240;
  lfo.connect(lfoG); lfoG.connect(f.frequency);
  s.connect(f); f.connect(g); g.connect(ambBus);
  s.start(); lfo.start();

  // drone grave
  const d1 = ctx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 48;
  const d2 = ctx.createOscillator(); d2.type = 'sine'; d2.frequency.value = 55.5;
  const dg = ctx.createGain(); dg.gain.value = 0.055;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
  d1.connect(dg); d2.connect(dg); dg.connect(lp); lp.connect(ambBus);
  d1.start(); d2.start();

  ambNodes = { rainGain: g, droneGain: dg, lp };
}

/* ---------------------------------------------------------------- música */
const SCALE = [0, 3, 5, 7, 10]; // menor
const ROOT = 55; // A1
let musicTimer = null, step = 0, nextNoteTime = 0;

function noteFreq(semi) { return 440 * Math.pow(2, (semi - 69) / 12); }

function startMusic() {
  nextNoteTime = now() + 0.2;
  musicTimer = setInterval(scheduler, 60);
}
function scheduler() {
  if (!ctx) return;
  const t = state.tension;
  const stepDur = 0.42 - 0.16 * t; // fica mais rápido
  while (nextNoteTime < now() + 0.4) {
    playStep(step, nextNoteTime, t);
    nextNoteTime += stepDur;
    step = (step + 1) % 32;
  }
}
function playStep(s, t0, tension) {
  const bar = Math.floor(s / 8);

  // ---- baixo / pulso grave
  if (s % 8 === 0) {
    const f = noteFreq(ROOT + 12 + SCALE[bar % SCALE.length]);
    osc('sine', f, t0, 1.6, 0.10 + 0.05 * tension, musicBus);
    osc('triangle', f * 2, t0, 0.6, 0.025, musicBus);
  }
  // ---- pad (acorde sustentado)
  if (s % 16 === 0) {
    const base = ROOT + 24 + SCALE[bar % SCALE.length];
    [0, 3, 7].forEach((iv, i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = noteFreq(base + iv); o.detune.value = (i - 1) * 7;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(300 + 900 * tension, t0);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.022 + 0.02 * tension, t0 + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
      o.connect(f); f.connect(g); g.connect(musicBus);
      o.start(t0); o.stop(t0 + 3.4);
    });
  }
  // ---- arpejo (entra com a tensão)
  if (tension > 0.18 && s % 2 === 0) {
    const seq = [0, 7, 3, 10, 5, 12, 3, 7];
    const n = seq[(s / 2) % seq.length] + SCALE[bar % SCALE.length] + ROOT + 36;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = noteFreq(n);
    const g = ctx.createGain();
    const amp = 0.02 + 0.045 * tension;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    o.connect(g); g.connect(musicBus);
    o.start(t0); o.stop(t0 + 0.6);
  }
  // ---- batimento cardíaco (tensão alta)
  if (tension > 0.55 && s % 8 === 0) {
    const bpm = 0.30 - 0.10 * tension;
    heartAt(t0, 0.10 + 0.16 * tension, musicBus);
    heartAt(t0 + bpm, 0.06 + 0.10 * tension, musicBus);
  }
  // ---- estalos de corda (tensão muito alta)
  if (tension > 0.75 && s % 4 === 2) {
    noise(t0, 0.12, 'highpass', 3200, 0.02 + 0.03 * tension, 1, musicBus);
  }
}
function heartAt(t0, gain, dest) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(78, t0);
  o.frequency.exponentialRampToValueAtTime(38, t0 + 0.14);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
  o.connect(g); g.connect(dest || sfxBus);
  o.start(t0); o.stop(t0 + 0.3);
}

/* ------------------------------------------------------------------ SFX */
const SFX = {
  click:    t => { noise(t, 0.05, 'highpass', 2400, 0.16); osc('square', 900, t, 0.03, 0.04); },
  hover:    t => { osc('sine', 620, t, 0.05, 0.03); },
  drawer:   t => { const n = noise(t, 0.42, 'bandpass', 700, 0.20, 1.4); n.filter.frequency.linearRampToValueAtTime(320, t + 0.4); noise(t + 0.42, 0.06, 'lowpass', 500, 0.22); },
  creak:    t => { const o = ctx.createOscillator(); o.type = 'sawtooth';
                   o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(92, t + 0.7);
                   const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 620; f.Q.value = 6;
                   const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
                   g.gain.exponentialRampToValueAtTime(0.11, t + 0.12);
                   g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
                   o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.8); },
  paper:    t => { for (let i = 0; i < 4; i++) noise(t + i * 0.045, 0.09, 'highpass', 2600 + Math.random() * 1800, 0.10); },
  metal:    t => { osc('square', 1400, t, 0.08, 0.06); osc('square', 2100, t + 0.02, 0.1, 0.04); noise(t, 0.16, 'bandpass', 3600, 0.14, 3); },
  stone:    t => { noise(t, 0.24, 'lowpass', 900, 0.24); osc('sine', 120, t, 0.2, 0.10); },
  lock:     t => { osc('square', 420, t, 0.05, 0.07); osc('square', 300, t + 0.09, 0.09, 0.08); noise(t + 0.09, 0.12, 'bandpass', 1200, 0.16, 2); },
  switch:   t => { osc('square', 1200, t, 0.03, 0.05); noise(t, 0.05, 'highpass', 3000, 0.10); },
  beep:     t => { osc('square', 880, t, 0.09, 0.05); },
  error:    t => { osc('sawtooth', 160, t, 0.22, 0.07); osc('sawtooth', 120, t + 0.1, 0.26, 0.06); },
  chime:    t => { [660, 880, 1320].forEach((f, i) => osc('sine', f, t + i * 0.07, 0.9 - i * 0.15, 0.06)); },
  tick:     t => { osc('square', 2400, t, 0.02, 0.03); noise(t, 0.03, 'highpass', 4000, 0.06); },
  thunder:  t => { const n = noise(t, 2.4, 'lowpass', 420, 0.30, 0.8);
                   n.filter.frequency.exponentialRampToValueAtTime(90, t + 2.2);
                   osc('sine', 42, t + 0.05, 1.8, 0.14); },
  blackout: t => { osc('sine', 300, t, 0.5, 0.10); osc('sine', 60, t + 0.1, 1.2, 0.14);
                   const n = noise(t, 0.5, 'lowpass', 800, 0.2); n.filter.frequency.exponentialRampToValueAtTime(120, t + 0.5); },
  phone:    t => { for (let i = 0; i < 5; i++) { osc('sine', 1050, t + i * 0.9, 0.28, 0.05); osc('sine', 1400, t + i * 0.9 + 0.02, 0.26, 0.04); } },
  record:   t => { const n = noise(t, 2.2, 'highpass', 1800, 0.06, 1);
                   for (let i = 0; i < 6; i++) osc('sine', 180 + Math.random() * 120, t + i * 0.32, 0.2, 0.03); },
  radio:    t => { const n = noise(t, 1.2, 'bandpass', 1400, 0.05, 4);
                   for (let i = 0; i < 22; i++) osc('sawtooth', 300 + Math.random() * 900, t + i * 0.05, 0.04, 0.012); },
  steps:    t => { for (let i = 0; i < 6; i++) noise(t + i * 0.36, 0.16, 'lowpass', 700, 0.13); },
  water:    t => { const n = noise(t, 0.5, 'bandpass', 1800, 0.07, 2); n.filter.frequency.linearRampToValueAtTime(900, t + 0.5); },
  ember:    t => { noise(t, 0.6, 'highpass', 2200, 0.09); osc('sine', 90, t, 0.4, 0.05); },
  drag:     t => { const n = noise(t, 0.9, 'lowpass', 600, 0.20); n.filter.frequency.linearRampToValueAtTime(240, t + 0.9); },
  talk:     t => { osc('sine', 420, t, 0.05, 0.03); osc('sine', 380, t + 0.06, 0.05, 0.022); },
  lights:   t => { osc('square', 60, t, 0.5, 0.08); noise(t, 0.3, 'bandpass', 2400, 0.09, 2);
                   setTimeout(() => started && SFX.tick(now()), 160); },
  heart:    t => { heartAt(t, 0.24); heartAt(t + 0.28, 0.16); },
  flash:    t => { noise(t, 0.2, 'highpass', 5000, 0.07); osc('sine', 1600, t, 0.12, 0.03); },
  door:     t => { SFX.creak(t); noise(t + 0.3, 0.2, 'lowpass', 400, 0.18); },
  thud:     t => { osc('sine', 90, t, 0.24, 0.16); noise(t, 0.18, 'lowpass', 500, 0.16);
                   osc('sine', 140, t + 0.01, 0.12, 0.07); },
  /* novos (Casos de Familia) */
  stamp:    t => { noise(t, 0.09, 'lowpass', 700, 0.30); osc('sine', 110, t, 0.16, 0.12);
                   osc('sine', 84, t + 0.02, 0.22, 0.08); noise(t + 0.05, 0.14, 'highpass', 2200, 0.08); },
  blip:     t => { osc('sine', 1180, t, 0.07, 0.05); osc('sine', 1560, t + 0.05, 0.07, 0.035); },
  vote:     t => { osc('square', 520, t, 0.05, 0.05); osc('square', 700, t + 0.07, 0.09, 0.05);
                   noise(t, 0.06, 'bandpass', 1600, 0.10, 2); },
  wind:     t => { const n = noise(t, 1.6, 'bandpass', 700, 0.10, 0.6); n.filter.frequency.linearRampToValueAtTime(300, t + 1.5); },

  /* assassinato, corpos e reunião */
  kill:     t => { osc('sawtooth', 220, t, 0.18, 0.10); osc('sawtooth', 90, t + 0.04, 0.42, 0.12);
                   noise(t, 0.30, 'lowpass', 900, 0.24); osc('sine', 58, t + 0.16, 0.7, 0.10); },
  body:     t => { osc('sine', 140, t, 0.30, 0.10); osc('sine', 96, t + 0.10, 0.5, 0.09);
                   noise(t + 0.02, 0.22, 'lowpass', 420, 0.16); },
  meeting:  t => { osc('square', 660, t, 0.10, 0.07); osc('square', 880, t + 0.13, 0.10, 0.07);
                   osc('square', 660, t + 0.26, 0.16, 0.07); noise(t, 0.05, 'highpass', 2600, 0.05); },
  gavel:    t => { noise(t, 0.07, 'lowpass', 900, 0.34); osc('sine', 150, t, 0.20, 0.16);
                   osc('sine', 92, t + 0.03, 0.34, 0.10); noise(t + 0.09, 0.16, 'bandpass', 1800, 0.10, 2); },
  ghost:    t => { osc('sine', 420, t, 0.9, 0.05); osc('sine', 630, t + 0.08, 0.8, 0.035);
                   const n = noise(t, 1.0, 'bandpass', 900, 0.05, 0.5); n.filter.frequency.linearRampToValueAtTime(320, t + 0.9); },
  panel:    t => { osc('square', 1200, t, 0.03, 0.05); osc('square', 700, t + 0.05, 0.05, 0.05);
                   noise(t + 0.05, 0.10, 'highpass', 3000, 0.07); }
};

export function playSfx(id, vol = 1) {
  if (!started || state.muted) return;
  resumeAudio();
  const fn = SFX[id];
  if (!fn) return;
  try { fn(now() + 0.01, vol); } catch (e) {}
}

export function setTension(t) {
  state.tension = Math.max(0, Math.min(1, t));
  if (ambNodes) {
    ambNodes.rainGain.gain.value = 0.10 + 0.18 * state.tension;
    ambNodes.lp.frequency.value = 220 + 260 * state.tension;
  }
}
export function setVolumes({ music, sfx }) {
  if (music !== undefined) { state.music = music; if (musicBus) musicBus.gain.value = muted() ? 0 : music; }
  if (sfx !== undefined) { state.sfx = sfx; if (sfxBus) sfxBus.gain.value = muted() ? 0 : sfx; }
}
export function toggleMute() {
  state.muted = !state.muted;
  if (master) master.gain.value = state.muted ? 0 : 0.9;
  return state.muted;
}
export function muted() { return state.muted; }
export function debug() {
  return { started, ctx: ctx ? ctx.state : null, tension: state.tension, muted: state.muted, music: state.music, sfx: state.sfx };
}
export function sfxList() { return Object.keys(SFX); }

export function duckMusic(amount = 0.35, ms = 900) {
  if (!started || !musicBus) return;
  const g = musicBus.gain;
  const target = state.muted ? 0 : state.music;
  g.cancelScheduledValues(now());
  g.setValueAtTime(g.value, now());
  g.linearRampToValueAtTime(target * amount, now() + 0.12);
  g.linearRampToValueAtTime(target, now() + ms / 1000);
}
