'use strict';

const K = { SQ: 0, SPARK: 1, COIN: 2, STAR: 3, SMOKE: 4, PIX: 5, DROP: 6, BUBBLE: 7, EMBER: 8, ROCKET: 9, CONF: 10 };

const RAMP = {
  fire: ['#ffffff', '#fff6b0', '#ffd23f', '#ff9a1f', '#f0521c', '#b8202a', '#6a1024', '#2e0a1c'],
  gold: ['#ffffff', '#fff4a8', '#ffd23f', '#f2a826', '#c8701a', '#7e3e10'],
  magic: ['#ffffff', '#ffd6ff', '#ff7ad0', '#c46bff', '#7a3ad8', '#3a1a78'],
  cyan: ['#ffffff', '#c8fbff', '#5fe8ff', '#1fa8e0', '#1a5a9a', '#10284a'],
  green: ['#ffffff', '#e0ffb0', '#8ee06a', '#3fb84a', '#1f6e3a', '#0e3320'],
  red: ['#ffffff', '#ffd0c0', '#ff6a5a', '#e0202e', '#8e1424', '#4a0a1a'],
  ice: ['#ffffff', '#d8f4ff', '#8fd8ff', '#3fa0ff', '#2a5ad0', '#1a2a78'],
  smoke: ['#d9d3e3', '#a39bb3', '#756d88', '#4d4760', '#2e2a3c'],
  dust: ['#f0d8b0', '#c8a878', '#9a7a58', '#6a5040', '#3a2a24'],
  rain: ['#e6f2ff', '#a9c4e0', '#6f8db0', '#44607f'],
  white: ['#ffffff', '#f0f4ff', '#c8d4f0', '#8a9ac8', '#4a5a8a'],
};
const FIREWORK_RAMPS = [RAMP.fire, RAMP.gold, RAMP.magic, RAMP.cyan, RAMP.green, RAMP.red, RAMP.ice];

const rampAt = (ramp, t) => ramp[Math.min(ramp.length - 1, (t * ramp.length) | 0)];

const parts = [];
const pool = [];

function spawn(o) {
  const p = pool.pop() || {};
  p.x = o.x;
  p.y = o.y;
  p.vx = o.vx || 0;
  p.vy = o.vy || 0;
  p.g = o.g || 0;
  p.drag = o.drag || 0;
  p.life = p.max = o.life || 1;
  p.kind = o.kind || 0;
  p.ramp = o.ramp || RAMP.fire;
  p.color = o.color || null;
  p.size = o.size ?? 1;
  p.size2 = o.size2 ?? p.size;
  p.layer = o.layer || 0;
  p.sway = o.sway || 0;
  p.phase = Math.random() * TAU;
  p.spin = o.spin || 1;
  p.floor = o.floor ?? 1e9;
  p.bounce = o.bounce || 0;
  p.onDie = o.onDie || null;
  p.trail = o.trail || null;
  p.flicker = o.flicker || 0;
  p.alpha = o.alpha ?? 1;
  p.age = 0;
  parts.push(p);
  return p;
}

function burst(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    const a = (o.angle ?? -Math.PI / 2) + rand(-1, 1) * (o.spread ?? Math.PI);
    const s = rand(o.speed[0], o.speed[1]);
    spawn({
      x: x + rand(-(o.jx || 0), o.jx || 0),
      y: y + rand(-(o.jy || 0), o.jy || 0),
      vx: Math.cos(a) * s + (o.vx || 0),
      vy: Math.sin(a) * s + (o.vy || 0),
      life: rand(o.life[0], o.life[1]),
      kind: o.kind,
      ramp: o.ramp,
      color: o.colors ? pick(o.colors) : o.color,
      size: Array.isArray(o.size) ? randi(o.size[0], o.size[1]) : o.size,
      size2: o.size2,
      g: o.g,
      drag: o.drag,
      layer: o.layer,
      sway: o.sway,
      spin: o.spin ? rand(o.spin[0], o.spin[1]) : 1,
      floor: o.floor,
      bounce: o.bounce,
      flicker: o.flicker,
      alpha: o.alpha,
    });
  }
}

