'use strict';

const INK = '#12081a';
const R_STRAW = ['#6e3f10', '#a86a1a', '#d99a28', '#f5c542', '#ffe98a'];
const R_RED = ['#4a0a1a', '#8a1224', '#c8202c', '#ee4436', '#ff8a70'];
const R_BONE = ['#4c3f4a', '#8c7c80', '#c9b99c', '#eee0bf', '#fffbef'];
const R_PURP = ['#240b40', '#46207a', '#7438b8', '#a065ea', '#d7b0ff'];
const R_WOOD = ['#2e150f', '#552818', '#84462a', '#b3683a', '#d9955c'];
const R_GOLD = ['#5e300a', '#a95e14', '#e0971e', '#ffcf3a', '#fff4a8'];
const R_MEAT = ['#3e140c', '#74281a', '#b04d2a', '#de7d46', '#ffb57c'];
const R_STEEL = ['#2a3246', '#5d6a86', '#9fb0c8', '#dbe6f4', '#ffffff'];
const R_GREEN = ['#0e3320', '#1d6636', '#35a845', '#7fd85e', '#c8ff96'];
const R_BLACK = ['#07050c', '#141020', '#231c34', '#3a3150', '#5a5070'];
const R_CYAN = ['#0a2a4a', '#145a8a', '#1fa0d8', '#6fe0ff', '#d0faff'];
const R_MOON = ['#3b3f6e', '#7c83b8', '#c4c8e6', '#eeeee0', '#fffff6'];

function rampPick(ramp, v, x, y, dith = 0.5) {
  const n = ramp.length - 1;
  const f = clamp(v, 0, 1) * n + (bayerAt(x, y) - 0.5) * dith;
  return ramp[clamp(Math.round(f), 0, n)];
}

function shiftColor(ramp, c, n) {
  const i = ramp.indexOf(c);
  if (i < 0) return c;
  return ramp[clamp(i + n, 0, ramp.length - 1)];
}

function shade(ramp, o = {}) {
  let lx = o.lx ?? -0.5;
  let ly = o.ly ?? -0.6;
  let lz = Math.sqrt(Math.max(0.1, 1 - lx * lx - ly * ly));
  const L = Math.hypot(lx, ly, lz);
  lx /= L;
  ly /= L;
  lz /= L;
  const rim = o.rim ?? 0.15;
  const bias = o.bias ?? 0;
  const dith = o.dith ?? 0.55;
  const k = o.k ?? 1;
  return (nx, ny, x, y) => {
    const d = nx * nx + ny * ny;
    const nz = Math.sqrt(Math.max(0, 1 - d));
    const l = nx * lx + ny * ly + nz * lz;
    let v = 0.5 + l * 0.5 * k + bias;
    if (d > 0.72) v -= (rim * (d - 0.72)) / 0.28;
    return rampPick(ramp, v, x, y, dith);
  };
}

class PX {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(0);
  }
  in(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x, y, c) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (c && this.in(x, y)) this.d[y * this.w + x] = c;
  }
  get(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    return this.in(x, y) ? this.d[y * this.w + x] : 0;
  }
  paint(x, y, col, nx, ny, extra) {
    this.set(x, y, typeof col === 'function' ? col(nx, ny, x, y, extra) : col);
  }
  rect(x0, y0, w, h, col) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        this.paint(x, y, col, ((x - x0 + 0.5) / w) * 2 - 1, ((y - y0 + 0.5) / h) * 2 - 1);
      }
    }
  }
  ellipse(cx, cy, rx, ry, col, clip) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        if (clip && !clip(x, y, nx, ny)) continue;
        this.paint(x, y, col, nx, ny);
      }
    }
  }
  rotEllipse(cx, cy, rx, ry, ang, col) {
    const r = Math.max(rx, ry) + 1;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const lx = (dx * c + dy * s) / rx;
        const ly = (-dx * s + dy * c) / ry;
        if (lx * lx + ly * ly > 1) continue;
        this.paint(x, y, col, lx * c - ly * s, lx * s + ly * c);
      }
    }
  }
  ring(cx, cy, r0, r1, col) {
    for (let y = Math.floor(cy - r1 - 1); y <= Math.ceil(cy + r1 + 1); y++) {
      for (let x = Math.floor(cx - r1 - 1); x <= Math.ceil(cx + r1 + 1); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy);
        if (d < r0 || d > r1) continue;
        this.paint(x, y, col, dx / r1, dy / r1, (d - r0) / (r1 - r0));
      }
    }
  }
  stroke(x0, y0, x1, y1, r0, col, r1 = r0) {
    const L = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(L * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const cx = lerp(x0, x1, t);
      const cy = lerp(y0, y1, t);
      const r = Math.max(0.55, lerp(r0, r1, t));
      for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
          const dx = (x + 0.5 - cx) / r;
          const dy = (y + 0.5 - cy) / r;
          if (dx * dx + dy * dy <= 1) this.paint(x, y, col, dx, dy, t);
        }
      }
    }
  }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) this.set(lerp(x0, x1, i / n) + 0.5, lerp(y0, y1, i / n) + 0.5, c);
  }
  poly(pts, col) {
    let minX = 1e9;
    let maxX = -1e9;
    let minY = 1e9;
    let maxY = -1e9;
    for (const [x, y] of pts) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const hw = (maxX - minX) / 2 || 1;
    const hh = (maxY - minY) / 2 || 1;
    const mx = minX + hw;
    const my = minY + hh;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
          this.paint(x, y, col, (x + 0.5 - mx) / hw, (yc - my) / hh);
        }
      }
    }
  }
  outline(c, diag = false) {
    const src = this.d.slice();
    const { w, h } = this;
    const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x]) continue;
        if (
          has(x - 1, y) ||
          has(x + 1, y) ||
          has(x, y - 1) ||
          has(x, y + 1) ||
          (diag && (has(x - 1, y - 1) || has(x + 1, y - 1) || has(x - 1, y + 1) || has(x + 1, y + 1)))
        ) {
          this.d[y * w + x] = c;
        }
      }
    }
  }
  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    const img = c.ctx.createImageData(this.w, this.h);
    const u = new Uint32Array(img.data.buffer);
    for (let i = 0; i < this.d.length; i++) if (this.d[i]) u[i] = u32c(this.d[i]);
    c.ctx.putImageData(img, 0, 0);
    return c;
  }
}

