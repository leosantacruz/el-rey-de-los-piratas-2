'use strict';

const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '¡': ['..#..', '.....', '..#..', '..#..', '..#..', '..#..', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '>': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
  '<': ['....#', '...##', '..###', '.####', '..###', '...##', '....#'],
};

const NARROW = new Set(['!', '¡', '.', ',', ':', "'"]);
const ACCENTED = { Á: ['A', 'acute'], É: ['E', 'acute'], Í: ['I', 'acute'], Ó: ['O', 'acute'], Ú: ['U', 'acute'], Ñ: ['N', 'tilde'] };
const ACCENT_ROWS = {
  none: ['.....', '.....', '.....'],
  acute: ['...#.', '..#..', '.....'],
  tilde: ['.##.#', '#..#.', '.....'],
};

const glyphInfoCache = new Map();
function glyphInfo(ch) {
  let g = glyphInfoCache.get(ch);
  if (g) return g;
  if (ch === ' ') {
    g = { rows: Array(10).fill('...'), w: 3 };
  } else {
    let base = GLYPHS[ch];
    let acc = ACCENT_ROWS.none;
    if (ACCENTED[ch]) {
      base = GLYPHS[ACCENTED[ch][0]];
      acc = ACCENT_ROWS[ACCENTED[ch][1]];
    }
    if (!base) base = GLYPHS['?'];
    let x0 = 0;
    let x1 = 4;
    if (NARROW.has(ch)) {
      x0 = 4;
      x1 = 0;
      for (const r of base) {
        for (let i = 0; i < 5; i++) {
          if (r[i] === '#') {
            x0 = Math.min(x0, i);
            x1 = Math.max(x1, i);
          }
        }
      }
    }
    g = { rows: [...acc, ...base].map((r) => r.slice(x0, x1 + 1)), w: x1 - x0 + 1 };
  }
  glyphInfoCache.set(ch, g);
  return g;
}

const glyphCache = new Map();
function glyphSprite(ch, st) {
  const key = st.id + '|' + ch;
  let c = glyphCache.get(key);
  if (c) return c;
  const s = st.s;
  const info = glyphInfo(ch);
  const gw = info.w * s;
  const gh = 10 * s;
  const o = st.outline ? 1 : 0;
  const d = st.depth || 0;
  const cw = gw + o * 2;
  const chh = gh + o * 2 + d;
  const mask = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      mask[y * gw + x] = info.rows[(y / s) | 0][(x / s) | 0] === '#' ? 1 : 0;
    }
  }
  const layer = new Uint8Array(cw * chh);
  const col = new Array(cw * chh);
  if (d > 0) {
    const dc = st.depthColors;
    for (let k = d; k >= 1; k--) {
      const c2 = dc[Math.min(dc.length - 1, Math.floor(((k - 1) * dc.length) / d))];
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          if (!mask[y * gw + x]) continue;
          const i = (y + o + k) * cw + x + o;
          layer[i] = 2;
          col[i] = c2;
        }
      }
    }
  }
  const fill = st.fill;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!mask[y * gw + x]) continue;
      const cy = y - 3 * s;
      const t = cy < 0 ? 0 : cy / (7 * s);
      let c2 = fill[Math.min(fill.length - 1, Math.floor(t * fill.length))];
      if (s >= 2) {
        const up = y > 0 && mask[(y - 1) * gw + x];
        const dn = y < gh - 1 && mask[(y + 1) * gw + x];
        if (!up && st.hi) c2 = st.hi;
        else if (!dn && st.sh) c2 = st.sh;
      }
      const i = (y + o) * cw + x + o;
      layer[i] = 1;
      col[i] = c2;
    }
  }
  c = makeCanvas(cw, chh);
  const img = c.ctx.createImageData(cw, chh);
  const u = new Uint32Array(img.data.buffer);
  const oc = st.outline ? u32c(st.outline) : 0;
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (layer[i]) {
        u[i] = u32c(col[i]);
      } else if (oc) {
        const n =
          (x > 0 && layer[i - 1]) ||
          (x < cw - 1 && layer[i + 1]) ||
          (y > 0 && layer[i - cw]) ||
          (y < chh - 1 && layer[i + cw]);
        if (n) u[i] = oc;
      }
    }
  }
  c.ctx.putImageData(img, 0, 0);
  c.o = o;
  glyphCache.set(key, c);
  return c;
}