const rings = [];
function addRing(x, y, o = {}) {
  rings.push({
    x,
    y,
    r: o.r0 || 2,
    vr: o.speed || 200,
    life: o.life || 0.5,
    max: o.life || 0.5,
    ramp: o.ramp || RAMP.white,
    thick: o.thick || 1,
    layer: o.layer || 0,
  });
}

const bolts = [];
function boltPath(x0, y0, x1, y1, disp, out) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 5) {
    out.push([x1, y1]);
    return;
  }
  const mx = (x0 + x1) / 2 + rand(-disp, disp);
  const my = (y0 + y1) / 2 + rand(-disp, disp) * 0.3;
  boltPath(x0, y0, mx, my, disp / 2, out);
  boltPath(mx, my, x1, y1, disp / 2, out);
}
function lightning(x0, y0, x1, y1, o = {}) {
  const main = [[x0, y0]];
  boltPath(x0, y0, x1, y1, o.disp || 40, main);
  const segs = [main];
  const nb = o.branches ?? 3;
  for (let b = 0; b < nb; b++) {
    const s = main[randi(2, main.length - 3)];
    if (!s) continue;
    const br = [[s[0], s[1]]];
    boltPath(s[0], s[1], s[0] + rand(-60, 60), s[1] + rand(20, 70), 18, br);
    segs.push(br);
  }
  bolts.push({ segs, life: o.life || 0.4, max: o.life || 0.4, core: o.core || '#ffffff', glow: o.glow || '#7ab8ff' });
}

function clearFx() {
  while (parts.length) pool.push(parts.pop());
  rings.length = 0;
  bolts.length = 0;
}

function updateFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age += dt;
    p.life -= dt;
    if (p.life <= 0) {
      const last = parts.pop();
      if (last !== p) parts[i] = last;
      pool.push(p);
      if (p.onDie) p.onDie(p);
      continue;
    }
    p.vy += p.g * dt;
    if (p.drag) {
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy *= k;
    }
    p.x += p.vx * dt + (p.sway ? Math.sin(p.age * 5 + p.phase) * p.sway * dt : 0);
    p.y += p.vy * dt;
    if (p.y > p.floor) {
      p.y = p.floor;
      if (p.bounce && Math.abs(p.vy) > 30) {
        p.vy = -Math.abs(p.vy) * p.bounce;
        p.vx *= 0.75;
      } else {
        p.vy = 0;
        p.vx *= 0.9;
      }
    }
    if (p.trail) p.trail(p, dt);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.life -= dt;
    r.r += r.vr * dt;
    r.vr *= Math.exp(-dt * 2.2);
    if (r.life <= 0) rings.splice(i, 1);
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].life -= dt;
    if (bolts[i].life <= 0) bolts.splice(i, 1);
  }
}