function silhouette(c, color) {
  const o = makeCanvas(c.width, c.height);
  o.ctx.drawImage(c, 0, 0);
  o.ctx.globalCompositeOperation = 'source-in';
  o.ctx.fillStyle = color;
  o.ctx.fillRect(0, 0, c.width, c.height);
  return o;
}

function scaled(c, k) {
  const o = makeCanvas(c.width * k, c.height * k);
  o.ctx.drawImage(c, 0, 0, o.width, o.height);
  return o;
}

function grayify(hex) {
  const [r, g, b] = hexRgb(hex);
  const l = r * 0.3 + g * 0.55 + b * 0.15;
  return rgbHex(Math.round(l * 0.72), Math.round(l * 0.8), Math.round(Math.min(255, l * 1.02)));
}

function drawStrawHat(p, cx, cy, k = 1) {
  const brx = 19 * k;
  const bry = 7.2 * k;
  const crx = 10 * k;
  const cry = 15 * k;
  const brim = (nx, ny, x, y) => {
    let v = 0.64 - nx * 0.22 - ny * 0.3;
    if (nx * nx + ny * ny > 0.8) v -= 0.2;
    if ((x * 2 + y * 3) % 7 === 0) v -= 0.2;
    return rampPick(R_STRAW, v, x, y, 0.45);
  };
  const crownSh = shade(R_STRAW, { lx: -0.55, ly: -0.55, rim: 0.2 });
  const band = shade(R_RED, { lx: -0.6, ly: -0.2, rim: 0.3 });
  const bandTop = cy - 6 * k;
  const bandBot = cy - 1.5 * k;
  p.ellipse(cx, cy, brx, bry, brim);
  p.ellipse(
    cx,
    cy + 2 * k,
    crx,
    cry,
    (nx, ny, x, y) => {
      if (y + 0.5 >= bandTop && y + 0.5 <= bandBot) return band(nx, ny * 0.4, x, y);
      let c = crownSh(nx, ny, x, y);
      if ((x * 3 + y) % 5 === 0) c = shiftColor(R_STRAW, c, -1);
      return c;
    },
    (x, y) => y + 0.5 <= cy + 1.5 * k,
  );
  p.ellipse(cx, cy, brx, bry, brim, (x, y, nx, ny) => ny > 0.32);
  for (let x = Math.ceil(cx - crx + 1); x < cx + crx - 1; x++) {
    const y = Math.floor(cy + 0.32 * bry + 1);
    p.set(x, y, shiftColor(R_STRAW, p.get(x, y), -1));
  }
}

function drawJolly(p, cx, cy, k = 1) {
  const bone = shade(R_BONE, { lx: -0.5, ly: -0.6, rim: 0.2 });
  const boneLine = (x0, y0, x1, y1) => {
    p.stroke(x0, y0, x1, y1, 2.1 * k, bone);
    const L = Math.hypot(x1 - x0, y1 - y0);
    const px = -(y1 - y0) / L;
    const py = (x1 - x0) / L;
    for (const [ex, ey] of [
      [x0, y0],
      [x1, y1],
    ]) {
      p.ellipse(ex + px * 2.2 * k, ey + py * 2.2 * k, 2.7 * k, 2.7 * k, bone);
      p.ellipse(ex - px * 2.2 * k, ey - py * 2.2 * k, 2.7 * k, 2.7 * k, bone);
    }
  };
  boneLine(cx - 14 * k, cy + 15 * k, cx + 14 * k, cy - 8 * k);
  boneLine(cx - 14 * k, cy - 8 * k, cx + 14 * k, cy + 15 * k);
  p.ellipse(cx, cy + 7 * k, 7.5 * k, 5.5 * k, bone);
  p.ellipse(cx, cy - k, 11 * k, 10 * k, bone);
  const hole = '#1a0f1f';
  p.ellipse(cx - 4.5 * k, cy + 1.5 * k, 3 * k, 3.3 * k, hole);
  p.ellipse(cx + 4.5 * k, cy + 1.5 * k, 3 * k, 3.3 * k, hole);
  p.set(cx - 5 * k, cy + 0.5 * k, '#ff4a3a');
  p.set(cx + 4 * k, cy + 0.5 * k, '#ff4a3a');
  const ny = Math.round(cy + 5.5 * k);
  p.rect(Math.round(cx - 2), ny, 4, 1, hole);
  p.rect(Math.round(cx - 1), ny + 1, 2, 1, hole);
  const my = Math.round(cy + 9 * k);
  p.rect(Math.round(cx - 5 * k), my, Math.round(10 * k), 1, hole);
  for (const dx of [-3, -1, 1, 3]) p.rect(Math.round(cx + dx * k), my, 1, Math.round(3 * k), hole);
  drawStrawHat(p, cx, cy - 9 * k, 0.72 * k);
}

