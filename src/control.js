'use strict';

const LANDSCAPE = W > H;
const BX = W / 2;
const BR = LANDSCAPE ? Math.round(H * 0.29) : Math.min(Math.round(W * 0.42), Math.round(H * 0.23));
const BY = LANDSCAPE ? Math.round(H * 0.5) : Math.round(H * 0.47);
const CAP_R = BR - 15;
const TRAVEL = 8;
const SEA_Y = H - (LANDSCAPE ? 30 : 64);
const WHEEL_R = BR + 27;
const BULBS = 20;

const ST_STATUS = {
  ok: { id: 'ctlOk', s: 1, fill: ['#b8ff8a'], outline: '#05020a', depth: 0 },
  wait: { id: 'ctlWait', s: 1, fill: ['#c8c0e8'], outline: '#05020a', depth: 0 },
  err: { id: 'ctlErr', s: 1, fill: ['#ff7a6a'], outline: '#05020a', depth: 0 },
  gold: { id: 'ctlGold', s: 1, fill: ['#ffe060'], outline: '#05020a', depth: 0 },
};

function buildSky() {
  const c = makeCanvas(W, H);
  paintGradient(c.ctx, 0, 0, W, SEA_Y + 8, ['#04020f', '#0a0826', '#1a0c36', '#2e1040', '#4a1238', '#6e1a30', '#942a26']);
  c.ctx.fillStyle = '#ffffff';
  for (let i = 0; i < Math.round((W * H) / 900); i++) c.ctx.fillRect(randi(0, W - 1), randi(0, SEA_Y * 0.7), 1, 1);
  return c;
}

function buildBezel() {
  const s = BR * 2 + 4;
  const c = s / 2;
  const p = new PX(s, s);
  p.ellipse(c, c, BR, BR, shade(R_GOLD, { lx: -0.5, ly: -0.7, rim: 0.4, dith: 0.6 }));
  p.ellipse(c, c, BR - 7, BR - 7, (nx, ny, x, y) => rampPick(R_GOLD, 0.45 + nx * 0.28 + ny * 0.34, x, y, 0.7));
  p.ring(c, c, BR - 7.5, BR - 6.5, (nx, ny) => (nx + ny < 0 ? R_GOLD[1] : R_GOLD[4]));
  p.ellipse(c, c, CAP_R + 3, CAP_R + 3, '#12081a');
  p.outline(INK);
  return p.toCanvas();
}

function buildCap() {
  const s = CAP_R * 2 + 4;
  const c = s / 2;
  const p = new PX(s, s);
  p.ellipse(c, c, CAP_R, CAP_R, shade(R_RED, { lx: -0.45, ly: -0.65, rim: 0.3, dith: 0.7, bias: -0.08 }));
  p.ring(c, c, CAP_R * 0.8, CAP_R * 0.86, (nx, ny, x, y) => shiftColor(R_RED, p.get(x, y), nx * 0.5 + ny < 0 ? -1 : 1));
  p.rotEllipse(c - CAP_R * 0.45, c - CAP_R * 0.5, CAP_R * 0.3, CAP_R * 0.11, -0.7, (nx, ny, x, y) =>
    nx * nx + ny * ny < 0.3 || bayerAt(x, y) < 0.45 ? '#ffc4b0' : null,
  );
  drawJolly(p, c, c + CAP_R * 0.1, CAP_R / 33);
  p.outline(INK);
  return p.toCanvas();
}

function buildSkirt() {
  const s = CAP_R * 2 + 4;
  const c = s / 2;
  const p = new PX(s, s);
  p.ellipse(c, c, CAP_R, CAP_R, (nx, ny, x, y) => rampPick(R_RED, 0.4 - nx * 0.3 - (Math.abs(nx) > 0.88 ? 0.2 : 0), x, y, 0.5));
  return p.toCanvas();
}

