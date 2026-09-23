'use strict';

class WinScene {
  constructor(outcome) {
    this.o = outcome || { win: true, syms: [0, 0, 0] };
  }

  enter() {
    clearFx();
    resetFx();
    fx.sat = 1.2;
    fx.vig = 0.3;
    fx.bloom1 = 1.05;
    fx.bloom2 = 0.8;
    fx.heat = 0.15;
    this.sym = SYMBOLS[this.o.syms[0]];
    this.value = this.sym.value;
    this.rays = new Rays(240, 132);
    this.title = layoutText('¡VICTORIA!', 7);
    this.titleX = Math.round((W - this.title.w) / 2);
    this.landed = new Set();
    this.nextRocket = 0.7;
    this.beat = 0;
    this.beatN = 0;
    this.lastCount = -1;
    this.countDone = false;
    this.leaving = false;
    Music.play(SONGS.win);
    Sound.boom();
    flash(1, [1, 1, 0.85], 1.6);
    shockwave(240, 132, 0.07, 0.9, 1.6);
    shake(0.6);
    aberrate(2);
    burst(240, 132, 120, { speed: [120, 360], life: [0.6, 1.3], kind: K.SPARK, ramp: RAMP.gold, drag: 1.4, g: 60, layer: 1 });
    addRing(240, 132, { speed: 420, life: 0.7, ramp: RAMP.gold, thick: 3, layer: 1 });
  }

  key() {
    if (this.t > 3 && !this.leaving) this.leave();
  }

  leave() {
    this.leaving = true;
    goto(() => new TitleScene(), 'diamond', 1.1);
  }

  update(dt) {
    const t = this.t;
    this.beat -= dt;
    if (this.beat <= 0) {
      this.beat += 0.4;
      this.beatN++;
      kick(0.018);
      aberrate(0.55);
      addRing(240, 132, { r0: 62, speed: 260, life: 0.55, ramp: [rainbow(this.beatN * 0.13), rainbow(this.beatN * 0.13 + 0.1), '#5a1a40'], thick: 2, layer: 0 });
      if (this.beatN % 4 === 0) shockwave(240, 132, 0.035, 0.8, 1.1);
    }
    this.title.items.forEach((it, i) => {
      const land = 0.45 + i * 0.075;
      if (t >= land && !this.landed.has(i)) {
        this.landed.add(i);
        const x = this.titleX + it.x + it.w / 2;
        shake(0.14);
        Sound.chk();
        burst(x, 60, 10, { speed: [40, 160], life: [0.3, 0.6], kind: K.SPARK, ramp: FIREWORK_RAMPS[i % FIREWORK_RAMPS.length], g: 240, layer: 1 });
        burst(x, 40, 4, { speed: [20, 60], life: [0.3, 0.6], kind: K.STAR, ramp: RAMP.white, size: 3, layer: 1 });
      }
    });
    if (t > this.nextRocket && t < 10) {
      this.nextRocket = t + rand(0.28, 0.55);
      rocket(rand(30, 450), rand(20, 110));
    }
    if (t < 6) {
      for (let i = 0; i < 2; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        spawn({ x: 240 + side * rand(0, 30), y: 272, vx: side * rand(40, 190), vy: rand(-380, -220), g: 480, life: rand(1.6, 2.6), kind: K.COIN, spin: rand(0.5, 1.5), floor: 262, bounce: 0.45, layer: 1 });
      }
    }
    if (t > 1) {
      for (let i = 0; i < 2; i++) {
        spawn({ x: rand(0, W), y: -4, vx: rand(-20, 20), vy: rand(30, 70), life: 4, kind: K.CONF, color: pick(RAINBOW), sway: 40, spin: rand(0.5, 2), layer: 1 });
      }
    }
    if (Math.random() < 0.6) {
      const a = rand(0, TAU);
      const r = rand(60, 200);
      spawn({ x: 240 + Math.cos(a) * r, y: 132 + Math.sin(a) * r * 0.6, life: rand(0.4, 0.9), kind: K.STAR, color: pick(['#ffffff', '#fff4a8', '#ffd6ff', '#c8fbff']), size: randi(1, 3), layer: 0 });
    }
    const k = seg(t, 2.3, 4.6);
    const shown = Math.floor(this.value * Ease.outCubic(k));
    if (k > 0 && k < 1 && shown !== this.lastCount && ((t * 20) | 0) !== this.lastTickN) {
      this.lastTickN = (t * 20) | 0;
      Sound.coin(this.lastTickN);
    }
    this.lastCount = shown;
    if (k >= 1 && !this.countDone) {
      this.countDone = true;
      Sound.sparkle();
      flash(0.4, [1, 0.9, 0.5], 3);
      burst(240, 238, 60, { speed: [80, 260], life: [0.5, 1], kind: K.SPARK, ramp: RAMP.gold, drag: 1.5, g: 120, layer: 1 });
      addRing(240, 238, { speed: 300, life: 0.5, ramp: RAMP.gold, thick: 2, layer: 1 });
      shake(0.3);
    }
    cam.rot = Math.sin(t * 1.3) * 0.012;
    if (t > 11.5 && !this.leaving) this.leave();
  }