function spiral(p, cx, cy, r, dir, ramp) {
  const turns = TAU * 1.75;
  for (let a = 0; a < turns; a += 0.04) {
    const rr = (r * a) / turns;
    const x = cx + Math.cos(a * dir) * rr;
    const y = cy + Math.sin(a * dir) * rr;
    const c = p.get(x, y);
    if (!c) continue;
    p.set(x, y, shiftColor(ramp, c, 2));
  }
}

function drawFruit(p) {
  p.ellipse(20, 24, 14.5, 13.5, shade(R_PURP, { lx: -0.55, ly: -0.6, rim: 0.3 }));
  for (const [sx, sy, r, d] of [
    [13, 20, 4.4, 1],
    [26, 18, 4.8, -1],
    [19, 30, 4.2, 1],
    [30, 28, 3.4, -1],
    [9.5, 29, 2.8, 1],
    [21, 13.5, 2.8, -1],
    [28, 34, 2.4, 1],
  ]) {
    spiral(p, sx, sy, r, d, R_PURP);
  }
  const leaf = shade(R_GREEN, { lx: -0.5, ly: -0.7 });
  p.stroke(20, 12, 20.5, 7, 1.1, leaf);
  for (let a = 0; a < TAU * 0.9; a += 0.1) p.set(22.5 + Math.cos(a) * 2.2, 5.5 + Math.sin(a) * 2, R_GREEN[2]);
  p.rotEllipse(27, 9, 5.5, 2.4, -0.45, leaf);
  for (let i = 0; i < 5; i++) p.set(23.5 + i * 1.3, 10.5 - i * 0.6, R_GREEN[1]);
  p.set(12, 16, '#ffffff');
  p.set(13, 16, '#ffffff');
  p.set(12, 17, '#ffffff');
}

function drawChest(p) {
  const gold = shade(R_GOLD, { lx: -0.5, ly: -0.7, rim: 0.1 });
  p.poly(
    [
      [7, 4],
      [33, 4],
      [35, 17],
      [5, 17],
    ],
    (nx, ny, x, y) => rampPick(R_WOOD, 0.18 + ny * 0.1 + (x % 6 === 0 ? -0.12 : 0), x, y),
  );
  p.line(7, 4, 33, 4, R_GOLD[3]);
  p.line(7, 4, 5, 17, R_GOLD[2]);
  p.line(33, 4, 35, 17, R_GOLD[1]);
  p.line(20, 4, 20, 17, R_GOLD[2]);
  p.ellipse(20, 18, 14.5, 5.5, gold);
  for (const [x, y] of [
    [11, 14],
    [16, 12.5],
    [23, 12],
    [28.5, 14],
    [20, 14.5],
    [13.5, 16.5],
    [26, 16.5],
  ]) {
    p.ellipse(x, y, 2, 1.6, shade(R_GOLD, { lx: -0.4, ly: -0.8, bias: 0.12 }));
  }
  p.ellipse(15, 15, 2.2, 2.2, shade(R_RED, { bias: 0.1 }));
  p.set(14, 14, '#ffffff');
  p.ellipse(26, 15, 2.2, 2.2, shade(R_CYAN, { bias: 0.1 }));
  p.set(25, 14, '#ffffff');
  p.poly(
    [
      [4, 19],
      [36, 19],
      [35, 36],
      [5, 36],
    ],
    (nx, ny, x, y) => {
      let v = 0.56 - nx * 0.2 - ny * 0.08;
      if (y === 25 || y === 30) v -= 0.3;
      return rampPick(R_WOOD, v, x, y, 0.4);
    },
  );
  const band = (nx, ny, x, y) => rampPick(R_GOLD, 0.72 - nx * 0.25 - ny * 0.1, x, y, 0.4);
  p.rect(4, 19, 3, 18, band);
  p.rect(33, 19, 3, 18, band);
  p.rect(4, 19, 32, 2, band);
  p.rect(5, 34, 30, 2, band);
  p.rect(17, 22, 6, 7, gold);
  p.rect(19, 24, 2, 2, '#2a1008');
  p.set(19, 26, '#2a1008');
  p.set(20, 26, '#2a1008');
  for (const [x, y] of [
    [5, 23],
    [5, 31],
    [34, 23],
    [34, 31],
  ]) {
    p.set(x, y, R_GOLD[4]);
  }
}

