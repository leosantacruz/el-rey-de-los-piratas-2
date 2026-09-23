'use strict';

function buildNightSky() {
  const c = makeCanvas(W, H);
  paintGradient(c.ctx, 0, 0, W, 200, ['#04020f', '#0a0826', '#14104a', '#241a62', '#3a2474', '#5a3080']);
  c.ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) c.ctx.fillRect(randi(0, W - 1), randi(0, 150), 1, 1);
  c.ctx.drawImage(SPR.moon, 336, 44);
  return c;
}

class IntroScene {
  enter() {
    clearFx();
    resetFx();
    Music.stop();
    fx.vig = 0.6;
    this.sky = buildNightSky();
    this.twinkle = Array.from({ length: 30 }, () => ({ x: randi(0, W - 1), y: randi(0, 140), p: rand(0, TAU) }));
    this.clouds = [
      { s: SPR.cloudNight[2], x: 300, y: 40, v: -7 },
      { s: SPR.cloudNight[0], x: 60, y: 70, v: -4 },
      { s: SPR.cloudNight[1], x: 420, y: 96, v: -10 },
    ];
    this.shot = 1;
    this.leaving = false;
    this.lastChars = 0;
    this.lines = [
      { text: 'UN TESORO LEGENDARIO AGUARDA...', t0: 0.7, t1: 2.5 },
      { text: 'SOLO EL MÁS AUDAZ SERÁ EL REY', t0: 2.6, t1: 4.35 },
    ];
    this.l1 = layoutText('¡QUE COMIENCE', ST.slam.s);
    this.l2 = layoutText('LA AVENTURA!', ST.slam.s);
    this.slamLanded = new Set();
    this.rays = new Rays(240, 128);
    this.tl = new Timeline()
      .at(0, () => Sound.whoosh(1.6))
      .at(3.85, () => this.strike())
      .at(4.4, () => this.startShot2())
      .at(6.3, () => {
        kick(0.25);
        Sound.whoosh(0.6);
        aberrate(2);
      })
      .at(6.55, () => this.leave());
  }

  strike() {
    lightning(rand(120, 200), 0, rand(150, 260), 186, { disp: 50, life: 0.45 });
    flash(0.85, [0.8, 0.9, 1], 3);
    shake(0.5);
    Sound.thunder();
  }

  startShot2() {
    this.shot = 2;
    clearFx();
    flash(1, [1, 0.92, 0.7], 2.5);
    shockwave(240, 128, 0.06, 0.9, 1.4);
    shake(0.4);
    Sound.boom();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    goto(() => new SlotScene(), 'diamond', 0.9);
  }

  key() {
    if (this.t > 0.8) this.leave();
  }

  shipX() {
    return lerp(-120, 170, Ease.outCubic(seg(this.t, 0, 4)));
  }

  update(dt) {
    const t = this.t;
    this.tl.update(t);
    if (this.shot === 1) {
      cam.zoom = 1;
      cam.x = 0;
      for (const c of this.clouds) c.x += c.v * dt;
      const sx = this.shipX();
      if (Math.random() < 0.9) {
        spawn({ x: sx + rand(10, 30), y: 196 + rand(-2, 2), vx: rand(-40, -15), vy: rand(-10, 0), g: 30, life: rand(0.5, 1.1), kind: K.SQ, color: pick(['#c8e0ff', '#ffffff', '#7a9ad8']), size: 1 });
      }
      const line = this.lines.find((l) => t >= l.t0 && t < l.t1);
      if (line) {
        const n = Math.floor((t - line.t0) * 26);
        if (n !== this.lastChars && n <= line.text.length) {
          this.lastChars = n;
          if (line.text[n - 1] && line.text[n - 1] !== ' ') Sound.blip();
        }
      }
    } else {
      cam.zoom = 1 + Ease.inExpo(seg(t, 5.9, 6.6)) * 1.2;
      const all = [...this.l1.items.map((it, i) => ({ it, i, line: 0 })), ...this.l2.items.map((it, i) => ({ it, i: i + this.l1.items.length, line: 1 }))];
      for (const a of all) {
        const land = 4.55 + a.i * 0.045;
        if (a.it.ch !== ' ' && t >= land && !this.slamLanded.has(a.i)) {
          this.slamLanded.add(a.i);
          const lay = a.line ? this.l2 : this.l1;
          const x = Math.round((W - lay.w) / 2) + a.it.x + a.it.w / 2;
          const y = a.line ? 150 : 102;
          shake(0.09);
          if (a.i % 2 === 0) Sound.chk();
          burst(x, y + 20, 8, { speed: [40, 140], life: [0.2, 0.5], kind: K.SPARK, ramp: RAMP.fire, g: 200, layer: 1 });
          burst(x, y + 10, 3, { speed: [10, 40], life: [0.3, 0.6], kind: K.STAR, ramp: RAMP.gold, size: 2, layer: 1 });
        }
      }
      if (t > 5.6 && this.slamLanded.size && !this.allIn) {
        this.allIn = true;
        shockwave(240, 128, 0.05, 0.9, 1.2);
        addRing(240, 128, { speed: 380, life: 0.6, ramp: RAMP.gold, thick: 2, layer: 1 });
        Sound.sparkle();
        flash(0.3, [1, 0.8, 0.4], 3);
      }
      for (let i = 0; i < 3; i++) {
        spawn({ x: rand(0, W), y: H + 2, vx: rand(-20, 20), vy: rand(-140, -60), life: rand(1, 2.2), kind: K.EMBER, ramp: RAMP.fire, sway: 25, flicker: 0.1 });
      }
    }
  }