function buildWheel() {
  const s = WHEEL_R * 2 + 8;
  const c = s / 2;
  const p = new PX(s, s);
  const r1 = BR + 7;
  const r2 = BR + 14;
  const wood = (nx, ny, x, y) => rampPick(R_WOOD, 0.58 - nx * 0.22 - ny * 0.26 - ((x * 3 + y * 5) % 11 === 0 ? 0.18 : 0), x, y, 0.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    p.stroke(c + ca * (BR - 6), c + sa * (BR - 6), c + ca * (r2 + 2), c + sa * (r2 + 2), 3.2, wood);
    p.stroke(c + ca * (r2 + 1), c + sa * (r2 + 1), c + ca * (WHEEL_R - 3), c + sa * (WHEEL_R - 3), 1.8, wood, 2.8);
    p.ellipse(c + ca * (WHEEL_R - 1), c + sa * (WHEEL_R - 1), 3.4, 3.4, shade(R_WOOD, { lx: -0.5, ly: -0.7, rim: 0.3 }));
  }
  p.ring(c, c, r1, r2, (nx, ny, x, y, e) =>
    rampPick(R_WOOD, 0.3 + (0.5 - Math.abs(e - 0.5)) * 0.7 - (nx + ny) * 0.18 - ((x * 5 + y * 3) % 13 === 0 ? 0.15 : 0), x, y, 0.6),
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8 + 1 / 16) * TAU;
    p.ellipse(c + Math.cos(a) * (r1 + r2) * 0.5, c + Math.sin(a) * (r1 + r2) * 0.5, 2.2, 2.2, shade(R_GOLD, { lx: -0.5, ly: -0.7 }));
  }
  p.outline(INK);
  return p.toCanvas();
}

const Ctl = {
  t: 0,
  held: 0,
  depth: TRAVEL,
  dv: 0,
  pressAge: 99,
  presses: 0,
  wheelAng: 0,
  wheelVel: 0.2,
  online: undefined,
  netErr: 0,
  lastSend: 0,
  emberAcc: 0,
  sparkAcc: 0,
  nextStar: 3,
  clouds: [],
};

const view = document.getElementById('view');
const screenC = makeCanvas(W, H);
const sctx = screenC.ctx;
const usePost = Post.init(view);
const ctx2d = usePost ? null : view.getContext('2d');

SPR.coin = buildCoinFrames();
SPR.moon = buildMoon();
SPR.cloudNight = [0, 1, 2].map((i) => buildCloud(90 + i * 20, 30 + i * 4, ['#141030', '#221c48', '#352c68', '#50448c', '#7466b0'], 11 + i * 7));
SPR.ship = [0, 1, 2, 3].map((f) => buildShip(f, false));
const sky = buildSky();
const bezel = buildBezel();
const cap = buildCap();
const capWhite = silhouette(cap, '#ffffff');
const skirt = buildSkirt();
const wheel = buildWheel();
const capFx = makeCanvas(cap.width, cap.height);
const rays = new Rays(BX, BY);
const twinkle = Array.from({ length: Math.round(W / 6) }, () => ({ x: randi(0, W - 1), y: randi(0, SEA_Y * 0.7), p: rand(0, TAU), s: rand(1.5, 4), b: Math.random() < 0.2 }));
Ctl.clouds = [
  { s: SPR.cloudNight[2], x: W * 0.5, y: SEA_Y * 0.18, v: -5 },
  { s: SPR.cloudNight[0], x: -20, y: SEA_Y * 0.42, v: -3 },
  { s: SPR.cloudNight[1], x: W * 0.8, y: SEA_Y * 0.62, v: -8 },
];

resetFx();
fx.vig = 0.55;
fx.bloom1 = 0.9;
fx.threshold = 0.62;

function press() {
  Sound.unlock();
  Ctl.pressAge = 0;
  Ctl.presses++;
  Ctl.wheelVel += 5.5;
  shake(0.45);
  kick(0.05);
  flash(0.3, [1, 0.55, 0.35], 4);
  aberrate(1.4);
  shockwave(BX, BY, 0.05, 0.9, 1.1);
  addRing(BX, BY, { r0: CAP_R, speed: 260, life: 0.45, ramp: RAMP.fire, thick: 3, layer: 1 });
  addRing(BX, BY, { r0: BR, speed: 150, life: 0.6, ramp: RAMP.gold, thick: 1, layer: 1 });
  burst(BX, BY, 16, { speed: [140, 280], angle: -Math.PI / 2, spread: 1.1, life: [0.9, 1.5], kind: K.COIN, g: 420, spin: [0.6, 1.6], layer: 1 });
  burst(BX, BY, 30, { speed: [80, 240], life: [0.3, 0.7], kind: K.SPARK, ramp: RAMP.gold, drag: 2, layer: 1 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + rand(-0.1, 0.1);
    const v = rand(30, 80);
    spawn({ x: BX + Math.cos(a) * BR, y: BY + Math.sin(a) * BR, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 12, life: rand(0.6, 1.1), kind: K.SMOKE, ramp: RAMP.smoke, size: 3, size2: 10, drag: 2.5, layer: 1, alpha: 0.8 });
  }
  Sound.boom();
  Sound.thud(0.7);
  for (let i = 0; i < 3; i++) setTimeout(() => Sound.coin(i), 90 + i * 70);
  if (navigator.vibrate) navigator.vibrate([25, 30, 70]);
  send();
}

async function send() {
  const now = performance.now();
  if (now - Ctl.lastSend < 150) return;
  Ctl.lastSend = now;
  try {
    const r = await fetch('/api/press', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: NET.room }),
      keepalive: true,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    Ctl.netErr = 0;
  } catch (e) {
    console.warn(e);
    Ctl.netErr = 3;
  }
}

