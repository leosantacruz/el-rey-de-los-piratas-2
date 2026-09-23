'use strict';

const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

const Sound = {
  ctx: null,
  out: null,
  muted: false,
  noiseBuf: null,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 5;
      this.out = this.ctx.createGain();
      this.out.gain.value = this.muted ? 0 : 0.5;
      this.out.connect(comp);
      comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (Music.pending) {
      const s = Music.pending;
      Music.pending = null;
      Music.play(s);
    }
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.out) this.out.gain.value = this.muted ? 0 : 0.5;
  },
  tone(f, dur, o = {}) {
    const c = this.ctx;
    if (!c) return;
    const t = o.at ?? c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.slide ?? dur));
    if (o.vib) {
      const l = c.createOscillator();
      l.frequency.value = o.vibRate || 6;
      const lg = c.createGain();
      lg.gain.value = f * o.vib;
      l.connect(lg);
      lg.connect(osc.frequency);
      l.start(t);
      l.stop(t + dur + 0.1);
    }
    const g = c.createGain();
    const v = o.vol ?? 0.15;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    if (o.sustain) g.gain.setValueAtTime(v, t + dur * o.sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.lp;
      osc.connect(fl);
      node = fl;
    }
    node.connect(g);
    g.connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },
  noise(dur, o = {}) {
    const c = this.ctx;
    if (!c) return;
    const t = o.at ?? c.currentTime + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = o.type || 'lowpass';
    fl.frequency.setValueAtTime(o.f || 2000, t);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    fl.Q.value = o.q || 0.7;
    const g = c.createGain();
    const v = o.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(this.out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  },
  lever() {
    this.noise(0.22, { f: 2400, to: 300, vol: 0.25 });
    this.tone(260, 0.18, { type: 'square', to: 90, vol: 0.1 });
    this.tone(90, 0.35, { type: 'sine', vol: 0.45, to: 45, delay: 0.2 });
  },
  tick() {
    this.tone(1500 + Math.random() * 200, 0.025, { type: 'square', vol: 0.035 });
  },
  thud(big = 1) {
    this.tone(130, 0.35, { type: 'sine', to: 38, vol: 0.55 * big });
    this.noise(0.16, { f: 1100, to: 200, vol: 0.28 * big });
    this.tone(720, 0.07, { type: 'square', vol: 0.06, to: 340 });
  },
  boom() {
    this.tone(90, 1.3, { type: 'sine', to: 24, vol: 0.7 });
    this.noise(1.3, { f: 3200, to: 110, vol: 0.5 });
  },
  whoosh(d = 0.6) {
    this.noise(d, { type: 'bandpass', f: 280, to: 3200, q: 1.3, vol: 0.32, attack: d * 0.7 });
  },
  riser(d = 1.6) {
    this.tone(110, d, { type: 'sawtooth', to: 880, slide: d, vol: 0.06, lp: 1800, attack: d * 0.8 });
    this.noise(d, { type: 'bandpass', f: 400, to: 5000, q: 2, vol: 0.18, attack: d * 0.85 });
  },
  coin(i = 0) {
    const f = 988 * Math.pow(2, (i % 5) / 24);
    this.tone(f, 0.06, { type: 'square', vol: 0.05 });
    this.tone(f * 1.335, 0.16, { type: 'square', vol: 0.05, delay: 0.05 });
  },
  sparkle() {
    for (let i = 0; i < 6; i++) this.tone(1800 + Math.random() * 1600, 0.12, { type: 'triangle', vol: 0.05, delay: i * 0.04 });
  },
  heartbeat() {
    this.tone(62, 0.2, { type: 'sine', vol: 0.75, to: 40 });
    this.tone(58, 0.2, { type: 'sine', vol: 0.55, to: 38, delay: 0.17 });
  },
  thunder() {
    this.noise(0.25, { type: 'highpass', f: 1500, vol: 0.35 });
    this.noise(2.4, { f: 700, to: 55, vol: 0.75, attack: 0.03 });
    this.tone(48, 1.6, { type: 'sine', vol: 0.5, to: 28 });
  },
  zap() {
    this.noise(0.1, { type: 'highpass', f: 3000, vol: 0.12 });
    this.tone(1600, 0.09, { type: 'sawtooth', to: 200, vol: 0.05 });
  },
  power() {
    this.tone(55, 0.8, { type: 'sawtooth', to: 110, vol: 0.14, lp: 500, attack: 0.3 });
  },
  powerDown() {
    this.tone(180, 1.4, { type: 'sawtooth', to: 30, vol: 0.16, lp: 900 });
  },
  firework() {
    this.noise(0.6, { f: 2600, to: 300, vol: 0.2 });
    this.tone(180, 0.35, { type: 'sine', to: 50, vol: 0.25 });
  },
  launch() {
    this.noise(0.5, { type: 'bandpass', f: 800, to: 4000, q: 3, vol: 0.08, attack: 0.3 });
  },
  blip() {
    this.tone(880, 0.03, { type: 'square', vol: 0.03 });
  },
  chk() {
    this.noise(0.08, { type: 'bandpass', f: 1800, q: 1, vol: 0.2 });
    this.tone(200, 0.12, { type: 'sine', vol: 0.3, to: 70 });
  },
  splash() {
    this.noise(0.8, { f: 1800, to: 400, vol: 0.3 });
  },
  fanfare() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + 0.02;
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.tone(midiHz(n), 0.14, { type: 'square', vol: 0.09, at: t + i * 0.055 }));
    [84, 88, 91].forEach((n) => this.tone(midiHz(n), 1.3, { type: 'square', vol: 0.06, at: t + 0.42, vib: 0.012, sustain: 0.6 }));
    this.tone(midiHz(48), 1.3, { type: 'triangle', vol: 0.25, at: t + 0.42, sustain: 0.6 });
  },
  wahwah() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + 0.02;
    [55, 54, 53].forEach((n, i) => this.tone(midiHz(n), 0.42, { type: 'sawtooth', vol: 0.14, lp: 900, at: t + i * 0.45, attack: 0.04, sustain: 0.6 }));
    this.tone(midiHz(52), 1.6, { type: 'sawtooth', vol: 0.14, lp: 800, at: t + 1.35, vib: 0.03, vibRate: 5, attack: 0.05, sustain: 0.7 });
  },
};

