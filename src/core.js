'use strict';

const W = window.VIEW_W || 480;
const H = window.VIEW_H || 270;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const mod = (a, n) => ((a % n) + n) % n;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

const Ease = {
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayerAt = (x, y) => (BAYER4[(x & 3) | ((y & 3) << 2)] + 0.5) / 16;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.ctx = c.getContext('2d');
  c.ctx.imageSmoothingEnabled = false;
  return c;
}

const rgbCache = new Map();
function hexRgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1, 7), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}
const rgbHex = (r, g, b) => '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
function mixHex(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(
    Math.round(lerp(A[0], B[0], t)),
    Math.round(lerp(A[1], B[1], t)),
    Math.round(lerp(A[2], B[2], t)),
  );
}
function hsv(h, s, v) {
  h = mod(h, 1) * 6;
  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return rgbHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}
function u32c(hex, a = 255) {
  const [r, g, b] = hexRgb(hex);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
const RAINBOW = Array.from({ length: 24 }, (_, i) => hsv(i / 24, 0.78, 1));
const rainbow = (t) => RAINBOW[mod(Math.floor(t * 24), 24)];

function pxLine(ctx, x0, y0, x1, y1, s = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  const o = s >> 1;
  let err = dx + dy;
  for (let n = 0; n < 2000; n++) {
    ctx.fillRect(x0 - o, y0 - o, s, s);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function pxDisc(ctx, cx, cy, r) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const rr = r * r;
  const ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) {
    const q = rr - dy * dy;
    if (q < 0) continue;
    const w = Math.floor(Math.sqrt(q));
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

function pxRing(ctx, cx, cy, r, t = 1) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.round(r);
  if (r <= 0) return;
  const o = t >> 1;
  let x = r;
  let y = 0;
  let err = 1 - r;
  while (x >= y) {
    ctx.fillRect(cx + x - o, cy + y - o, t, t);
    ctx.fillRect(cx - x - o, cy + y - o, t, t);
    ctx.fillRect(cx + x - o, cy - y - o, t, t);
    ctx.fillRect(cx - x - o, cy - y - o, t, t);
    ctx.fillRect(cx + y - o, cy + x - o, t, t);
    ctx.fillRect(cx - y - o, cy + x - o, t, t);
    ctx.fillRect(cx + y - o, cy - x - o, t, t);
    ctx.fillRect(cx - y - o, cy - x - o, t, t);
    y++;
    if (err < 0) err += 2 * y + 1;
    else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
}

function pxStar(ctx, x, y, n) {
  x = Math.round(x);
  y = Math.round(y);
  if (n <= 0) {
    ctx.fillRect(x, y, 1, 1);
    return;
  }
  ctx.fillRect(x - n, y, n * 2 + 1, 1);
  ctx.fillRect(x, y - n, 1, n * 2 + 1);
  if (n >= 3) ctx.fillRect(x - 1, y - 1, 3, 3);
}

const ditherCache = new Map();
function dither(ctx, color, level) {
  level = clamp(Math.round(level), 0, 16);
  const key = color + level;
  let p = ditherCache.get(key);
  if (!p) {
    const c = makeCanvas(4, 4);
    c.ctx.fillStyle = color;
    for (let i = 0; i < 16; i++) if (BAYER4[i] < level) c.ctx.fillRect(i & 3, i >> 2, 1, 1);
    p = ctx.createPattern(c, 'repeat');
    ditherCache.set(key, p);
  }
  return p;
}

const discCache = new Map();
function ditherDisc(ctx, cx, cy, r, color, level) {
  r = Math.max(0, Math.round(r));
  level = clamp(Math.round(level), 0, 16);
  if (level === 0) return;
  const key = color + '|' + level + '|' + r;
  let c = discCache.get(key);
  if (!c) {
    const d = r * 2 + 1;
    c = makeCanvas(d, d);
    const img = c.ctx.createImageData(d, d);
    const u = new Uint32Array(img.data.buffer);
    const col = u32c(color);
    for (let y = 0; y < d; y++) {
      const q = r * r - (y - r) * (y - r);
      if (q < 0) continue;
      const w = Math.floor(Math.sqrt(q));
      for (let x = r - w; x <= r + w; x++) if (BAYER4[(x & 3) | ((y & 3) << 2)] < level) u[y * d + x] = col;
    }
    c.ctx.putImageData(img, 0, 0);
    if (discCache.size > 2000) discCache.clear();
    discCache.set(key, c);
  }
  ctx.drawImage(c, Math.round(cx) - r, Math.round(cy) - r);
}

const rectCache = new Map();
function ditherRect(ctx, x, y, w, h, color, level) {
  level = clamp(Math.round(level), 0, 16);
  if (level === 0) return;
  const key = color + '|' + level + '|' + w + 'x' + h;
  let c = rectCache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    c.ctx.fillStyle = dither(c.ctx, color, level);
    c.ctx.fillRect(0, 0, w, h);
    rectCache.set(key, c);
  }
  ctx.drawImage(c, x, y);
}

function paintGradient(ctx, x0, y0, w, h, stops, sharp = 2.2) {
  const img = ctx.createImageData(w, h);
  const u = new Uint32Array(img.data.buffer);
  const cols = stops.map((c) => u32c(c));
  const n = stops.length - 1;
  for (let j = 0; j < h; j++) {
    const f = (j / Math.max(1, h - 1)) * n;
    const i0 = Math.min(n, Math.floor(f));
    const fr = clamp((f - i0 - 0.5) * sharp + 0.5, 0, 1);
    for (let i = 0; i < w; i++) {
      const k = fr > bayerAt(i, j) ? Math.min(i0 + 1, n) : i0;
      u[j * w + i] = cols[k];
    }
  }
  ctx.putImageData(img, x0, y0);
}

const cam = { x: 0, y: 0, zoom: 1, rot: 0, kick: 0, trauma: 0, sx: 0, sy: 0, sr: 0 };
const fx = {
  flash: 0,
  flashDecay: 3,
  flashColor: [1, 1, 1],
  aberr: 0,
  aberrBase: 0,
  sat: 1,
  tint: [1, 1, 1],
  bright: 1,
  vig: 0.4,
  heat: 0,
  grain: 0.025,
  scan: 0.14,
  bloom1: 0.85,
  bloom2: 0.65,
  threshold: 0.56,
  waves: [],
};
let freezeT = 0;

function resetFx() {
  Object.assign(cam, { x: 0, y: 0, zoom: 1, rot: 0, kick: 0, trauma: 0 });
  Object.assign(fx, {
    flash: 0,
    aberr: 0,
    aberrBase: 0,
    sat: 1,
    tint: [1, 1, 1],
    bright: 1,
    vig: 0.4,
    heat: 0,
    grain: 0.025,
    scan: 0.14,
    bloom1: 0.85,
    bloom2: 0.65,
    threshold: 0.56,
  });
  fx.waves.length = 0;
  freezeT = 0;
}

const shake = (a) => (cam.trauma = Math.min(1, cam.trauma + a));
const kick = (z) => (cam.kick = Math.min(0.6, cam.kick + z));
function flash(a, color = [1, 1, 1], decay = 3) {
  fx.flash = Math.max(fx.flash, a);
  fx.flashColor = color;
  fx.flashDecay = decay;
}
const aberrate = (a) => (fx.aberr = Math.max(fx.aberr, a));
const freeze = (t) => (freezeT = Math.max(freezeT, t));
function shockwave(x, y, strength = 0.04, speed = 0.8, life = 1.2) {
  fx.waves.push({ x: x / W, y: 1 - y / H, t: 0, strength, speed, life });
  if (fx.waves.length > 3) fx.waves.shift();
}

const wobble = (t) => Math.sin(t) * 0.5 + Math.sin(t * 2.31 + 1.7) * 0.3 + Math.sin(t * 4.77 + 0.3) * 0.2;

function updateCamFx(dt, time) {
  cam.trauma = Math.max(0, cam.trauma - dt * 1.5);
  const s = cam.trauma * cam.trauma;
  cam.sx = s * 9 * wobble(time * 37);
  cam.sy = s * 9 * wobble(time * 41 + 9);
  cam.sr = s * 0.05 * wobble(time * 29 + 3);
  cam.kick *= Math.exp(-dt * 7);
  fx.flash = Math.max(0, fx.flash - dt * fx.flashDecay);
  fx.aberr = fx.aberr > fx.aberrBase ? Math.max(fx.aberrBase, fx.aberr - dt * 2.5) : fx.aberrBase;
  for (let i = fx.waves.length - 1; i >= 0; i--) {
    fx.waves[i].t += dt;
    if (fx.waves[i].t > fx.waves[i].life) fx.waves.splice(i, 1);
  }
}

class Timeline {
  constructor() {
    this.ev = [];
  }
  at(t, fn) {
    this.ev.push({ t, fn, done: false });
    return this;
  }
  update(t) {
    for (const e of this.ev) {
      if (!e.done && t >= e.t) {
        e.done = true;
        e.fn();
      }
    }
  }
}

const fmtNum = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