async function poll() {
  if (document.hidden) return;
  try {
    const r = await fetch('/api/status?room=' + encodeURIComponent(NET.room), { cache: 'no-store' });
    const j = await r.json();
    Ctl.online = r.ok ? j.online : null;
  } catch (e) {
    Ctl.online = null;
  }
}

let wakeLock = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || wakeLock || document.hidden) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch (e) {
    wakeLock = null;
  }
}

let gestured = false;
function firstGesture() {
  if (gestured) return;
  gestured = true;
  keepAwake();
  const el = document.documentElement;
  if (document.fullscreenEnabled && !document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
}

function down() {
  Ctl.held++;
  press();
  firstGesture();
}
const up = () => (Ctl.held = Math.max(0, Ctl.held - 1));

window.addEventListener(
  'pointerdown',
  (e) => {
    e.preventDefault();
    down();
  },
  { passive: false },
);
window.addEventListener('pointerup', up);
window.addEventListener('pointercancel', up);
window.addEventListener('blur', () => (Ctl.held = 0));
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.repeat || !['Space', 'Enter'].includes(e.code)) return;
  e.preventDefault();
  down();
});
window.addEventListener('keyup', (e) => {
  if (['Space', 'Enter'].includes(e.code)) up();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  keepAwake();
  poll();
});

function update(dt) {
  const t = (Ctl.t += dt);
  Ctl.pressAge += dt;
  Ctl.netErr = Math.max(0, Ctl.netErr - dt);
  const target = Ctl.held ? 1 : TRAVEL + Math.sin(t * 2.2) * 0.6;
  Ctl.dv += ((target - Ctl.depth) * 900 - Ctl.dv * 20) * dt;
  Ctl.depth = clamp(Ctl.depth + Ctl.dv * dt, 0, TRAVEL + 3);
  Ctl.wheelVel = damp(Ctl.wheelVel, 0.2, 1.1, dt);
  Ctl.wheelAng += Ctl.wheelVel * dt;
  for (const c of Ctl.clouds) {
    c.x += c.v * dt;
    if (c.x < -c.s.width) c.x = W + rand(0, 40);
  }
  Ctl.emberAcc += dt * 26;
  while (Ctl.emberAcc >= 1) {
    Ctl.emberAcc--;
    spawn({ x: rand(0, W), y: rand(SEA_Y - 10, H), vx: rand(-8, 8), vy: rand(-70, -30), life: rand(1.4, 3.2), kind: K.EMBER, ramp: RAMP.fire, sway: rand(10, 26), flicker: 0.15, size: Math.random() < 0.2 ? 2 : 1, size2: 1 });
  }
  Ctl.sparkAcc += dt * 7;
  while (Ctl.sparkAcc >= 1) {
    Ctl.sparkAcc--;
    const a = rand(0, TAU);
    const r = BR + rand(4, 34);
    spawn({ x: BX + Math.cos(a) * r, y: BY + Math.sin(a) * r, vy: -8, life: rand(0.4, 0.8), kind: K.STAR, ramp: RAMP.gold, size: randi(1, 2), layer: 1 });
  }
  if (t > Ctl.nextStar) {
    Ctl.nextStar = t + rand(3, 7);
    const x = rand(W * 0.1, W * 0.9);
    spawn({ x, y: rand(10, SEA_Y * 0.35), vx: rand(160, 220) * (x > W / 2 ? -1 : 1), vy: rand(50, 90), life: 0.5, kind: K.SPARK, ramp: RAMP.white });
  }
  updateFx(dt);
  updateCamFx(dt, t);
}

