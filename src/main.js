'use strict';

const Game = { scene: null, time: 0, trans: null, force: null, fps: 0 };

const view = document.getElementById('view');
const screenC = makeCanvas(W, H);
const sctx = screenC.ctx;
const usePost = Post.init(view);
const ctx2d = usePost ? null : view.getContext('2d');

function setScene(s) {
  Game.scene = s;
  s.t = 0;
  s.enter();
}

function goto(factory, type = 'diamond', dur = 1) {
  if (Game.trans) return;
  Game.trans = { factory, type, dur, t: 0, swapped: false };
}

function updateTransition(dt) {
  const tr = Game.trans;
  if (!tr) return;
  tr.t += dt;
  if (!tr.swapped && tr.t >= tr.dur / 2) {
    tr.swapped = true;
    setScene(tr.factory());
  }
  if (tr.t >= tr.dur) Game.trans = null;
}

function drawTransition(ctx) {
  const tr = Game.trans;
  if (!tr) return;
  const h = tr.dur / 2;
  const c = tr.t < h ? tr.t / h : 1 - (tr.t - h) / h;
  if (tr.type === 'white') {
    ctx.globalAlpha = Ease.inQuad(c);
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  } else if (tr.type === 'dither') {
    ditherRect(ctx, 0, 0, W, H, '#020206', c * 17);
  } else {
    const cs = 20;
    const out = tr.t < h;
    ctx.fillStyle = '#07030c';
    for (let j = 0; j <= H / cs; j++) {
      for (let i = 0; i <= W / cs; i++) {
        const cx = i * cs + cs / 2;
        const cy = j * cs + cs / 2;
        let d = (Math.abs(cx - W / 2) / (W / 2) + Math.abs(cy - H / 2) / (H / 2)) / 2;
        if (!out) d = 1 - d;
        const k = clamp(c * 2 - d, 0, 1);
        const s = Math.ceil(k * cs * 1.45);
        if (s > 0) ctx.fillRect(Math.round(cx - s / 2), Math.round(cy - s / 2), s, s);
      }
    }
  }
}

function resize() {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  let cw = ww;
  let ch = (ww * 9) / 16;
  if (ch > wh) {
    ch = wh;
    cw = (wh * 16) / 9;
  }
  view.style.width = Math.round(cw) + 'px';
  view.style.height = Math.round(ch) + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let bw = Math.round(cw * dpr);
  let bh = Math.round(ch * dpr);
  if (bw > 1920) {
    bh = Math.round((bh * 1920) / bw);
    bw = 1920;
  }
  view.width = bw;
  view.height = bh;
  if (ctx2d) ctx2d.imageSmoothingEnabled = false;
}

function present() {
  if (usePost) {
    Post.render(screenC, Game.time);
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
let fpsAcc = 0;
let fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  fpsAcc += dt;
  fpsN++;
  if (fpsAcc >= 1) {
    Game.fps = Math.round(fpsN / fpsAcc);
    fpsAcc = 0;
    fpsN = 0;
  }
  Game.time += dt;
  let sdt = dt;
  if (freezeT > 0) {
    freezeT -= dt;
    sdt = dt * 0.03;
  }
  const s = Game.scene;
  s.t += sdt;
  s.update(sdt);
  updateFx(sdt);
  updateCamFx(dt, Game.time);
  updateTransition(dt);
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';
  Game.scene.draw(sctx);
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';
  drawTransition(sctx);
  present();
}

function onAny() {
  Sound.unlock();
  const s = Game.scene;
  if (!Game.trans && s && s.key) s.key();
}

window.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['F5', 'F11', 'F12'].includes(e.key)) return;
  if (e.code === 'KeyM') {
    Sound.unlock();
    Sound.toggleMute();
    return;
  }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
  onAny();
});
function enterFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !document.fullscreenEnabled || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}

window.addEventListener('pointerdown', () => {
  enterFullscreen();
  onAny();
});
window.addEventListener('resize', resize);

const SCENES = {
  title: () => new TitleScene(),
  intro: () => new IntroScene(),
  slot: () => new SlotScene(),
  win: () => new WinScene(),
  lose: () => new LoseScene(),
};

window.__game = {
  Game,
  goto: (name) => setScene(SCENES[name]()),
  force: (v) => (Game.force = v),
  key: onAny,
};

buildSprites();
resize();
setScene((SCENES[new URLSearchParams(location.search).get('scene')] || SCENES.title)());
requestAnimationFrame(frame);