  drawShot1(ctx) {
    const t = this.t;
    ctx.drawImage(this.sky, 0, 0);
    for (const s of this.twinkle) {
      if (Math.sin(t * 3 + s.p) > 0.3) pxStar(ctx, s.x, s.y, 1);
    }
    ditherDisc(ctx, 362, 70, 34, '#c8c8f0', 3);
    for (const c of this.clouds) {
      const x = Math.round(mod(c.x + 150, W + 300) - 150);
      ctx.drawImage(c.s, x, c.y);
    }
    drawWaves(ctx, t, 178, 1.5, 0.05, 1.2, '#0c1438', '#26306a');
    for (let i = 0; i < 26; i++) {
      const y = 182 + i * 2 + ((i * 7) % 3);
      const w = Math.round(6 + Math.sin(t * 3 + i * 1.7) * 5 + i * 0.5);
      ctx.fillStyle = i % 3 === 0 ? '#fff8d8' : '#b8b8e8';
      if (Math.sin(t * 4 + i * 2.3) > -0.4) ctx.fillRect(362 - w / 2 + Math.round(Math.sin(t * 2 + i) * 4), y, w, 1);
    }
    const sx = Math.round(this.shipX());
    const bob = Math.round(Math.sin(t * 2.2) * 2);
    ctx.drawImage(SPR.ship[((t * 5) | 0) & 3], sx, 130 + bob);
    drawWaves(ctx, t, 192, 2.5, 0.04, 1.8, '#101c4a', '#3a4c90', 1.3);
    drawParticles(ctx, 0);
    drawWaves(ctx, t, 214, 3.5, 0.03, 2.4, '#0a1236', '#4a5ca8', 2.6);
    drawBolts(ctx);
    const lb = Math.round(Ease.outCubic(seg(t, 0, 0.6)) * 34);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, lb);
    ctx.fillRect(0, H - lb, W, lb);
    const line = this.lines.find((l) => t >= l.t0 && t < l.t1);
    if (line) {
      const n = Math.floor((t - line.t0) * 26);
      const fade = seg(t, line.t1 - 0.25, line.t1);
      drawText(ctx, line.text, 240, H - 24, ST.sub, { align: 'center', count: n, fx: () => (fade > 0 && Math.random() < fade ? null : undefined) });
    }
  }

  drawShot2(ctx) {
    const t = this.t;
    const rc = this.rays.render(18, t * 0.25, u32c('#5a0c18'), u32c('#200410'), 400, 401);
    ctx.drawImage(rc, 0, 0);
    for (let i = 5; i >= 1; i--) {
      ditherDisc(ctx, 240, 128, i * 16 + Math.sin(t * 6 + i) * 3, i % 2 ? '#ff8a1f' : '#ffd23f', 3 + (5 - i));
    }
    drawParticles(ctx, 0);
    const lines = [
      [this.l1, 102, 0],
      [this.l2, 150, this.l1.items.length],
    ];
    for (const [lay, y, off] of lines) {
      const bx = Math.round((W - lay.w) / 2);
      lay.items.forEach((it, i) => {
        const land = 4.55 + (i + off) * 0.045;
        const k = seg(t, land - 0.14, land);
        if (k <= 0) return;
        const sc = lerp(3.2, 1, Ease.inQuad(k));
        const wy = k >= 1 ? Math.round(Math.sin(t * 5 - (i + off) * 0.4) * 2) : 0;
        drawGlyph(ctx, it.ch, ST.slam, bx + it.x, y + wy, sc);
      });
    }
    drawParticles(ctx, 1);
    drawRings(ctx, 1);
  }

  draw(ctx) {
    if (this.shot === 1) this.drawShot1(ctx);
    else this.drawShot2(ctx);
  }
}