function drawSky(ctx, t) {
  ctx.drawImage(sky, 0, 0);
  for (const s of twinkle) {
    const b = Math.sin(t * s.s + s.p);
    if (b < -0.3) continue;
    ctx.fillStyle = b > 0.7 ? '#ffffff' : '#8a7ab0';
    if (s.b && b > 0.6) pxStar(ctx, s.x, s.y, 1);
    else ctx.fillRect(s.x, s.y, 1, 1);
  }
  const mx = LANDSCAPE ? W - 70 : W - 60;
  const my = LANDSCAPE ? 14 : Math.max(14, Math.round(BY - WHEEL_R - 58));
  ditherDisc(ctx, mx + 26, my + 26, 36 + Math.sin(t * 1.3) * 2, '#7c83b8', 3);
  ctx.drawImage(SPR.moon, mx, my);
  for (const c of Ctl.clouds) ctx.drawImage(c.s, Math.round(c.x), Math.round(c.y));
  const hot = Math.exp(-Ctl.pressAge * 3);
  const col = mixHex('#3a0f2c', '#a8341c', Math.round(hot * 16) / 16);
  ctx.drawImage(rays.render(14, t * 0.04 + Ctl.wheelAng * 0.05, u32c(col), 0, 30, Math.max(W, H) * 0.75), 0, 0);
  return mx;
}

function drawSea(ctx, t, moonX) {
  drawWaves(ctx, t, SEA_Y, 1.5, 0.05, 1.2, '#0c1438', '#26306a');
  for (let i = 0; i < 6; i++) {
    const w = Math.round(6 + Math.sin(t * 3 + i * 1.7) * 3 + (6 - i) * 2);
    ctx.fillStyle = i % 2 ? '#7c83b8' : '#c4c8e6';
    ctx.fillRect(Math.round(moonX + 26 - w / 2 + Math.sin(t * 2 + i) * 2), SEA_Y + 3 + i * 4, w, 1);
  }
  const span = W + 160;
  const sx = Math.round(mod(t * 9, span) - 130);
  const bob = Math.round(Math.sin(t * 1.6) * 1.5);
  ctx.drawImage(SPR.ship[((t * 5) | 0) & 3], sx, SEA_Y - 48 + bob);
  drawWaves(ctx, t, SEA_Y + 14, 2.5, 0.04, 1.8, '#101c4a', '#3a4c90', 1.3);
  drawWaves(ctx, t, SEA_Y + 36, 3.5, 0.03, 2.4, '#0a1236', '#4a5ca8', 2.6);
}

function drawButton(ctx, t) {
  const hot = Math.exp(-Ctl.pressAge * 4);
  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  ditherDisc(ctx, BX, BY, WHEEL_R + 6 + pulse * 3, '#8a1224', 2 + pulse * 2 + hot * 8);
  ditherDisc(ctx, BX, BY, BR + 16, '#ff5a2a', 1 + pulse + hot * 8);

  ctx.save();
  ctx.translate(BX, BY);
  ctx.rotate(Ctl.wheelAng);
  ctx.drawImage(wheel, -wheel.width / 2, -wheel.height / 2);
  ctx.restore();

  ctx.drawImage(bezel, Math.round(BX - bezel.width / 2), Math.round(BY - bezel.height / 2));
  const chase = (t * 9) | 0;
  for (let i = 0; i < BULBS; i++) {
    const a = (i / BULBS) * TAU - Math.PI / 2;
    const x = Math.round(BX + Math.cos(a) * (BR - 3.5));
    const y = Math.round(BY + Math.sin(a) * (BR - 3.5));
    const lit = Ctl.held || hot > 0.3 || (i + chase) % 4 === 0 || (i + chase) % 4 === 1;
    if (!lit) {
      ctx.fillStyle = '#5e300a';
      ctx.fillRect(x - 1, y - 1, 2, 2);
      continue;
    }
    ctx.fillStyle = i % 2 ? '#ff5a3a' : '#ffe066';
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, 1, 1);
  }

  const d = Math.round(Ctl.depth);
  const ox = Math.round(BX - cap.width / 2);
  const oy = Math.round(BY - cap.height / 2);
  ctx.fillStyle = INK;
  pxDisc(ctx, BX, BY + 1, CAP_R + 1);
  for (let i = 0; i < d; i++) ctx.drawImage(skirt, ox, oy - i);

  const f = capFx.ctx;
  f.clearRect(0, 0, capFx.width, capFx.height);
  f.globalCompositeOperation = 'source-over';
  f.drawImage(Ctl.pressAge < 0.07 ? capWhite : cap, 0, 0);
  const cycle = (t % 3.2) / 1.1;
  if (cycle < 1) {
    f.globalCompositeOperation = 'source-atop';
    const sx = lerp(-40, capFx.width + 40, cycle);
    for (let y = 0; y < capFx.height; y++) {
      const x0 = Math.round(sx - y * 0.6);
      f.fillStyle = 'rgba(255,255,255,0.4)';
      f.fillRect(x0, y, 6, 1);
      f.fillStyle = 'rgba(255,220,200,0.2)';
      f.fillRect(x0 - 4, y, 4, 1);
      f.fillRect(x0 + 6, y, 4, 1);
    }
  }
  ctx.drawImage(capFx, ox, oy - d);
}

