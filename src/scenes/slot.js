'use strict';

const MACH_X = 90;
const MACH_Y = 18;
const REEL_X = [136, 208, 280];
const WIN_Y = 88;
const PAY_Y = WIN_Y + WIN_H / 2;
const VMAX = 17;
const BULB_COLS = ['#ffe066', '#ff5a3a', '#ffffff'];
const LEVER_X = 392;
const LEVER_Y = 150;

function weightedSymbol() {
  const total = SYMBOLS.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= SYMBOLS[i].weight;
    if (r <= 0) return i;
  }
  return SYMBOLS.length - 1;
}

function decideOutcome() {
  const q = new URLSearchParams(location.search);
  const force = Game.force || q.get('force');
  const chance = parseFloat(q.get('win') ?? '0.4');
  const win = force ? force === 'win' : Math.random() < chance;
  const a = weightedSymbol();
  if (win) return { win: true, syms: [a, a, a] };
  let b;
  if (Math.random() < 0.55) {
    do b = randi(0, SYMBOLS.length - 1);
    while (b === a);
    return { win: false, syms: [a, a, b], near: true };
  }
  let c;
  do {
    b = randi(0, SYMBOLS.length - 1);
    c = randi(0, SYMBOLS.length - 1);
  } while (b === a);
  return { win: false, syms: [a, b, c] };
}