const SONGS = {
  title: {
    bpm: 132,
    loop: true,
    leadType: 'square',
    leadVol: 0.055,
    bassVol: 0.16,
    drumVol: 1,
    lead: [
      69, -1, 72, 76, 74, 72, 71, 69, 71, -1, 67, 71, 74, -1, 72, 71, 69, -1, 72, 76, 81, 79, 77, 76, 74, 76, 72, 71, 69, -1, -1, 0,
      76, -1, 76, 77, 79, -1, 77, 76, 74, -1, 74, 76, 77, -1, 76, 74, 72, 74, 76, 72, 71, 72, 74, 71, 69, -1, 64, -1, 69, -1, -1, 0,
    ],
    roots: [45, 43, 41, 40, 48, 50, 40, 45],
    bassPat: [0, -99, 7, -99, 12, -99, 7, -99],
    drums: 'k.hks.h.',
  },
  slot: {
    bpm: 112,
    loop: true,
    leadType: 'triangle',
    leadVol: 0.07,
    bassVol: 0.14,
    drumVol: 0.6,
    lead: [69, 72, 76, 81, 76, 72, 69, 72, 65, 69, 72, 77, 72, 69, 65, 69, 67, 72, 76, 79, 76, 72, 67, 72, 67, 71, 74, 79, 74, 71, 67, 71],
    roots: [45, 41, 48, 43],
    bassPat: [0, -99, -99, 0, -99, -99, 12, -99],
    drums: 'k...s..h',
  },
  win: {
    bpm: 150,
    loop: true,
    leadType: 'square',
    leadVol: 0.06,
    bassVol: 0.17,
    drumVol: 1,
    lead: [72, -1, 72, 76, 79, -1, 76, 79, 84, -1, 83, 81, 79, -1, -1, 0, 77, -1, 77, 81, 84, -1, 81, 84, 86, 84, 83, 86, 84, -1, -1, 0],
    roots: [48, 48, 41, 43],
    bassPat: [0, -99, 12, -99, 0, -99, 12, -99],
    drums: 'k.hsk.hs',
  },
  lose: {
    bpm: 66,
    loop: true,
    leadType: 'triangle',
    leadVol: 0.1,
    bassVol: 0.16,
    drumVol: 0.5,
    lead: [62, -1, -1, 61, 60, -1, -1, -1, 58, -1, 57, -1, 55, -1, -1, -1, 57, -1, 58, -1, 57, -1, 53, -1, 50, -1, -1, -1, -1, -1, -1, 0],
    roots: [38, 34, 41, 38],
    bassPat: [0, -1, -1, -1, -1, -1, -1, -1],
    drums: 'k.......',
  },
};

const Music = {
  song: null,
  step: 0,
  next: 0,
  timer: null,
  pending: null,
  play(song) {
    this.stop();
    if (!Sound.ctx) {
      this.pending = song;
      return;
    }
    this.song = song;
    this.step = 0;
    this.next = Sound.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 25);
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    this.pending = null;
  },
  tick() {
    const s = this.song;
    const c = Sound.ctx;
    if (!s || !c) return;
    const sd = 60 / s.bpm / 2;
    while (this.next < c.currentTime + 0.12) {
      const i = this.step % s.lead.length;
      const t = this.next;
      const n = s.lead[i];
      if (n > 0) {
        let len = 1;
        while (s.lead[(i + len) % s.lead.length] === -1 && len < 8) len++;
        Sound.tone(midiHz(n), sd * len * 0.95, { type: s.leadType, vol: s.leadVol, at: t, sustain: 0.5 });
      }
      const bar = Math.floor(i / 8) % s.roots.length;
      const bp = s.bassPat[i % 8];
      if (bp > -90 && bp !== -1) {
        let len = 1;
        while (s.bassPat[(i + len) % 8] === -1 && len < 8 && (i % 8) + len < 8) len++;
        Sound.tone(midiHz(s.roots[bar] + bp), sd * len * 0.9, { type: 'triangle', vol: s.bassVol, at: t, sustain: 0.4 });
      }
      const d = s.drums[i % s.drums.length];
      if (d === 'k') Sound.tone(110, 0.16, { type: 'sine', to: 40, vol: 0.4 * s.drumVol, at: t });
      else if (d === 's') Sound.noise(0.12, { type: 'bandpass', f: 1800, q: 0.8, vol: 0.16 * s.drumVol, at: t });
      else if (d === 'h') Sound.noise(0.04, { type: 'highpass', f: 7000, vol: 0.06 * s.drumVol, at: t });
      this.step++;
      this.next += sd;
    }
  },
};