function drawParticles(ctx, layer) {
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.layer !== layer) continue;
    const t = 1 - p.life / p.max;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    switch (p.kind) {
      case K.SQ: {
        const s = Math.max(1, Math.round(lerp(p.size, p.size2, t)));
        ctx.fillStyle = p.color || rampAt(p.ramp, t);
        ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
        break;
      }
      case K.SPARK: {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = Math.min(10, sp * 0.03);
        ctx.fillStyle = p.color || rampAt(p.ramp, t);
        pxLine(ctx, x, y, x - (p.vx / sp) * len, y - (p.vy / sp) * len);
        break;
      }
      case K.COIN: {
        const f = ((p.age * p.spin * 10) | 0) & 7;
        if (p.life < 0.3 && ((p.age * 24) | 0) % 2) break;
        ctx.drawImage(SPR.coin[f], x - 6, y - 6);
        break;
      }
      case K.STAR: {
        const s = Math.round(p.size * Math.sin(Math.PI * t));
        ctx.fillStyle = p.color || rampAt(p.ramp, t);
        pxStar(ctx, x, y, s);
        break;
      }
      case K.SMOKE: {
        const r = lerp(p.size, p.size2, t);
        ditherDisc(ctx, x, y, r, p.color || rampAt(p.ramp, t), 16 * (1 - t) * p.alpha);
        break;
      }
      case K.PIX: {
        if (t > 0.75 && ((p.age * 20) | 0) % 2) break;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, p.size, p.size);
        break;
      }
      case K.DROP: {
        ctx.fillStyle = p.color || '#9fb8d8';
        pxLine(ctx, x, y, x - p.vx * 0.012, y - p.vy * 0.012);
        break;
      }
      case K.BUBBLE: {
        ctx.fillStyle = p.color || '#9fd8ff';
        if (p.size <= 1) {
          ctx.fillRect(x, y - 1, 1, 1);
          ctx.fillRect(x - 1, y, 1, 1);
          ctx.fillRect(x + 1, y, 1, 1);
          ctx.fillRect(x, y + 1, 1, 1);
        } else {
          ctx.fillRect(x - 1, y - 2, 3, 1);
          ctx.fillRect(x - 1, y + 2, 3, 1);
          ctx.fillRect(x - 2, y - 1, 1, 3);
          ctx.fillRect(x + 2, y - 1, 1, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 1, y - 1, 1, 1);
        }
        break;
      }
      case K.EMBER: {
        if (p.flicker && Math.random() < p.flicker) break;
        const s = Math.max(1, Math.round(lerp(p.size, p.size2, t)));
        ctx.fillStyle = p.color || rampAt(p.ramp, t);
        ctx.fillRect(x, y, s, s);
        break;
      }
      case K.ROCKET: {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, 2, 3);
        break;
      }
      case K.CONF: {
        const w = Math.abs(Math.sin(p.age * p.spin * 6 + p.phase)) > 0.5 ? 2 : 1;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, w, 3 - w);
        break;
      }
    }
  }
}

function drawRings(ctx, layer = 0) {
  for (const r of rings) {
    if (r.layer !== layer) continue;
    ctx.fillStyle = rampAt(r.ramp, 1 - r.life / r.max);
    pxRing(ctx, r.x, r.y, r.r, r.thick);
  }
}

function drawBolts(ctx) {
  for (const b of bolts) {
    if (((b.life * 40) | 0) % 3 === 0) continue;
    for (const s of b.segs) {
      ctx.fillStyle = b.glow;
      for (let i = 1; i < s.length; i++) pxLine(ctx, s[i - 1][0], s[i - 1][1], s[i][0], s[i][1], 3);
    }
    for (const s of b.segs) {
      ctx.fillStyle = b.core;
      for (let i = 1; i < s.length; i++) pxLine(ctx, s[i - 1][0], s[i - 1][1], s[i][0], s[i][1], 1);
    }
  }
}

function spritePixels(c, step) {
  if (c._px && c._pxStep === step) return c._px;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const out = [];
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      const i = (y * c.width + x) * 4;
      if (d[i + 3] > 128) out.push(x, y, rgbHex(d[i], d[i + 1], d[i + 2]));
    }
  }
  c._px = out;
  c._pxStep = step;
  return out;
}

function shatter(c, x, y, o = {}) {
  const step = o.step || 2;
  const px = spritePixels(c, step);
  const ox = o.ox ?? x + c.width / 2;
  const oy = o.oy ?? y + c.height / 2;
  for (let i = 0; i < px.length; i += 3) {
    const sx = x + px[i];
    const sy = y + px[i + 1];
    const dx = sx - ox;
    const dy = sy - oy;
    const d = Math.hypot(dx, dy) || 1;
    const s = rand(o.speed?.[0] ?? 60, o.speed?.[1] ?? 220);
    spawn({
      x: sx,
      y: sy,
      vx: (dx / d) * s + rand(-30, 30),
      vy: (dy / d) * s + rand(-40, 20) + (o.vy || 0),
      g: o.g ?? 140,
      drag: o.drag ?? 1.4,
      life: rand(o.life?.[0] ?? 0.6, o.life?.[1] ?? 1.4),
      kind: K.PIX,
      color: px[i + 2],
      size: step,
      layer: o.layer ?? 1,
    });
  }
}