function drawMeat(p) {
  const bone = shade(R_BONE, { lx: -0.5, ly: -0.6, rim: 0.2 });
  p.stroke(7, 33, 33, 7, 2.2, bone);
  for (const [x, y] of [
    [5.2, 31.2],
    [8.8, 34.8],
    [31.2, 5.2],
    [34.8, 8.8],
  ]) {
    p.ellipse(x, y, 2.8, 2.8, bone);
  }
  p.rotEllipse(20, 20, 13.5, 10.5, -Math.PI / 4, shade(R_MEAT, { lx: -0.55, ly: -0.6, rim: 0.25 }));
  for (let i = 0; i < 6; i++) p.set(12 + i, 18 - i, R_MEAT[4]);
  for (let i = 0; i < 3; i++) p.set(14 + i, 20 - i, R_MEAT[4]);
  for (const [x, y] of [
    [22, 25],
    [25, 22],
    [18, 27],
    [27, 17],
  ]) {
    p.set(x, y, R_MEAT[1]);
  }
}

function drawWheel(p) {
  const wood = shade(R_WOOD, { lx: -0.5, ly: -0.6 });
  const gold = shade(R_GOLD, { lx: -0.5, ly: -0.6 });
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8 + TAU / 16;
    p.stroke(20, 20, 20 + Math.cos(a) * 15.5, 20 + Math.sin(a) * 15.5, 1.1, wood);
    p.ellipse(20 + Math.cos(a) * 16.2, 20 + Math.sin(a) * 16.2, 2.1, 2.1, wood);
  }
  p.ring(20, 20, 9.3, 13, (nx, ny, x, y, rf) => {
    let v = 0.55 - (nx + ny) * 0.25;
    if (rf < 0.25) v -= 0.25;
    else if (rf > 0.78) v -= 0.12;
    else v += 0.08;
    return rampPick(R_WOOD, v, x, y);
  });
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8 + TAU / 16;
    p.ellipse(20 + Math.cos(a) * 11.2, 20 + Math.sin(a) * 11.2, 1.3, 1.3, R_GOLD[3]);
  }
  p.ellipse(20, 20, 5, 5, gold);
  p.ellipse(20, 20, 1.7, 1.7, R_GOLD[0]);
}

function drawKatana(p, hx, hy, tx, ty, wrapA, wrapB) {
  const L = Math.hypot(tx - hx, ty - hy);
  const ux = (tx - hx) / L;
  const uy = (ty - hy) / L;
  const gx = hx + ux * 9;
  const gy = hy + uy * 9;
  const steel = shade(R_STEEL, { lx: -0.6, ly: -0.5, bias: 0.05 });
  p.stroke(gx, gy, tx - ux * 2, ty - uy * 2, 1.6, steel, 0.9);
  p.stroke(tx - ux * 3, ty - uy * 3, tx, ty, 0.9, steel, 0.55);
  const px = -uy;
  const py = ux;
  for (let i = 2; i < L - 12; i++) p.set(gx + ux * i + px * 1.1, gy + uy * i + py * 1.1, '#ffffff');
  p.stroke(hx, hy, gx, gy, 1.7, (nx, ny, x, y) => ((x + y) % 3 === 0 ? wrapB : wrapA));
  p.rotEllipse(gx, gy, 1.6, 4.4, Math.atan2(uy, ux), shade(R_GOLD));
  p.ellipse(hx, hy, 1.6, 1.6, R_GOLD[3]);
}

function drawSwords(p) {
  drawKatana(p, 34, 35, 5, 5, '#c8202c', '#2a0a14');
  drawKatana(p, 6, 35, 35, 5, '#1a1428', '#eee0bf');
}

const SYMBOLS = [
  { id: 'hat', value: 10000000, weight: 0.8, draw: (p) => drawStrawHat(p, 20, 23, 1) },
  { id: 'jolly', value: 5000000, weight: 1.0, draw: (p) => drawJolly(p, 20, 20, 1) },
  { id: 'fruit', value: 3000000, weight: 1.15, draw: drawFruit },
  { id: 'chest', value: 2000000, weight: 1.3, draw: drawChest },
  { id: 'swords', value: 1000000, weight: 1.4, draw: drawSwords },
  { id: 'meat', value: 500000, weight: 1.5, draw: drawMeat },
  { id: 'wheel', value: 250000, weight: 1.6, draw: drawWheel },
];

const CELL = 48;
const REEL_W = 64;
const WIN_H = 108;
const DRUM_R = 60;
const STRIP_N = 12;
const ROW_TH = new Float32Array(WIN_H);
const ROW_C = new Float32Array(WIN_H);
for (let r = 0; r < WIN_H; r++) {
  const th = Math.asin(clamp((r + 0.5 - WIN_H / 2) / DRUM_R, -1, 1));
  ROW_TH[r] = th;
  ROW_C[r] = (th * DRUM_R) / CELL;
}