function layoutText(str, s, sp = 1) {
  const items = [];
  let x = 0;
  for (const ch of str) {
    const w = glyphInfo(ch).w * s;
    items.push({ ch, x, w });
    x += w + sp * s;
  }
  return { items, w: Math.max(0, x - sp * s) };
}

const textWidth = (str, s, sp = 1) => layoutText(str, s, sp).w;

function drawGlyph(ctx, ch, st, x, y, scale = 1) {
  if (ch === ' ') return;
  const spr = glyphSprite(ch, st);
  const s = st.s;
  const ox = x - spr.o;
  const oy = y - 3 * s - spr.o;
  if (scale === 1) {
    ctx.drawImage(spr, Math.round(ox), Math.round(oy));
    return;
  }
  const cx = x + (glyphInfo(ch).w * s) / 2;
  const cy = y + 3.5 * s;
  const w = spr.width * scale;
  const h = spr.height * scale;
  ctx.drawImage(spr, Math.round(cx - (cx - ox) * scale), Math.round(cy - (cy - oy) * scale), Math.round(w), Math.round(h));
}

function drawText(ctx, str, x, y, st, opt = {}) {
  const lay = layoutText(str, st.s, opt.sp ?? 1);
  const bx = opt.align === 'center' ? Math.round(x - lay.w / 2) : opt.align === 'right' ? Math.round(x - lay.w) : x;
  const n = opt.count ?? lay.items.length;
  for (let i = 0; i < Math.min(n, lay.items.length); i++) {
    const it = lay.items[i];
    if (it.ch === ' ') continue;
    let dx = 0;
    let dy = 0;
    let sc = 1;
    let s2 = st;
    if (opt.fx) {
      const r = opt.fx(i, it.ch);
      if (r === null) continue;
      if (r) {
        dx = r.x || 0;
        dy = r.y || 0;
        sc = r.sc ?? 1;
        s2 = r.st || st;
      }
    }
    drawGlyph(ctx, it.ch, s2, bx + it.x + dx, y + dy, sc);
  }
  return lay.w;
}

function makeHueStyle(id, h, s, depth = 4) {
  return {
    id,
    s,
    fill: [hsv(h, 0.18, 1), hsv(h, 0.5, 1), hsv(h, 0.78, 1), hsv(h, 0.9, 0.92), hsv(h, 1, 0.78)],
    hi: '#ffffff',
    sh: hsv(h, 1, 0.42),
    outline: '#12040a',
    depth,
    depthColors: [hsv(h, 1, 0.5), hsv(h, 1, 0.36), hsv(h, 1, 0.22)],
  };
}