function firework(x, y, ramp) {
  ramp = ramp || pick(FIREWORK_RAMPS);
  const n = 64;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(-0.05, 0.05);
    const s = rand(95, 150);
    spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 70, drag: 1.7, life: rand(0.9, 1.5), kind: K.SPARK, ramp, layer: 0 });
  }
  for (let i = 0; i < 26; i++) {
    const a = rand(0, TAU);
    const s = rand(20, 70);
    spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 40, drag: 1.5, life: rand(0.5, 1), kind: K.SQ, ramp, size: 2, size2: 1, layer: 0 });
  }
  for (let i = 0; i < 12; i++) {
    const a = rand(0, TAU);
    const s = rand(40, 120);
    spawn({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      g: 60,
      drag: 1.6,
      life: rand(0.7, 1.1),
      kind: K.EMBER,
      ramp: RAMP.white,
      layer: 0,
      onDie: (p) => burst(p.x, p.y, 5, { speed: [10, 40], life: [0.2, 0.45], kind: K.STAR, ramp: RAMP.gold, size: 2 }),
    });
  }
  addRing(x, y, { speed: 220, life: 0.3, ramp, thick: 1 });
  Sound.firework();
}

function rocket(x, apexY, ramp) {
  const g = 200;
  const h = H + 5 - apexY;
  const vy = -Math.sqrt(2 * g * h);
  spawn({
    x,
    y: H + 5,
    vx: rand(-15, 15),
    vy,
    g,
    life: -vy / g,
    kind: K.ROCKET,
    layer: 0,
    trail: (p) => {
      if (Math.random() < 0.8) spawn({ x: p.x + rand(-1, 1), y: p.y + 2, vx: rand(-8, 8), vy: rand(10, 30), life: rand(0.2, 0.45), kind: K.SQ, ramp: RAMP.gold, size: 1 });
    },
    onDie: (p) => firework(p.x, p.y, ramp),
  });
  Sound.launch();
}

class Rays {
  constructor(cx, cy) {
    this.c = makeCanvas(W, H);
    this.img = this.c.ctx.createImageData(W, H);
    this.u = new Uint32Array(this.img.data.buffer);
    this.ang = new Float32Array(W * H);
    this.dist = new Float32Array(W * H);
    this.th = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        this.ang[i] = (Math.atan2(y + 0.5 - cy, x + 0.5 - cx) / TAU + 1) % 1;
        this.dist[i] = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        this.th[i] = bayerAt(x, y);
      }
    }
  }
  render(count, rot, a, b, r0, r1, twist = 0) {
    const { u, ang, dist, th } = this;
    const inv = 1 / (r1 - r0);
    for (let i = 0; i < u.length; i++) {
      const d = dist[i];
      if ((d - r0) * inv >= th[i]) {
        u[i] = 0;
        continue;
      }
      const v = ang[i] * count + rot + d * twist;
      u[i] = v - Math.floor(v) < 0.5 ? a : b;
    }
    this.c.ctx.putImageData(this.img, 0, 0);
    return this.c;
  }
}

function firePalette(stops) {
  const pal = new Uint32Array(37);
  for (let i = 1; i < 37; i++) {
    const t = i / 36;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k];
    const [t1, c1] = stops[k + 1];
    pal[i] = u32c(mixHex(c0, c1, clamp((t - t0) / (t1 - t0), 0, 1)));
  }
  return pal;
}