const SPR = {};

function buildCoinFrames() {
  const out = [];
  for (let f = 0; f < 8; f++) {
    const a = (f / 8) * Math.PI;
    const k = Math.cos(a);
    const rx = Math.max(0.9, 5 * Math.abs(k));
    const p = new PX(12, 12);
    p.ellipse(6, 6, rx + 0.9, 5.4, (nx, ny, x, y) => rampPick(R_GOLD, 0.3 - ny * 0.15, x, y));
    p.ellipse(6 - Math.sign(k) * 0.5, 6, rx, 5.4, shade(R_GOLD, { lx: -0.5 * Math.sign(k || 1), ly: -0.7, bias: 0.08 }));
    if (rx > 2.6) {
      p.ellipse(6 - Math.sign(k) * 0.5, 6, rx * 0.55, 3, (nx, ny, x, y) => shiftColor(R_GOLD, p.get(x, y), -1));
      p.set(5 - Math.sign(k) * 0.5, 5, R_GOLD[4]);
    }
    p.outline(INK);
    out.push(p.toCanvas());
  }
  return out;
}

function buildMoon() {
  const p = new PX(52, 52);
  p.ellipse(26, 26, 23, 23, shade(R_MOON, { lx: -0.6, ly: -0.45, dith: 0.8, rim: 0.1 }));
  for (const [x, y, r] of [
    [18, 20, 4],
    [31, 30, 5.5],
    [22, 36, 3],
    [34, 16, 2.6],
    [14, 31, 2.2],
    [38, 38, 2],
  ]) {
    p.ellipse(x, y, r, r, (nx, ny, xx, yy) => shiftColor(R_MOON, p.get(xx, yy), ny < -0.3 ? -2 : -1));
  }
  return p.toCanvas();
}

function buildCloud(w, h, ramp, seed) {
  const p = new PX(w, h);
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = Math.floor(w / 9) + 3;
  for (let i = 0; i < n; i++) {
    const cx = w * 0.14 + r() * w * 0.72;
    const rr = h * 0.2 + r() * h * 0.26;
    const cy = h * 0.66 - r() * h * 0.22 - Math.sin((cx / w) * Math.PI) * h * 0.12;
    p.ellipse(cx, cy, rr * 1.35, rr, (nx, ny, x, y) => rampPick(ramp, 0.85 - (y / h) * 0.75 - ny * 0.08, x, y, 0.9), (x, y) => y < h * 0.84);
  }
  return p.toCanvas();
}

function drawMiniJolly(p, cx, cy) {
  const K = '#141020';
  p.stroke(cx - 6, cy - 3, cx + 6, cy + 6, 0.7, K);
  p.stroke(cx + 6, cy - 3, cx - 6, cy + 6, 0.7, K);
  p.ellipse(cx + 0.5, cy + 0.5, 4.2, 3.8, K);
  p.rect(cx - 1, cy + 3, 4, 2, K);
  p.set(cx - 1, cy + 1, '#e8dcc0');
  p.set(cx + 2, cy + 1, '#e8dcc0');
  p.ellipse(cx + 0.5, cy - 3, 5.8, 1.4, '#f5c542');
  p.ellipse(cx + 0.5, cy - 3.6, 2.8, 2.6, '#f5c542', (x, y) => y + 0.5 < cy - 3);
  p.rect(cx - 2, cy - 5, 6, 1, '#c8202c');
}