const ST = {
  titleBig: {
    id: 'titleBig',
    s: 9,
    fill: ['#fffbe0', '#ffec70', '#ffcc20', '#ff9e14', '#f86c10', '#dc4218', '#b02418'],
    hi: '#ffffff',
    sh: '#6a1008',
    outline: '#12040a',
    depth: 8,
    depthColors: ['#a82414', '#861a10', '#64120c', '#460c0a', '#2c0808'],
  },
  titleSmall: {
    id: 'titleSmall',
    s: 4,
    fill: ['#ffffff', '#fff4c8', '#ffe07a', '#ffc440', '#f09a26'],
    hi: '#ffffff',
    sh: '#8a4a10',
    outline: '#12040a',
    depth: 3,
    depthColors: ['#b0601a', '#7a3a10', '#4a200a'],
  },
  prompt: {
    id: 'prompt',
    s: 2,
    fill: ['#ffffff', '#f4f0ff', '#d8d0f0'],
    hi: '#ffffff',
    sh: '#8a80b0',
    outline: '#0a0410',
    depth: 2,
    depthColors: ['#3a2a60', '#1a1030'],
  },
  promptGold: {
    id: 'promptGold',
    s: 2,
    fill: ['#fffbd0', '#ffe060', '#ffb020'],
    hi: '#ffffff',
    sh: '#a05a10',
    outline: '#0a0410',
    depth: 2,
    depthColors: ['#8a3a10', '#4a1a08'],
  },
  sub: {
    id: 'sub',
    s: 2,
    fill: ['#ffffff', '#e8e4f8', '#c8c0e8'],
    hi: '#ffffff',
    sh: '#8078a8',
    outline: '#05020a',
    depth: 0,
  },
  slam: {
    id: 'slam',
    s: 5,
    fill: ['#fffbe0', '#ffe45c', '#ffb81e', '#ff8414', '#e8501a'],
    hi: '#ffffff',
    sh: '#7a1a08',
    outline: '#12040a',
    depth: 5,
    depthColors: ['#a02414', '#6a140c', '#3a0a08'],
  },
  marquee: {
    id: 'marquee',
    s: 3,
    fill: ['#fffbe0', '#ffe45c', '#ffc21e', '#ff9414'],
    hi: '#ffffff',
    sh: '#8a3a08',
    outline: '#2a0408',
    depth: 2,
    depthColors: ['#7a1a0c', '#4a0c08'],
  },
  marqueeOff: {
    id: 'marqueeOff',
    s: 3,
    fill: ['#6a3a2a', '#5a2e22', '#4a241c'],
    hi: '#7a4a38',
    sh: '#2a120c',
    outline: '#1a0406',
    depth: 2,
    depthColors: ['#2a0a08', '#1a0606'],
  },
  treasure: {
    id: 'treasure',
    s: 6,
    fill: ['#fffbe0', '#fff080', '#ffd22a', '#ffaa18', '#f07a14'],
    hi: '#ffffff',
    sh: '#8a3a08',
    outline: '#12040a',
    depth: 5,
    depthColors: ['#b0501a', '#7a2c10', '#4a1608'],
  },
  count: {
    id: 'count',
    s: 3,
    fill: ['#fffbe0', '#fff080', '#ffd22a', '#ffa018'],
    hi: '#ffffff',
    sh: '#8a3a08',
    outline: '#12040a',
    depth: 3,
    depthColors: ['#a04a14', '#6a2a0c', '#3a1406'],
  },
  lose: {
    id: 'lose',
    s: 8,
    fill: ['#e8eef8', '#b8c4d8', '#8a98b0', '#66728c', '#4a546c'],
    hi: '#ffffff',
    sh: '#1e2436',
    outline: '#04060c',
    depth: 7,
    depthColors: ['#2e364c', '#222838', '#161a28', '#0c0e18'],
  },
  loseSmall: {
    id: 'loseSmall',
    s: 4,
    fill: ['#d8e0ec', '#a8b4c8', '#7a88a0', '#5a667e'],
    hi: '#f0f4ff',
    sh: '#1e2436',
    outline: '#04060c',
    depth: 3,
    depthColors: ['#2a3246', '#161a28'],
  },
  loseSub: {
    id: 'loseSub',
    s: 2,
    fill: ['#c8d0e0', '#a0acc0', '#7a869c'],
    hi: '#e8eef8',
    sh: '#3a4458',
    outline: '#04060c',
    depth: 0,
  },
  small: {
    id: 'small',
    s: 1,
    fill: ['#ffffff'],
    outline: '#05020a',
    depth: 0,
  },
};

const HUE_STYLES7 = [0, 0.07, 0.14, 0.3, 0.5, 0.62, 0.78, 0.9].map((h, i) => makeHueStyle('hue7_' + i, h, 7, 5));
const HUE_STYLES2 = [0, 0.07, 0.14, 0.3, 0.5, 0.62, 0.78, 0.9].map((h, i) => makeHueStyle('hue2_' + i, h, 2, 2));