const FIRE_PAL = {
  classic: firePalette([
    [0, '#1a0610'],
    [0.15, '#4a0b16'],
    [0.3, '#9a141c'],
    [0.45, '#d8321a'],
    [0.6, '#ff6a14'],
    [0.75, '#ffa51e'],
    [0.88, '#ffe050'],
    [1, '#fffbe0'],
  ]),
  magic: firePalette([
    [0, '#12061e'],
    [0.2, '#3a0f5a'],
    [0.4, '#7a1fa0'],
    [0.55, '#d23ad0'],
    [0.7, '#ff6ab0'],
    [0.85, '#ffc0e8'],
    [1, '#ffffff'],
  ]),
};

class Fire {
  constructor(w, h, pal) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h);
    this.c = makeCanvas(w, h);
    this.img = this.c.ctx.createImageData(w, h);
    this.u = new Uint32Array(this.img.data.buffer);
    this.pal = pal;
    this.decay = 0.3;
    this.seed = (Math.random() * 1e9) | 1;
    this.acc = 0;
    this.src = 0;
    this.t = 0;
    this.tongues = 3;
    this.mask = null;
  }
  setMask(fn) {
    this.mask = new Float32Array(this.w);
    for (let x = 0; x < this.w; x++) this.mask[x] = fn((x + 0.5) / this.w);
  }
  setSource(v) {
    this.src = v;
  }
  rnd() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x;
    return x >>> 0;
  }
  step() {
    const { w, h, buf } = this;
    const off = (h - 1) * w;
    this.t += 1 / 60;
    for (let x = 0; x < w; x++) {
      if (this.src <= 0) {
        buf[off + x] = Math.max(0, buf[off + x] - 2);
        continue;
      }
      const hot = Math.sin(x * 0.19 + this.t * 1.7) + Math.sin(x * 0.083 - this.t * 1.1) + Math.sin(x * 0.41 + this.t * 3.1) * 0.5;
      buf[off + x] = clamp(Math.round((this.src - 5 + hot * this.tongues) * (this.mask ? this.mask[x] : 1)), 0, 36);
    }
    const dec = (this.decay * 256) | 0;
    const n = w * h;
    for (let y = 1; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const src = row + x;
        const px = buf[src];
        if (px === 0) {
          buf[src - w] = 0;
          continue;
        }
        const r = this.rnd();
        const dst = src - w + (r % 3) - 1;
        const v = (r >>> 8) % 256 < dec ? px - 1 : px;
        if (dst >= 0 && dst < n) buf[dst] = v;
      }
    }
  }
  update(dt) {
    this.acc += dt;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 4) {
      this.step();
      this.acc -= 1 / 60;
      n++;
    }
    if (n === 4) this.acc = 0;
  }
  render() {
    const { u, buf, pal, w } = this;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i];
      if (v === 0) {
        u[i] = 0;
        continue;
      }
      if (v < 7) {
        const x = i % w;
        const y = (i / w) | 0;
        if (BAYER4[(x & 3) | ((y & 3) << 2)] >= v * 2 + 2) {
          u[i] = 0;
          continue;
        }
      }
      u[i] = pal[v];
    }
    this.c.ctx.putImageData(this.img, 0, 0);
    return this.c;
  }
  warm(steps) {
    for (let i = 0; i < steps; i++) this.step();
  }
}

function drawWaves(ctx, t, y0, amp, k, speed, body, foam, phase = 0) {
  ctx.fillStyle = body;
  const ys = drawWaves.ys || (drawWaves.ys = new Int16Array(W / 2 + 1));
  for (let i = 0, x = 0; x < W; x += 2, i++) {
    const y = Math.round(y0 + Math.sin(x * k + t * speed + phase) * amp + Math.sin(x * k * 2.3 - t * speed * 1.3 + phase) * amp * 0.4);
    ys[i] = y;
    ctx.fillRect(x, y, 2, H - y);
  }
  if (!foam) return;
  ctx.fillStyle = foam;
  for (let i = 0, x = 0; x < W; x += 2, i++) {
    if (Math.sin(x * k + t * speed + phase) > 0.45) ctx.fillRect(x, ys[i], 2, 1);
  }
}