function buildShip(frame, gray) {
  const p = new PX(110, 80);
  const deckY = (x) => 47 - ((x - 4) * 6) / 94;
  p.poly(
    [
      [4, 47],
      [98, 41],
      [92, 58],
      [82, 67],
      [22, 69],
      [10, 61],
    ],
    (nx, ny, x, y) => {
      const d = y - deckY(x);
      if (d >= 3 && d < 5) return rampPick(R_GOLD, 0.8 - (d - 3) * 0.3, x, y);
      let v = 0.66 - d * 0.018 - nx * 0.06;
      if (d > 6 && Math.floor(d) % 5 === 0) v -= 0.25;
      return rampPick(R_WOOD, v, x, y, 0.45);
    },
  );
  for (const hx of [32, 46, 60, 74]) {
    const hy = Math.round(deckY(hx) + 10);
    p.ellipse(hx, hy, 2.2, 2.2, '#1a0c10');
    p.set(hx - 1, hy - 1, '#ffe98a');
  }
  p.poly(
    [
      [5, 33],
      [26, 32],
      [26, 46],
      [5, 47],
    ],
    (nx, ny, x, y) => rampPick(R_WOOD, 0.72 - ny * 0.2 + (x % 5 === 0 ? -0.22 : 0), x, y),
  );
  p.rect(4, 31, 24, 2, (nx, ny, x, y) => rampPick(R_GOLD, 0.7, x, y));
  for (const wx of [8, 14, 20]) {
    p.rect(wx, 37, 3, 4, '#ffd86a');
    p.set(wx, 37, '#fff8d0');
  }
  for (let x = 28; x < 96; x += 4) {
    const y = Math.round(deckY(x));
    p.rect(x, y - 4, 1, 4, R_WOOD[3]);
  }
  for (let x = 27; x < 97; x++) p.set(x, Math.round(deckY(x)) - 5, R_WOOD[4]);
  p.rect(48, 4, 3, 44, (nx, ny, x, y) => rampPick(R_WOOD, 0.7 - (x - 48) * 0.22, x, y));
  p.rect(74, 16, 2, 28, (nx, ny, x, y) => rampPick(R_WOOD, 0.62 - (x - 74) * 0.2, x, y));
  p.rect(44, 9, 11, 4, (nx, ny, x, y) => rampPick(R_WOOD, 0.5 - ny * 0.2, x, y));
  for (let y = 14; y <= 36; y++) {
    const u = (y - 14) / 22;
    const bul = Math.sin(Math.PI * u) * 4;
    const xl = Math.round(33 + bul * 0.5);
    const xr = Math.round(66 + bul);
    for (let x = xl; x <= xr; x++) {
      p.set(x, y, rampPick(R_BONE, 0.9 - ((x - xl) / (xr - xl)) * 0.35 - u * 0.12, x, y));
    }
  }
  p.rect(31, 13, 38, 2, R_WOOD[1]);
  p.rect(33, 37, 36, 1, R_WOOD[1]);
  drawMiniJolly(p, 50, 25);
  p.poly(
    [
      [77, 18],
      [93, 38],
      [77, 39],
    ],
    (nx, ny, x, y) => rampPick(R_BONE, 0.85 - (x - 77) * 0.015 - ny * 0.1, x, y),
  );
  for (let fx = 0; fx < 13; fx++) {
    const yo = Math.round(Math.sin(fx * 0.55 - (frame * TAU) / 4) * 1.4 * (fx / 12));
    for (let fy = 0; fy < 7; fy++) p.set(51 + fx, 1 + fy + yo, fy === 0 ? '#3a3150' : '#141020');
    if (fx >= 5 && fx <= 7) {
      p.set(51 + fx, 3 + yo, '#eee0bf');
      if (fx !== 6) p.set(51 + fx, 4 + yo, '#eee0bf');
    }
    if (fx === 5) p.set(51 + fx, 2 + yo, '#f5c542');
    if (fx === 6 || fx === 7) p.set(51 + fx, 2 + yo, '#f5c542');
  }
  const hx = 99;
  const hy = 37;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    p.stroke(hx, hy, hx + Math.cos(a) * 6.5, hy + Math.sin(a) * 6.5, 1.1, (nx, ny, x, y) => rampPick(R_STRAW, 0.3, x, y));
  }
  p.ellipse(hx, hy, 4, 4, shade(R_STRAW, { bias: 0.1 }));
  p.set(hx - 2, hy - 1, INK);
  p.set(hx + 1, hy - 1, INK);
  p.set(hx - 1, hy + 1, R_RED[2]);
  p.set(hx, hy + 1, R_RED[2]);
  p.outline(INK);
  const rope = '#3a2418';
  p.line(49, 5, 6, 31, rope);
  p.line(50, 5, 75, 17, rope);
  p.line(75, 17, 99, 31, rope);
  if (gray) p.d = p.d.map((c) => (c ? grayify(c) : 0));
  return p.toCanvas();
}

function buildBird(frame, color) {
  const rows = frame ? ['.......', '##...##', '..###..'] : ['#.....#', '.#...#.', '..#.#..'];
  const c = makeCanvas(7, 3);
  c.ctx.fillStyle = color;
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && c.ctx.fillRect(x, y, 1, 1)));
  return c;
}

function buildCellBg() {
  const p = new PX(REEL_W, CELL);
  const R = ['#a08a64', '#c4ae84', '#dccaa0', '#ead9b2', '#f4e6c4'];
  p.rect(0, 0, REEL_W, CELL, (nx, ny, x, y) => rampPick(R, 0.72 - nx * nx * 0.4 - ny * ny * 0.15, x, y, 0.6));
  p.rect(0, 0, REEL_W, 1, R[1]);
  p.rect(0, CELL - 1, REEL_W, 1, R[0]);
  return p.toCanvas();
}

function buildReelShade() {
  const c = makeCanvas(REEL_W, WIN_H);
  const img = c.ctx.createImageData(REEL_W, WIN_H);
  const u = new Uint32Array(img.data.buffer);
  const dark = u32c('#1a0c10', 190);
  const lite = u32c('#ffffff', 130);
  for (let r = 0; r < WIN_H; r++) {
    const th = ROW_TH[r];
    const d = Math.pow((1 - Math.cos(th)) / 0.56, 2.2) * 0.95;
    const hl = Math.exp(-Math.pow((th + 0.55) / 0.13, 2)) * 0.5;
    for (let x = 0; x < REEL_W; x++) {
      const e = x < 2 || x > REEL_W - 3 ? 0.4 : x < 4 || x > REEL_W - 5 ? 0.16 : 0;
      const b = bayerAt(x, r);
      if (b < d + e) u[r * REEL_W + x] = dark;
      else if (b < hl) u[r * REEL_W + x] = lite;
    }
  }
  c.ctx.putImageData(img, 0, 0);
  return c;
}