class Reel {
  constructor(i) {
    this.i = i;
    const base = [0, 1, 2, 3, 4, 5, 6, 2, 3, 4, 5, 6];
    for (let k = base.length - 1; k > 0; k--) {
      const j = randi(0, k);
      [base[k], base[j]] = [base[j], base[k]];
    }
    this.strip = base;
    this.c = makeCanvas(REEL_W, STRIP_N * CELL);
    for (let k = 0; k < STRIP_N; k++) this.drawCell(k);
    this.p = randi(0, STRIP_N - 1);
    this.v = 0;
    this.targetV = VMAX;
    this.state = 'idle';
    this.flash = 0;
    this.bt = 9;
    this.lastCell = Math.floor(this.p);
    this.onLand = null;
    this.onTick = null;
  }
  drawCell(k) {
    const x = this.c.ctx;
    x.drawImage(SPR.cellBg, 0, k * CELL);
    x.drawImage(SYMBOLS[this.strip[k]].img, 12, k * CELL + 4);
  }
  start(delay) {
    this.state = 'wait';
    this.wait = delay;
    this.targetV = VMAX;
  }
  requestStop(sym, near) {
    const pT = Math.round(this.p + 4);
    const L = mod(-pT, STRIP_N);
    this.strip[L] = sym;
    this.drawCell(L);
    if (near != null) {
      const up = mod(L - 1, STRIP_N);
      this.strip[up] = near;
      this.drawCell(up);
    }
    this.p0 = this.p;
    this.pT = pT;
    this.dur = Math.max(0.3, (3 * (pT - this.p)) / Math.max(1, this.v));
    this.st = 0;
    this.state = 'stopping';
    this.result = sym;
  }
  update(dt) {
    switch (this.state) {
      case 'wait':
        this.wait -= dt;
        if (this.wait <= 0) {
          this.state = 'wind';
          this.st = 0;
        }
        break;
      case 'wind':
        this.st += dt;
        this.v = -2.2 * Math.sin((Math.PI * this.st) / 0.16);
        this.p += this.v * dt;
        if (this.st >= 0.16) {
          this.state = 'spin';
          this.v = 0;
        }
        break;
      case 'spin':
        this.v = this.v < this.targetV ? Math.min(this.targetV, this.v + dt * 45) : damp(this.v, this.targetV, 2.5, dt);
        this.p += this.v * dt;
        break;
      case 'stopping': {
        this.st += dt;
        const u = Math.min(1, this.st / this.dur);
        const np = this.p0 + (this.pT - this.p0) * Ease.outCubic(u);
        this.v = (np - this.p) / Math.max(dt, 1e-4);
        this.p = np;
        if (u >= 1) {
          this.p = this.pT;
          this.v = 0;
          this.state = 'stopped';
          this.bt = 0;
          this.flash = 1;
          if (this.onLand) this.onLand(this);
        }
        break;
      }
      default:
        this.bt += dt;
    }
    this.flash = Math.max(0, this.flash - dt * 3);
    const cell = Math.floor(this.p);
    if (cell !== this.lastCell) {
      this.lastCell = cell;
      if (this.onTick) this.onTick(this);
    }
  }
  drawRows(ctx, x, y, pd) {
    const SH = STRIP_N * CELL;
    for (let r = 0; r < WIN_H; r++) {
      let sy = Math.floor((ROW_C[r] - pd) * CELL + CELL / 2) % SH;
      if (sy < 0) sy += SH;
      ctx.drawImage(this.c, 0, sy, REEL_W, 1, x, y + r, REEL_W, 1);
    }
  }
  draw(ctx, x, y) {
    const b = this.state === 'stopped' ? 0.16 * Math.sin(this.bt * 24) * Math.exp(-this.bt * 8) : 0;
    const pd = this.p + b;
    this.drawRows(ctx, x, y, pd);
    const blur = clamp((Math.abs(this.v) - 3) / 10, 0, 1);
    if (blur > 0) {
      ctx.globalAlpha = 0.4 * blur;
      this.drawRows(ctx, x, y, pd - this.v * 0.014);
      ctx.globalAlpha = 0.25 * blur;
      this.drawRows(ctx, x, y, pd - this.v * 0.028);
      ctx.globalAlpha = 1;
      if (blur > 0.5) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 4; i++) {
          const sx = x + ((i * 17 + this.i * 11) % REEL_W);
          const sy = y + mod(Math.floor(this.p * 90 + i * 37), WIN_H + 30) - 30;
          ctx.fillRect(sx, Math.max(y, sy), 1, Math.min(30, y + WIN_H - sy));
        }
      }
    }
    ctx.drawImage(SPR.reelShade, x, y);
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.7;
      ctx.fillStyle = '#fff0c0';
      ctx.fillRect(x, y, REEL_W, WIN_H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

function buildSunsetBg() {
  const bw = W + 80;
  const bh = 300;
  const c = makeCanvas(bw, bh);
  const x = c.ctx;
  paintGradient(x, 0, 0, bw, 192, ['#140a34', '#2a1050', '#4e1660', '#842060', '#c83a58', '#f26a4a', '#ffa044', '#ffd070']);
  for (let i = 0; i < 60; i++) {
    x.fillStyle = Math.random() < 0.3 ? '#ffffff' : '#b0a0e0';
    x.fillRect(randi(0, bw), randi(0, 70), 1, 1);
  }
  const sx = bw / 2;
  const sy = 192;
  const sun = ['#fff8d0', '#ffe890', '#ffc850', '#ff9a3a'];
  for (let r = 44; r >= 30; r -= 4) {
    x.fillStyle = dither(x, sun[3], 4);
    pxDisc(x, sx, sy, r + 12);
  }
  for (let r = 0; r < 4; r++) {
    x.fillStyle = sun[3 - r];
    pxDisc(x, sx, sy, 40 - r * 7);
  }
  x.fillStyle = '#ff7a3a';
  for (let y = 160; y < 192; y += 6) x.fillRect(sx - 44, y + ((y / 6) % 2), 88, 2 + ((y - 160) / 12) | 0);
  paintGradient(x, 0, 192, bw, bh - 192, ['#7a2a4a', '#4a1c48', '#2a1440', '#140c2c']);
  return c;
}

function buildDeck() {
  const c = makeCanvas(W, 40);
  const x = c.ctx;
  const vx = 240;
  const R = ['#2e150f', '#552818', '#84462a', '#9a5632', '#b3683a'];
  for (let y = 0; y < 40; y++) {
    const t = (y + 8) / 48;
    for (let p = -16; p <= 16; p++) {
      const x0 = Math.round(vx + (p - 0.5) * 34 * t);
      const x1 = Math.round(vx + (p + 0.5) * 34 * t);
      x.fillStyle = rampPick(R, (p & 1 ? 0.45 : 0.62) + y * 0.006 - Math.abs(p) * 0.012, p + 16, y, 0.4);
      x.fillRect(x0, y, x1 - x0, 1);
      x.fillStyle = R[0];
      x.fillRect(x0, y, 1, 1);
    }
    if ((y + 3) % 11 === 0) {
      x.fillStyle = R[1];
      x.fillRect(0, y, W, 1);
    }
  }
  return c;
}

class SlotScene {
  enter() {
    clearFx();
    resetFx();
    Music.stop();
    fx.vig = 0.45;
    fx.heat = 0;
    fx.threshold = 0.8;
    fx.bloom1 = 0.6;
    fx.bloom2 = 0.5;
    this.bg = buildSunsetBg();
    this.deck = buildDeck();
    this.rays = new Rays(240, 192);
    this.reels = [0, 1, 2].map((i) => new Reel(i));
    this.reels.forEach((r) => {
      r.onLand = (reel) => this.reelLanded(reel);
      r.onTick = () => this.tick();
    });
    this.torches = [0, 1].map(() => {
      const f = new Fire(28, 64, FIRE_PAL.classic);
      f.decay = 0.62;
      f.tongues = 4;
      f.setMask((u) => Math.pow(Math.sin(Math.PI * u), 0.6));
      return f;
    });
    this.clouds = [
      { s: SPR.cloudSunset[0], x: 40, y: 60, v: 3 },
      { s: SPR.cloudSunset[2], x: 300, y: 32, v: 2 },
      { s: SPR.cloudSunset[1], x: 480, y: 100, v: 4 },
    ];
    this.birds = Array.from({ length: 4 }, (_, i) => ({ x: rand(-200, W), y: rand(30, 90), v: rand(14, 24), p: i }));
    this.phase = 'drop';
    this.my = -280;
    this.lever = 0;
    this.bulbMode = 'off';
    this.boot = 0;
    this.neon = 0;
    this.idleT = 0;
    this.lastTick = 0;
    this.camT = { x: 0, zoom: 1, rot: 0 };
    this.tension = 0;
    this.tensionOn = false;
    this.dead = 0;
    this.result = null;
    this.rt = 0;
    this.st = 0;
    this.gray = 0;
    this.tl = new Timeline()
      .at(0.42, () => this.impact())
      .at(0.85, () => {
        Sound.power();
        this.bulbMode = 'boot';
      })
      .at(1.05, () => this.igniteTorches())
      .at(1.75, () => {
        this.phase = 'idle';
        this.idleT = 0;
        this.bulbMode = 'idle';
        Music.play(SONGS.slot);
      });
    Sound.whoosh(0.45);
  }

  impact() {
    shake(0.85);
    flash(0.45, [1, 0.85, 0.6], 3);
    kick(0.07);
    aberrate(1.4);
    shockwave(240, 252, 0.05, 0.9, 1.3);
    Sound.thud(1.3);
    Sound.boom();
    for (let x = 92; x <= 388; x += 5) {
      spawn({ x, y: 252, vx: (x - 240) * rand(0.6, 1.4), vy: rand(-50, -10), drag: 3, life: rand(0.7, 1.4), kind: K.SMOKE, ramp: RAMP.dust, size: 2, size2: rand(5, 9), layer: 1 });
    }
    burst(96, 250, 24, { speed: [80, 220], angle: -Math.PI * 0.75, spread: 0.6, life: [0.3, 0.8], kind: K.SPARK, ramp: RAMP.gold, g: 380, layer: 1 });
    burst(384, 250, 24, { speed: [80, 220], angle: -Math.PI * 0.25, spread: 0.6, life: [0.3, 0.8], kind: K.SPARK, ramp: RAMP.gold, g: 380, layer: 1 });
    addRing(240, 252, { speed: 380, life: 0.45, ramp: RAMP.dust, thick: 2, layer: 1 });
  }

  igniteTorches() {
    this.torches.forEach((f) => f.setSource(36));
    Sound.whoosh(0.4);
    for (const x of [40, 440]) burst(x, 186, 20, { speed: [40, 140], angle: -Math.PI / 2, spread: 0.8, life: [0.4, 0.9], kind: K.EMBER, ramp: RAMP.fire, size: 2, size2: 1, layer: 1 });
  }

  tick() {
    if (Game.time - this.lastTick > 0.05) {
      this.lastTick = Game.time;
      Sound.tick();
    }
  }

  spin() {
    this.phase = 'spin';
    this.st = 0;
    this.bulbMode = 'spin';
    Music.stop();
    Sound.lever();
    const o = decideOutcome();
    this.outcome = o;
    const tension = o.syms[0] === o.syms[1];
    this.stl = new Timeline()
      .at(0.18, () => {
        kick(0.04);
        shake(0.2);
        Sound.whoosh(0.4);
        this.reels.forEach((r, i) => r.start(i * 0.09));
      })
      .at(1.5, () => this.reels[0].requestStop(o.syms[0]))
      .at(2.15, () => this.reels[1].requestStop(o.syms[1]));
    if (!tension) this.stl.at(2.8, () => this.reels[2].requestStop(o.syms[2]));
    else {
      this.stl.at(2.55, () => this.startTension()).at(3.45, () => this.reels[2].requestStop(o.syms[2], o.near ? o.syms[0] : null));
    }
  }

  startTension() {
    this.tensionOn = true;
    this.reels[2].targetV = 5.2;
    this.camT = { x: 66, zoom: 1.32, rot: 0 };
    this.bulbMode = 'tension';
    this.nextBeat = 0;
    fx.aberrBase = 0.35;
    Sound.riser(2.8);
  }

  reelLanded(reel) {
    const i = reel.i;
    const cx = REEL_X[i] + REEL_W / 2;
    const big = i === 2 && this.tensionOn;
    Sound.thud(big ? 1.4 : 1);
    shake(big ? 0.55 : 0.3);
    kick(big ? 0.06 : 0.025);
    aberrate(big ? 1.4 : 0.6);
    addRing(cx, PAY_Y, { speed: 160, life: 0.35, ramp: RAMP.white, thick: 1, layer: 1 });
    burst(cx, WIN_Y, 14, { speed: [60, 180], angle: -Math.PI / 2, spread: 1.2, life: [0.25, 0.6], kind: K.SPARK, ramp: RAMP.gold, g: 300, layer: 1 });
    burst(cx, WIN_Y + WIN_H, 14, { speed: [60, 180], angle: Math.PI / 2, spread: 1.2, life: [0.25, 0.6], kind: K.SPARK, ramp: RAMP.gold, g: 300, layer: 1 });
    if (big) {
      shockwave(cx, PAY_Y, 0.04, 0.8, 1);
      this.tensionOn = false;
      this.camT = { x: 0, zoom: 1.04, rot: 0 };
      fx.aberrBase = 0;
    }
    if (this.reels.every((r) => r.state === 'stopped')) {
      this.phase = 'result';
      this.rt = 0;
      this.result = this.outcome;
      this.rtl = this.outcome.win ? this.winTimeline() : this.loseTimeline();
    }
  }

  winTimeline() {
    const sym = SYMBOLS[this.outcome.syms[0]];
    this.resultText = sym.id === 'hat' ? '¡¡PREMIO MAYOR!!' : '¡¡TESORO!!';
    this.resultStyle = sym.id === 'hat' ? Object.assign({}, ST.treasure, { id: 'treasure5', s: 5 }) : ST.treasure;
    return new Timeline()
      .at(0.15, () => {
        freeze(0.12);
        flash(1, [1, 0.95, 0.6], 2);
        shake(0.9);
        kick(0.12);
        aberrate(2.2);
        shockwave(240, PAY_Y, 0.08, 1, 1.5);
        Sound.boom();
        Sound.fanfare();
        this.bulbMode = 'win';
        this.torches.forEach((f) => (f.pal = FIRE_PAL.magic));
        this.camT = { x: 0, zoom: 1.06, rot: 0 };
        for (const x of REEL_X) addRing(x + 32, PAY_Y, { speed: 240, life: 0.6, ramp: RAMP.gold, thick: 2, layer: 1 });
        burst(240, PAY_Y, 80, { speed: [100, 320], life: [0.5, 1.1], kind: K.SPARK, ramp: RAMP.gold, drag: 1.5, g: 120, layer: 1 });
      })
      .at(0.5, () => rocket(rand(40, 120), rand(30, 70)))
      .at(0.8, () => rocket(rand(360, 440), rand(30, 70)))
      .at(1.2, () => rocket(rand(20, 100), rand(20, 60)))
      .at(1.5, () => rocket(rand(380, 460), rand(20, 60)))
      .at(1.9, () => rocket(rand(60, 140), rand(40, 80)))
      .at(2.2, () => rocket(rand(340, 420), rand(40, 80)))
      .at(2.75, () => {
        this.camT = { x: 0, zoom: 3.2, rot: 0.08 };
        Sound.whoosh(0.6);
        aberrate(2.5);
      })
      .at(3.0, () => goto(() => new WinScene(this.outcome), 'white', 0.7));
  }

  loseTimeline() {
    this.resultText = 'SIN SUERTE...';
    return new Timeline()
      .at(0.25, () => {
        Sound.wahwah();
        Sound.powerDown();
        this.bulbMode = 'lose';
        this.torches.forEach((f) => f.setSource(0));
        this.camT = { x: 0, zoom: 0.97, rot: -0.02 };
        shake(0.15);
      })
      .at(1.0, () => {
        shake(0.35);
        Sound.thud(0.8);
        burst(240, 40, 16, { speed: [20, 70], angle: -Math.PI / 2, spread: 0.8, life: [0.8, 1.6], kind: K.SMOKE, ramp: RAMP.smoke, size: 3, size2: 10, g: -15, drag: 1, layer: 1 });
      })
      .at(3.3, () => goto(() => new LoseScene(this.outcome), 'dither', 1.4));
  }

  key() {
    if (this.phase === 'idle') this.spin();
  }

  update(dt) {
    const t = this.t;
    this.tl.update(t);
    if (this.phase === 'drop') {
      this.my = t < 0.42 ? -280 * (1 - Ease.inQuad(t / 0.42)) : -Math.sin((t - 0.42) * 20) * Math.exp(-(t - 0.42) * 7) * 6;
      this.boot = seg(t, 0.85, 1.6) * SPR.bulbs.length;
      if (this.bulbMode === 'boot' && Math.floor(this.boot) % 8 === 0 && Math.floor(this.boot) !== this.lastBoot) {
        this.lastBoot = Math.floor(this.boot);
        Sound.blip();
      }
      this.neon = t < 1.15 ? 0 : t < 1.65 ? (Math.random() < 0.5 ? 1 : 0) : 1;
    } else {
      this.my = 0;
      this.neon = this.bulbMode === 'lose' ? (this.rt < 1.2 && Math.random() < 0.4 ? 1 : 0) : 1;
    }
    if (this.phase === 'idle') {
      this.idleT += dt;
      if (this.idleT > 15) this.spin();
    }
    if (this.phase === 'spin') {
      this.st += dt;
      this.stl.update(this.st);
      const s = this.st;
      this.lever = s < 0.25 ? Math.PI * 0.92 * Ease.inQuad(s / 0.25) : Math.PI * 0.92 * (1 - Ease.outBack(seg(s, 0.3, 0.8)));
    } else {
      this.lever = damp(this.lever, 0, 10, dt);
    }
    this.reels.forEach((r) => r.update(dt));
    if (this.tensionOn) {
      this.tension = Math.min(1, this.tension + dt * 2);
      this.nextBeat -= dt;
      if (this.nextBeat <= 0) {
        this.nextBeat = 0.52;
        Sound.heartbeat();
        kick(0.035);
        aberrate(0.9);
      }
      const x0 = REEL_X[2] - 2;
      const x1 = REEL_X[2] + REEL_W + 2;
      for (let i = 0; i < 5; i++) {
        const side = randi(0, 3);
        const x = side < 2 ? rand(x0, x1) : side === 2 ? x0 : x1;
        const y = side === 0 ? WIN_Y - 2 : side === 1 ? WIN_Y + WIN_H + 2 : rand(WIN_Y, WIN_Y + WIN_H);
        spawn({ x, y, vx: rand(-15, 15), vy: rand(-70, -20), life: rand(0.3, 0.7), kind: K.EMBER, ramp: RAMP.fire, size: 2, size2: 1, layer: 1 });
      }
    } else {
      this.tension = Math.max(0, this.tension - dt * 3);
    }
    if (this.phase === 'result') {
      this.rt += dt;
      this.rtl.update(this.rt);
      if (this.result.win && this.rt > 0.15 && this.rt < 2.6) {
        for (let i = 0; i < 3; i++) {
          spawn({ x: rand(200, 280), y: 222, vx: rand(-150, 150), vy: rand(-340, -180), g: 520, life: rand(1.2, 2), kind: K.COIN, spin: rand(0.6, 1.4), floor: 262, bounce: 0.45, layer: 1 });
        }
        if (Math.random() < 0.5) spawn({ x: rand(136, 344), y: rand(WIN_Y, WIN_Y + WIN_H), life: rand(0.3, 0.7), kind: K.STAR, color: pick(['#ffffff', '#fff4a8', '#ffd23f']), size: 3, layer: 1 });
      }
      if (!this.result.win) {
        this.gray = seg(this.rt, 0.25, 1.4);
        fx.sat = lerp(1, 0.45, seg(this.rt, 0.3, 2.5));
        const nd = Math.floor(seg(this.rt, 0.3, 1.8) * SPR.bulbs.length);
        if (nd > this.dead) {
          for (let k = this.dead; k < nd; k += 6) {
            const [bx, by] = SPR.bulbs[k];
            burst(MACH_X + bx, MACH_Y + by, 3, { speed: [20, 60], life: [0.2, 0.4], kind: K.SPARK, ramp: RAMP.gold, g: 200, layer: 1 });
          }
          if (Math.random() < 0.3) Sound.zap();
          this.dead = nd;
        }
        for (const tx of [40, 440]) {
          if (Math.random() < 0.25) spawn({ x: tx + rand(-6, 6), y: 184, vx: rand(-4, 4), vy: rand(-30, -14), life: rand(1, 2), kind: K.SMOKE, ramp: RAMP.smoke, size: 2, size2: 7, alpha: 0.7, sway: 8 });
        }
        if (Math.random() < 0.15) spawn({ x: rand(110, 370), y: rand(60, 80), vx: rand(-5, 5), vy: rand(-25, -10), life: rand(1, 2), kind: K.SMOKE, ramp: RAMP.smoke, size: 2, size2: 8, alpha: 0.6, layer: 1 });
      }
    }
    this.torches.forEach((f) => f.update(dt));
    for (const c of this.clouds) c.x += c.v * dt;
    for (const b of this.birds) b.x += b.v * dt;
    cam.x = damp(cam.x, this.camT.x, 4, dt);
    cam.zoom = damp(cam.zoom, this.camT.zoom, this.camT.zoom > 2 ? 6 : 4, dt);
    cam.rot = damp(cam.rot, this.camT.rot, 3, dt);
    if (this.phase === 'result' && this.result.win) {
      fx.threshold = 0.7;
      fx.bloom1 = 0.9;
    }
  }

  bulbColor(i, t) {
    switch (this.bulbMode) {
      case 'boot':
        return i < this.boot ? BULB_COLS[i % 3] : null;
      case 'idle':
        return (i + Math.floor(t * 7)) % 4 < 2 ? BULB_COLS[(i + Math.floor(t * 1.5)) % 3] : null;
      case 'spin': {
        const k = (i + Math.floor(t * 24)) % 3;
        return k === 0 ? '#ffffff' : k === 1 ? '#ffd23f' : null;
      }
      case 'tension':
        return Math.floor(t * 3.8) % 2 === 0 ? '#ff3a2a' : i % 2 ? '#ff9a3a' : null;
      case 'win':
        return (Math.floor(t * 14) + i) % 2 ? rainbow(i * 0.05 + t * 1.6) : '#ffffff';
      case 'lose':
        return i < this.dead ? null : Math.random() < 0.2 ? null : '#ffb03a';
      default:
        return null;
    }
  }

  drawBulbs(ctx, ox, oy) {
    const t = this.t;
    SPR.bulbs.forEach(([bx, by], i) => {
      const x = ox + bx;
      const y = oy + by;
      const c = this.bulbColor(i, t);
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillStyle = '#2a140e';
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = '#5a3424';
        ctx.fillRect(x - 1, y - 1, 1, 1);
      }
    });
  }

  drawLever(ctx, oy) {
    const a = this.lever;
    const px = LEVER_X;
    const py = LEVER_Y + oy;
    ctx.fillStyle = INK;
    ctx.fillRect(px - 7, py - 15, 13, 31);
    ctx.fillStyle = R_GOLD[1];
    ctx.fillRect(px - 6, py - 14, 11, 29);
    ctx.fillStyle = R_GOLD[3];
    ctx.fillRect(px - 6, py - 14, 9, 2);
    ctx.fillRect(px - 6, py - 14, 2, 27);
    const L = 62;
    const kx = px + Math.sin(a) * 6;
    const ky = py - Math.cos(a) * L;
    const sc = 1 + Math.sin(a) * 0.5;
    ctx.fillStyle = INK;
    pxLine(ctx, px, py, kx, ky, 5);
    ctx.fillStyle = R_STEEL[1];
    pxLine(ctx, px, py, kx, ky, 3);
    ctx.fillStyle = R_STEEL[3];
    pxLine(ctx, px - 1, py, kx - 1, ky, 1);
    const r = 6.5 * sc;
    ctx.fillStyle = INK;
    pxDisc(ctx, kx, ky, r + 1);
    ctx.fillStyle = R_RED[1];
    pxDisc(ctx, kx, ky, r);
    ctx.fillStyle = R_RED[2];
    pxDisc(ctx, kx - 1, ky - 1, r - 1.5);
    ctx.fillStyle = R_RED[3];
    pxDisc(ctx, kx - r * 0.3, ky - r * 0.3, r * 0.45);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(kx - r * 0.45), Math.round(ky - r * 0.45), 2, 2);
    ctx.fillStyle = INK;
    pxDisc(ctx, px, py, 5);
    ctx.fillStyle = R_GOLD[3];
    pxDisc(ctx, px, py, 4);
    ctx.fillStyle = R_GOLD[4];
    ctx.fillRect(px - 2, py - 2, 2, 2);
  }

  drawPayArrows(ctx, oy) {
    const t = this.t;
    const win = this.phase === 'result' && this.result.win;
    const c = win ? rainbow(t * 3) : this.tensionOn && Math.floor(t * 6) % 2 ? '#ffffff' : '#ff3a2a';
    const y = PAY_Y + oy;
    for (let i = 0; i < 7; i++) {
      const h = 7 - i;
      ctx.fillStyle = INK;
      ctx.fillRect(126 + i, y - h - 1, 1, h * 2 + 2);
      ctx.fillRect(353 - i, y - h - 1, 1, h * 2 + 2);
    }
    for (let i = 0; i < 6; i++) {
      const h = 6 - i;
      ctx.fillStyle = i < 2 ? c : mixHex(c, '#ffffff', 0.4);
      ctx.fillRect(127 + i, y - h, 1, h * 2);
      ctx.fillRect(352 - i, y - h, 1, h * 2);
    }
  }

  drawMarquee(ctx, oy) {
    const t = this.t;
    const st = this.neon ? ST.marquee : ST.marqueeOff;
    drawText(ctx, 'EL REY', 240, MACH_Y + 12 + oy, st, {
      align: 'center',
      fx: (i) => ({ y: this.neon && this.phase !== 'drop' ? Math.round(Math.sin(t * 4 - i * 0.7) * 1.2) : 0 }),
    });
    const bob = Math.round(Math.sin(t * 3) * 1.5);
    const sk = SYMBOLS[1].img;
    ctx.drawImage(sk, 128, MACH_Y + 1 + oy + bob);
    ctx.drawImage(sk, 312, MACH_Y + 1 + oy - bob);
  }

  drawResultOverlay(ctx, oy) {
    const t = this.t;
    const rt = this.rt;
    const r = this.result;
    if (r.win) {
      if (rt > 0.15) {
        for (let x = REEL_X[0]; x < REEL_X[2] + REEL_W; x += 2) {
          ctx.fillStyle = rainbow(x / 60 - t * 2);
          ctx.fillRect(x, PAY_Y + oy - 1, 2, 3);
        }
      }
      this.reels.forEach((reel, i) => {
        const k = Ease.outBack(seg(rt, 0.15 + i * 0.08, 0.45 + i * 0.08));
        if (k <= 0) return;
        const sym = SYMBOLS[reel.result];
        const sc = 1 + k;
        const s = Math.round(40 * sc);
        const cx = REEL_X[i] + REEL_W / 2;
        const cy = PAY_Y + oy + Math.sin(t * 6 + i * 1.3) * 3 * k;
        const img = rt < 0.6 && ((t * 24) | 0) % 2 ? sym.white : sym.img;
        ctx.drawImage(img, Math.round(cx - s / 2), Math.round(cy - s / 2), s, s);
      });
      if (rt > 0.3) {
        const k = seg(rt, 0.3, 0.55);
        drawText(ctx, this.resultText, 240, MACH_Y + 10 + oy, this.resultStyle, {
          align: 'center',
          fx: (i) => ({ sc: lerp(2.5, 1, Ease.outBack(k)), y: Math.round(Math.sin(t * 7 - i * 0.6) * 3) }),
        });
      }
    } else {
      if (rt > 1.0) {
        const k = seg(rt, 1.0, 1.6);
        drawText(ctx, this.resultText, 240, MACH_Y + 16 + oy - (1 - Ease.outBounce(k)) * 60, ST.loseSmall, {
          align: 'center',
          fx: (i) => ({ y: k >= 1 ? Math.round(Math.sin(t * 2 + i) * 1) : 0 }),
        });
      }
    }
  }

  drawBackground(ctx) {
    const t = this.t;
    const px = Math.round(-cam.x * 0.3);
    ctx.drawImage(this.bg, -40 + px, -12);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(this.rays.render(20, t * 0.02, u32c('#ffd890'), 0, 40, 300), px, -12);
    ctx.globalAlpha = 1;
    for (const c of this.clouds) {
      const x = Math.round(mod(c.x + 160, W + 320) - 160) + px;
      ctx.drawImage(c.s, x, c.y);
    }
    for (const b of this.birds) {
      const x = Math.round(mod(b.x + 40, W + 80) - 40) + px;
      ctx.drawImage(SPR.birdDark[((t * 6 + b.p) | 0) & 1], x, Math.round(b.y + Math.sin(t * 2 + b.p) * 3));
    }
    for (let i = 0; i < 24; i++) {
      const y = 184 + i * 2;
      const spread = 20 + i * 5;
      const w = Math.round(4 + Math.abs(Math.sin(t * 2.5 + i * 1.9)) * 12);
      const x = Math.round(240 + Math.sin(i * 12.9898 + Math.floor(t * 3 + i) * 0.7) * spread) + px;
      ctx.fillStyle = i % 3 === 0 ? '#ffe890' : '#ff9a5a';
      ctx.fillRect(x - (w >> 1), y, w, 1);
    }
  }

  draw(ctx) {
    const t = this.t;
    this.drawBackground(ctx);
    const ox = -Math.round(cam.x);
    ctx.save();
    ctx.translate(ox, 0);
    drawParticles(ctx, 0);
    ctx.drawImage(this.deck, -ox, 230);
    ditherRect(ctx, 84, 250, 312, 6, '#140608', 10);
    for (const [i, x] of [
      [0, 26],
      [1, 426],
    ]) {
      ctx.drawImage(this.torches[i].render(), x, 124);
      ctx.drawImage(SPR.torch, x - 1, 186);
    }
    const my = Math.round(this.my);
    ctx.drawImage(SPR.machine, MACH_X, MACH_Y + my);
    this.reels.forEach((r, i) => r.draw(ctx, REEL_X[i], WIN_Y + my));
    if (this.gray > 0) {
      ctx.fillStyle = `rgba(22,26,38,${(this.gray * 0.6).toFixed(3)})`;
      ctx.fillRect(REEL_X[0], WIN_Y + my, 208, WIN_H);
    }
    if (this.tension > 0) {
      ctx.fillStyle = `rgba(6,2,12,${(this.tension * 0.55).toFixed(3)})`;
      ctx.fillRect(REEL_X[0], WIN_Y + my, 136, WIN_H);
      const c = Math.floor(t * 8) % 2 ? '#ffd23f' : '#ff3a2a';
      ctx.fillStyle = c;
      const x0 = REEL_X[2] - 1;
      ctx.fillRect(x0, WIN_Y - 1, REEL_W + 2, 2);
      ctx.fillRect(x0, WIN_Y + WIN_H - 1, REEL_W + 2, 2);
      ctx.fillRect(x0, WIN_Y, 2, WIN_H);
      ctx.fillRect(x0 + REEL_W, WIN_Y, 2, WIN_H);
    }
    ctx.drawImage(SPR.pillar, 200, WIN_Y + my);
    ctx.drawImage(SPR.pillar, 272, WIN_Y + my);
    ctx.drawImage(SPR.glass, REEL_X[0], WIN_Y + my);
    this.drawPayArrows(ctx, my);
    this.drawMarquee(ctx, my);
    this.drawBulbs(ctx, MACH_X, MACH_Y + my);
    this.drawLever(ctx, my);
    if (this.phase === 'result') this.drawResultOverlay(ctx, my);
    drawParticles(ctx, 1);
    drawRings(ctx, 1);
    drawRings(ctx, 0);
    ctx.restore();
    if (this.phase === 'idle' && this.idleT > 0.2) {
      const on = ((t * 2.2) | 0) % 2 === 0;
      drawText(ctx, 'PRESIONA UNA TECLA PARA GIRAR', 240, 254, on ? ST.promptGold : ST.prompt, {
        align: 'center',
        fx: (i) => ({ y: Math.round(Math.sin(t * 5 - i * 0.35) * 1.5) }),
      });
    }
  }
}