function drawStatus(ctx, t) {
  let text;
  let st;
  if (Ctl.netErr > 0) {
    text = 'EL MENSAJE NO LLEGÓ';
    st = ST_STATUS.err;
  } else if (Ctl.online === true) {
    text = 'BARCO A LA VISTA';
    st = ST_STATUS.ok;
  } else if (Ctl.online === false) {
    text = 'BUSCANDO EL BARCO' + '...'.slice(0, ((t * 2) | 0) % 4);
    st = ST_STATUS.wait;
  } else if (Ctl.online === null) {
    text = 'SIN SEÑAL';
    st = ST_STATUS.err;
  } else {
    text = 'ZARPANDO...';
    st = ST_STATUS.wait;
  }
  const y = H - 13;
  const tw = textWidth('BUSCANDO EL BARCO...', 1);
  const x = Math.round(W / 2 - tw / 2 + 4);
  drawText(ctx, text, x, y, st);
  ctx.fillStyle = INK;
  pxDisc(ctx, x - 6, y + 3, 3);
  const on = Ctl.online === true ? Math.sin(t * 5) > -0.4 : ((t * 2) | 0) % 2 === 0;
  ctx.fillStyle = Ctl.online === true && Ctl.netErr <= 0 ? (on ? '#7fff5e' : '#1d6636') : Ctl.netErr > 0 || Ctl.online === null ? (on ? '#ff5a3a' : '#6a1024') : on ? '#ffe060' : '#6e3f10';
  pxDisc(ctx, x - 6, y + 3, 2);
  if (NET.room !== 'principal') drawText(ctx, 'SALA ' + NET.room.toUpperCase(), W / 2, y - 11, ST_STATUS.gold, { align: 'center' });
}

function draw(ctx) {
  const t = Ctl.t;
  const moonX = drawSky(ctx, t);
  drawParticles(ctx, 0);
  drawSea(ctx, t, moonX);
  drawButton(ctx, t);
  drawStatus(ctx, t);
  drawParticles(ctx, 1);
  drawRings(ctx, 1);
}

function fit() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw > vh !== LANDSCAPE && Math.abs(vw - vh) > 60) {
    location.reload();
    return;
  }
  const k = Math.max(vw / W, vh / H);
  const cw = W * k;
  const ch = H * k;
  view.style.width = Math.round(cw) + 'px';
  view.style.height = Math.round(ch) + 'px';
  view.style.left = Math.round((vw - cw) / 2) + 'px';
  view.style.top = Math.round((vh - ch) / 2) + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let bw = Math.round(cw * dpr);
  let bh = Math.round(ch * dpr);
  const m = Math.max(bw, bh);
  if (m > 2048) {
    bw = Math.round((bw * 2048) / m);
    bh = Math.round((bh * 2048) / m);
  }
  view.width = bw;
  view.height = bh;
  if (ctx2d) ctx2d.imageSmoothingEnabled = false;
}

function present() {
  if (usePost) {
    Post.render(screenC, Ctl.t);
    return;
  }
  ctx2d.imageSmoothingEnabled = false;
  ctx2d.save();
  ctx2d.fillStyle = '#000';
  ctx2d.fillRect(0, 0, view.width, view.height);
  const z = cam.zoom * (1 + cam.kick);
  ctx2d.translate(view.width / 2 + (cam.sx * view.width) / W, view.height / 2 + (cam.sy * view.height) / H);
  ctx2d.rotate(cam.rot + cam.sr);
  ctx2d.scale(z, z);
  ctx2d.drawImage(screenC, -view.width / 2, -view.height / 2, view.width, view.height);
  ctx2d.restore();
  if (fx.flash > 0) {
    ctx2d.globalAlpha = Math.min(1, fx.flash);
    ctx2d.fillStyle = `rgb(${fx.flashColor.map((v) => Math.round(v * 255)).join(',')})`;
    ctx2d.fillRect(0, 0, view.width, view.height);
    ctx2d.globalAlpha = 1;
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  update(dt);
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';
  draw(sctx);
  present();
}

window.__control = { Ctl, press };
window.addEventListener('resize', fit);
fit();
poll();
setInterval(poll, 4000);
requestAnimationFrame(frame);