function buildGlass() {
  const w = 208;
  const h = WIN_H;
  const c = makeCanvas(w, h);
  const img = c.ctx.createImageData(w, h);
  const u = new Uint32Array(img.data.buffer);
  const a = u32c('#ffffff', 34);
  const b = u32c('#ffffff', 22);
  const sh = u32c('#05020a', 150);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = x + y * 0.9;
      const i = y * w + x;
      if (y < 4 && bayerAt(x, y) < 1 - y / 4) u[i] = sh;
      else if (x < 3 && bayerAt(x, y) < 0.7 - x / 4) u[i] = sh;
      else if (s > 20 && s < 44) u[i] = a;
      else if (s > 52 && s < 58) u[i] = b;
      else if (s > 150 && s < 162) u[i] = b;
    }
  }
  c.ctx.putImageData(img, 0, 0);
  return c;
}

function buildPillar() {
  const p = new PX(8, WIN_H);
  const cols = [0.25, 0.55, 0.95, 0.8, 0.6, 0.5, 0.35, 0.15];
  p.rect(0, 0, 8, WIN_H, (nx, ny, x, y) => rampPick(R_GOLD, cols[x] - Math.abs(ny) * 0.2, x, y, 0.4));
  for (let y = 10; y < WIN_H; y += 22) {
    p.set(3, y, R_GOLD[4]);
    p.set(4, y, R_GOLD[4]);
    p.set(3, y + 1, R_GOLD[1]);
    p.set(4, y + 1, R_GOLD[1]);
  }
  return p.toCanvas();
}

function bevelRect(p, x0, y0, w, h, thick, ramp, base = 0.62) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dl = x - x0;
      const dr = x0 + w - 1 - x;
      const dt = y - y0;
      const db = y0 + h - 1 - y;
      const m = Math.min(dl, dr, dt, db);
      if (m >= thick) continue;
      const lt = dl === m || dt === m;
      let v = base + Math.sin((x + y) * 0.13) * 0.12;
      if (m === 0) v = lt ? 0.95 : 0.2;
      else if (m === thick - 1 && thick > 2) v = lt ? 0.22 : 0.88;
      p.set(x, y, rampPick(ramp, v, x, y, 0.4));
    }
  }
}

function roundTopPoly(x0, y0, w, h, r) {
  const pts = [[x0, y0 + h]];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * (Math.PI / 2);
    pts.push([x0 + r + Math.cos(a) * r, y0 + r + Math.sin(a) * r]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
    pts.push([x0 + w - r + Math.cos(a) * r, y0 + r + Math.sin(a) * r]);
  }
  pts.push([x0 + w, y0 + h]);
  return pts;
}

function buildMachine() {
  const p = new PX(300, 238);
  const wood = (nx, ny, x, y) => {
    let v = 0.5 - ny * 0.1 - Math.abs(nx) * 0.14;
    const px = (x - 10) % 18;
    if (px === 0) v -= 0.3;
    else if (px === 1) v += 0.1;
    if ((x * 7 + (y >> 2) * 13) % 23 === 0) v -= 0.14;
    return rampPick(R_WOOD, v, x, y, 0.4);
  };
  p.rect(0, 216, 300, 22, (nx, ny, x, y) => rampPick(R_WOOD, 0.34 - ny * 0.16 + ((x % 25 === 0) ? -0.15 : 0), x, y));
  bevelRect(p, 0, 216, 300, 22, 2, R_GOLD, 0.6);
  p.poly(
    [
      [3, 52],
      [10, 44],
      [10, 216],
      [3, 212],
    ],
    (nx, ny, x, y) => rampPick(R_WOOD, 0.26 - ny * 0.05, x, y),
  );
  p.poly(
    [
      [290, 44],
      [297, 52],
      [297, 212],
      [290, 216],
    ],
    (nx, ny, x, y) => rampPick(R_WOOD, 0.14, x, y),
  );
  p.rect(10, 44, 280, 172, wood);
  bevelRect(p, 10, 44, 280, 172, 3, R_GOLD);
  p.rect(2, 40, 296, 7, (nx, ny, x, y) => rampPick(R_GOLD, 0.92 - ((y - 40) / 7) * 0.72 + Math.sin(x * 0.09) * 0.08, x, y, 0.35));
  const outer = roundTopPoly(28, 0, 244, 42, 16);
  p.poly(outer, (nx, ny, x, y) => rampPick(R_GOLD, 0.66 - ny * 0.25 + Math.sin((x + y) * 0.12) * 0.12, x, y, 0.4));
  const inner = roundTopPoly(33, 5, 234, 36, 12);
  p.poly(inner, (nx, ny, x, y) => {
    const d = nx * nx * 0.7 + (ny + 0.1) * (ny + 0.1);
    let v = 0.62 - d * 0.42;
    const a = Math.atan2(y - 24, x - 150);
    if (Math.floor(((a / TAU) * 28 + 100) % 2) === 0) v -= 0.07;
    return rampPick(R_RED, v, x, y, 0.7);
  });
  bevelRect(p, 38, 62, 224, 124, 8, R_GOLD);
  p.rect(46, 70, 208, 108, '#07040a');
  p.rect(40, 190, 220, 24, (nx, ny, x, y) => rampPick(R_WOOD, 0.24 - ny * 0.08, x, y));
  bevelRect(p, 40, 190, 220, 24, 2, R_GOLD);
  bevelRect(p, 104, 193, 92, 19, 3, R_GOLD);
  p.rect(107, 196, 86, 13, (nx, ny, x, y) => rampPick(R_BLACK, 0.1 + (ny + 1) * 0.22, x, y, 0.8));
  for (const gx of [70, 230]) {
    p.ring(gx, 202, 6, 8, (nx, ny, x, y) => rampPick(R_GOLD, 0.6 - (nx + ny) * 0.3, x, y));
    p.ellipse(gx, 202, 6, 6, shade(R_RED, { bias: 0.05 }));
    p.set(gx - 3, 199, '#ffffff');
  }
  for (const [gx, gy] of [
    [42, 66],
    [257, 66],
    [42, 181],
    [257, 181],
  ]) {
    p.ellipse(gx + 0.5, gy + 0.5, 3.2, 3.2, shade(R_CYAN, { bias: 0.05 }));
  }
  for (let x = 20; x < 290; x += 20) {
    p.set(x, 218, R_GOLD[4]);
    p.set(x, 235, R_GOLD[4]);
  }
  p.outline(INK);
  return p.toCanvas();
}

