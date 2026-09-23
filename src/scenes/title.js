'use strict';

const TITLE_SMALL = 'EL REY DE LOS';
const TITLE_BIG = 'PIRATAS';
const TITLE_TOP = 50;

class TitleScene {
  enter() {
    clearFx();
    resetFx();
    fx.heat = 0.7;
    fx.vig = 0.5;
    fx.bloom1 = 1;
    this.bg = makeCanvas(W, H);
    paintGradient(this.bg.ctx, 0, 0, W, H, ['#05020c', '#0e0620', '#1c0a2c', '#300c2c', '#4e1026', '#7a1820', '#a8281a']);
    this.stars = Array.from({ length: 80 }, () => ({ x: randi(0, W - 1), y: randi(0, 150), p: rand(0, TAU), s: rand(1.5, 4), b: Math.random() < 0.18 }));
    this.rays = new Rays(240, 30);
    this.fire = new Fire(240, 92, FIRE_PAL.classic);
    this.fire.decay = 0.42;
    this.fire.setSource(36);
    this.fire.warm(160);
    this.big = layoutText(TITLE_BIG, ST.titleBig.s);
    this.small = layoutText(TITLE_SMALL, ST.titleSmall.s);
    this.bigX = Math.round((W - this.big.w) / 2);
    this.smallX = Math.round((W - this.small.w) / 2);
    this.titleC = makeCanvas(W, H);
    this.landed = new Set();
    this.popped = new Set();
    this.exiting = false;
    this.exitT = 0;
    this.left = false;
    this.nextSurge = 4;
    this.surge = 0;
    this.emblemShown = false;
    Music.play(SONGS.title);
  }

  letterY(i) {
    const land = 0.35 + i * 0.1;
    const t = this.t;
    if (t < land) return 98 - 220 * (1 - Ease.inQuad(seg(t, land - 0.35, land)));
    const b = t - land;
    return 98 + Math.sin(b * 18) * Math.exp(-b * 6) * 4 + Math.sin(t * 2.4 - i * 0.6) * 2.5 * seg(t, land + 0.3, land + 1.2);
  }

  smallScale(i) {
    return Ease.outBack(seg(this.t, 1.15 + i * 0.035, 1.4 + i * 0.035));
  }