  drawSymbol(ctx) {
    const t = this.t;
    const s = this.sym;
    const k = seg(t, 0, 0.9);
    const ang = (1 - Ease.outCubic(k)) * Math.PI * 5;
    const sx = Math.cos(ang);
    const sy = Ease.outBack(seg(t, 0, 0.5));
    const cx = 240;
    const cy = 132 + Math.sin(t * 2.2) * 4;
    const pulse = 1 + Math.max(0, Math.sin(this.beat / 0.4 * Math.PI)) * 0.04;
    const w = Math.max(2, Math.round(120 * Math.abs(sx) * pulse));
    const h = Math.round(120 * sy * pulse);
    if (h < 2) return;
    const img = sx < 0 ? s.back3 : k < 1 && ((t * 20) | 0) % 3 === 0 ? s.white3 : s.x3;
    ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  }

  drawOrbit(ctx, front) {
    const t = this.t;
    for (let i = 0; i < 14; i++) {
      const a = t * 1.6 + (i / 14) * TAU;
      const z = Math.sin(a);
      if (front !== z > 0) continue;
      const x = 240 + Math.cos(a) * 92;
      const y = 132 + z * 22 - Math.cos(a) * 10;
      ctx.fillStyle = rainbow(i / 14 + t * 0.5);
      pxStar(ctx, x, y, z > 0 ? 3 : 1);
    }
  }

  draw(ctx) {
    const t = this.t;
    const hue = 0.03 + Math.sin(t * 0.35) * 0.1;
    const rc = this.rays.render(22, t * 0.09, u32c(hsv(hue, 0.85, 0.55)), u32c(hsv(hue + 0.06, 0.95, 0.32)), 500, 501, 0.004);
    ctx.drawImage(rc, 0, 0);
    for (let i = 6; i >= 1; i--) {
      ditherDisc(ctx, 240, 132, i * 14 + Math.sin(t * 5 + i) * 3, i % 2 ? '#ffd23f' : '#fff4a8', 2 + (6 - i) * 1.4);
    }
    drawRings(ctx, 0);
    drawParticles(ctx, 0);
    this.drawOrbit(ctx, false);
    this.drawSymbol(ctx);
    this.drawOrbit(ctx, true);
    this.title.items.forEach((it, i) => {
      const land = 0.45 + i * 0.075;
      const k = seg(t, land - 0.16, land);
      if (k <= 0) return;
      const sc = lerp(4, 1, Ease.inQuad(k));
      const wy = k >= 1 ? Math.round(Math.sin(t * 5 - i * 0.55) * 3) : 0;
      const st = HUE_STYLES7[mod(i + Math.floor(t * 2.5), HUE_STYLES7.length)];
      drawGlyph(ctx, it.ch, st, this.titleX + it.x, 20 + wy, sc);
    });
    drawParticles(ctx, 1);
    drawRings(ctx, 1);
    if (t > 1.4) {
      const n = Math.floor((t - 1.4) * 30);
      drawText(ctx, '¡ERES EL REY DE LOS PIRATAS!', 240, 202, ST.sub, {
        align: 'center',
        count: n,
        fx: (i) => ({ y: Math.round(Math.sin(t * 6 - i * 0.4) * 2), st: HUE_STYLES2[mod(i - Math.floor(t * 8), HUE_STYLES2.length)] }),
      });
    }
    if (t > 2.2) {
      const k = seg(t, 2.3, 4.6);
      const str = 'BOTÍN ' + fmtNum(this.value * Ease.outCubic(k));
      const pop = this.countDone ? 1 + Math.max(0, 0.25 - (t - 4.6)) : 1;
      drawText(ctx, str, 240, 230, ST.count, { align: 'center', fx: (i) => ({ sc: pop, y: this.countDone ? Math.round(Math.sin(t * 4 - i * 0.5) * 1.5) : 0 }) });
    }
    if (t > 4 && t < 11.5) {
      const on = ((t * 2) | 0) % 2 === 0;
      if (on) drawText(ctx, 'PRESIONA UNA TECLA', 240, 258, ST.small, { align: 'center' });
    }
  }
}