function machineBulbs() {
  const b = [];
  for (let x = 48; x <= 252; x += 12) b.push([x, 2]);
  b.push([36, 7], [264, 7], [30, 18], [270, 18], [30, 30], [270, 30]);
  for (let y = 56; y <= 208; y += 13) {
    b.push([11, y]);
    b.push([288, y]);
  }
  for (let x = 16; x <= 284; x += 12) b.push([x, 227]);
  return b;
}

function buildTorch() {
  const p = new PX(30, 70);
  p.rect(12, 14, 6, 56, (nx, ny, x, y) => rampPick(R_WOOD, 0.62 - nx * 0.3, x, y));
  for (let y = 22; y < 70; y += 9) p.rect(11, y, 8, 2, (nx, ny, x, y2) => rampPick(R_WOOD, 0.3, x, y2));
  p.poly(
    [
      [1, 2],
      [29, 2],
      [24, 14],
      [6, 14],
    ],
    (nx, ny, x, y) => rampPick(R_GOLD, 0.7 - nx * 0.3 - ny * 0.15, x, y, 0.4),
  );
  p.rect(1, 0, 28, 3, (nx, ny, x, y) => rampPick(R_GOLD, 0.95 - nx * 0.2, x, y));
  p.outline(INK);
  return p.toCanvas();
}

function buildSprites() {
  for (const s of SYMBOLS) {
    const p = new PX(40, 40);
    s.draw(p);
    p.outline(INK);
    s.img = p.toCanvas();
    s.white = silhouette(s.img, '#ffffff');
    s.x2 = scaled(s.img, 2);
    s.x3 = scaled(s.img, 3);
    s.white3 = silhouette(s.x3, '#ffffff');
    s.back3 = silhouette(s.x3, '#b8681a');
  }
  SPR.coin = buildCoinFrames();
  SPR.moon = buildMoon();
  SPR.cloudNight = [0, 1, 2].map((i) => buildCloud(90 + i * 20, 30 + i * 4, ['#141030', '#221c48', '#352c68', '#50448c', '#7466b0'], 11 + i * 7));
  SPR.cloudSunset = [0, 1, 2].map((i) => buildCloud(80 + i * 26, 26 + i * 5, ['#4a1440', '#7a2050', '#c03c5a', '#f07a60', '#ffb870'], 31 + i * 5));
  SPR.cloudStorm = [0, 1, 2, 3].map((i) => buildCloud(140 + i * 30, 40 + i * 6, ['#07080f', '#0e111c', '#161b2c', '#222a40', '#323c58'], 71 + i * 3));
  SPR.ship = [0, 1, 2, 3].map((f) => buildShip(f, false));
  SPR.shipGray = [0, 1, 2, 3].map((f) => buildShip(f, true));
  SPR.birdDark = [0, 1].map((f) => buildBird(f, '#2a0c24'));
  SPR.cellBg = buildCellBg();
  SPR.reelShade = buildReelShade();
  SPR.glass = buildGlass();
  SPR.pillar = buildPillar();
  SPR.machine = buildMachine();
  SPR.bulbs = machineBulbs();
  SPR.torch = buildTorch();
  SPR.jolly2 = scaled(SYMBOLS[1].img, 2);
}