  update(dt) {
    const t = this.t;
    this.fire.decay = this.exiting ? 0.12 : this.surge > 0 ? 0.26 : 0.42;
    this.fire.update(dt);
    this.surge -= dt;
    for (let i = 0; i < 4; i++) {
      spawn({
        x: rand(0, W),
        y: rand(200, 270),
        vx: rand(-10, 10),
        vy: rand(-90, -40),
        life: rand(1.2, 3),
        kind: K.EMBER,
        ramp: RAMP.fire,
        sway: rand(10, 30),
        flicker: 0.15,
        size: Math.random() < 0.2 ? 2 : 1,
        size2: 1,
      });
    }
    if (!this.exiting) {
      this.big.items.forEach((it, i) => {
        const land = 0.35 + i * 0.1;
        if (t >= land && !this.landed.has(i)) {
          this.landed.add(i);
          const cx = this.bigX + it.x + it.w / 2;
          shake(0.22);
          kick(0.012);
          Sound.thud(0.6);
          burst(cx, 98 + 64, 16, { speed: [30, 110], angle: -Math.PI / 2, spread: 1.3, life: [0.3, 0.8], kind: K.SMOKE, ramp: RAMP.dust, size: 2, size2: 6, g: 20, drag: 3, layer: 1 });
          burst(cx, 98 + 60, 14, { speed: [60, 200], angle: -Math.PI / 2, spread: 1.1, life: [0.3, 0.7], kind: K.SPARK, ramp: RAMP.fire, g: 300, layer: 1 });
        }
      });
      this.small.items.forEach((it, i) => {
        if (it.ch !== ' ' && t >= 1.15 + i * 0.035 && !this.popped.has(i)) {
          this.popped.add(i);
          if (i % 3 === 0) Sound.blip();
          burst(this.smallX + it.x + it.w / 2, TITLE_TOP + 20, 5, { speed: [20, 70], life: [0.2, 0.5], kind: K.STAR, ramp: RAMP.gold, size: 2, layer: 1 });
        }
      });
      if (t >= 1.7 && !this.emblemShown) {
        this.emblemShown = true;
        flash(0.35, [1, 0.85, 0.5], 3);
        shockwave(240, 28, 0.03, 0.7, 1.2);
        addRing(240, 28, { speed: 260, life: 0.5, ramp: RAMP.gold, thick: 2, layer: 1 });
        burst(240, 28, 40, { speed: [60, 180], life: [0.4, 0.9], kind: K.SPARK, ramp: RAMP.gold, drag: 2, layer: 1 });
        Sound.sparkle();
        Sound.chk();
      }
      if (t > this.nextSurge) {
        this.nextSurge = t + rand(3.5, 6);
        this.surge = 0.6;
        shake(0.12);
        Sound.whoosh(0.5);
        burst(rand(60, 420), 250, 30, { speed: [60, 160], angle: -Math.PI / 2, spread: 0.6, life: [0.6, 1.4], kind: K.EMBER, ramp: RAMP.fire, sway: 30, size: 2, size2: 1, layer: 1 });
      }
      if (t > 2.2 && Math.random() < 0.3) {
        const it = pick(this.big.items);
        spawn({ x: this.bigX + it.x + rand(0, it.w), y: 98 + rand(0, 10), vx: rand(-5, 5), vy: rand(-40, -15), life: rand(0.4, 0.9), kind: K.EMBER, ramp: RAMP.fire, layer: 1, flicker: 0.2 });
      }
    } else {
      this.exitT += dt;
      const e = this.exitT;
      cam.zoom = 1 + Ease.inExpo(seg(e, 0.1, 1.0)) * 1.8;
      cam.rot = Ease.inQuad(seg(e, 0.2, 1.0)) * 0.18;
      fx.aberrBase = seg(e, 0, 0.9) * 2;
      if (e > 0.72 && !this.left) {
        this.left = true;
        goto(() => new IntroScene(), 'white', 0.8);
      }
    }
  }

  key() {
    if (this.exiting || this.t < 0.3) return;
    this.exiting = true;
    this.exitT = 0;
    Music.stop();
    Sound.boom();
    Sound.whoosh(1);
    flash(0.9, [1, 0.8, 0.45], 2.2);
    shake(0.75);
    kick(0.1);
    aberrate(2);
    shockwave(240, 130, 0.07, 0.9, 1.4);
    addRing(240, 130, { speed: 420, life: 0.6, ramp: RAMP.fire, thick: 3, layer: 1 });
    this.big.items.forEach((it, i) => {
      const spr = glyphSprite(it.ch, ST.titleBig);
      shatter(spr, this.bigX + it.x - spr.o, this.letterY(i) - 27 - spr.o, { step: 3, speed: [80, 320], ox: 240, oy: 135, g: 60, life: [0.6, 1.3] });
    });
    this.small.items.forEach((it) => {
      if (it.ch === ' ') return;
      const spr = glyphSprite(it.ch, ST.titleSmall);
      shatter(spr, this.smallX + it.x - spr.o, TITLE_TOP - 12 - spr.o, { step: 2, speed: [60, 260], ox: 240, oy: 135, g: 60, life: [0.5, 1.1] });
    });
    shatter(SYMBOLS[1].img, 220, 8, { step: 2, speed: [80, 260], g: 60 });
  }

  drawTitle(ctx) {
    const tc = this.titleC;
    const c = tc.ctx;
    const oy = 0;
    c.clearRect(0, 0, tc.width, tc.height);
    const t = this.t;
    this.small.items.forEach((it, i) => {
      const s = this.smallScale(i);
      if (s <= 0.01) return;
      const y = TITLE_TOP + Math.sin(t * 2 - i * 0.4) * 1.2 * seg(t, 1.6, 2.4);
      drawGlyph(c, it.ch, ST.titleSmall, this.smallX + it.x, y - oy, s);
    });
    this.big.items.forEach((it, i) => {
      if (t < 0.35 + i * 0.1 - 0.35) return;
      drawGlyph(c, it.ch, ST.titleBig, this.bigX + it.x, this.letterY(i) - oy);
    });
    if (t > 2.3) {
      const sx = -80 + ((t - 2.3) % 3.4) * 240;
      c.globalCompositeOperation = 'source-atop';
      for (let y = 0; y < tc.height; y++) {
        const x0 = Math.round(sx - y * 0.55);
        c.fillStyle = '#ffffff';
        c.fillRect(x0, y, 7, 1);
        c.fillStyle = '#fff4b0';
        c.fillRect(x0 - 3, y, 3, 1);
        c.fillRect(x0 + 7, y, 3, 1);
      }
      c.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(tc, 0, oy);
  }

  drawEmblem(ctx) {
    const t = this.t;
    if (t < 1.7) return;
    const k = seg(t, 1.7, 2.05);
    const cx = 240;
    const cy = 28 + Math.sin(t * 2) * 2;
    ditherDisc(ctx, cx, cy, 24 + Math.sin(t * 3) * 2, '#ffb020', 5 + Math.sin(t * 4) * 2);
    for (let i = 0; i < 10; i++) {
      const a = t * 0.9 + (i / 10) * TAU;
      const r = 30;
      ctx.fillStyle = i % 2 ? '#fff4a8' : '#ff9a1f';
      pxStar(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5, i % 3 === 0 ? 2 : 1);
    }
    const sc = k < 1 ? lerp(3, 1, Ease.outBack(k)) : 1;
    const img = k < 0.6 && ((t * 30) | 0) % 2 ? SYMBOLS[1].white : SYMBOLS[1].img;
    const s = 40 * sc;
    ctx.drawImage(img, Math.round(cx - s / 2), Math.round(cy - s / 2), Math.round(s), Math.round(s));
  }

  drawPrompt(ctx) {
    const t = this.t;
    if (t < 2.2) return;
    const str = 'PRESIONA UNA TECLA PARA COMENZAR';
    const on = ((t * 2.2) | 0) % 2 === 0;
    const y = 222;
    const k = seg(t, 2.2, 2.6);
    const w = drawText(ctx, str, 240, y + (1 - Ease.outBack(k)) * 30, on ? ST.promptGold : ST.prompt, {
      align: 'center',
      fx: (i) => ({ y: Math.round(Math.sin(t * 5 - i * 0.35) * 1.5) }),
    });
    const ax = Math.round(Math.sin(t * 6) * 3);
    drawText(ctx, '>', 240 - w / 2 - 16 - ax, y, ST.promptGold);
    drawText(ctx, '<', 240 + w / 2 + 6 + ax, y, ST.promptGold);
  }

  draw(ctx) {
    const t = this.t;
    ctx.drawImage(this.bg, 0, 0);
    for (const s of this.stars) {
      const b = Math.sin(t * s.s + s.p);
      if (b < -0.3) continue;
      ctx.fillStyle = b > 0.7 ? '#ffffff' : '#8a7ab0';
      if (s.b && b > 0.6) pxStar(ctx, s.x, s.y, 1);
      else ctx.fillRect(s.x, s.y, 1, 1);
    }
    const rc = this.rays.render(16, t * 0.03, u32c('#3a0f2c'), 0, 30, 250);
    ctx.drawImage(rc, 0, 0);
    ctx.drawImage(this.fire.render(), 0, H - 172, W, 184);
    drawParticles(ctx, 0);
    if (!this.exiting) {
      this.drawEmblem(ctx);
      this.drawTitle(ctx);
      this.drawPrompt(ctx);
    }
    drawParticles(ctx, 1);
    drawRings(ctx, 1);
  }
}
