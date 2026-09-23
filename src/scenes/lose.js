'use strict';

const SEA_Y = 196;

class LoseScene {
  constructor(outcome) {
    this.o = outcome || { win: false, syms: [0, 1, 2] };
  }

  enter() {
    clearFx();
    resetFx();
    fx.sat = 0.38;
    fx.tint = [0.82, 0.94, 1.22];
    fx.vig = 0.85;
    fx.grain = 0.09;
    fx.bright = 0.92;
    fx.bloom1 = 0.7;
    fx.threshold = 0.62;
    this.sky = makeCanvas(W, H);
    paintGradient(this.sky.ctx, 0, 0, W, SEA_Y + 10, ['#020308', '#05070f', '#0a0e1c', '#11182c', '#1a2238', '#222c44']);
    this.clouds = SPR.cloudStorm.map((s, i) => ({ s, x: i * 140 - 40, y: -8 + i * 14, v: -rand(6, 16) }));
    this.word = layoutText('PERDISTE', ST.lose.s);
    this.wordX = Math.round((W - this.word.w) / 2);
    this.tilt = [0.02, -0.05, 0.08, -0.03, 0.12, -0.07, 0.04, -0.1];
    this.landed = new Set();
    this.nextBolt = 0.25;
    this.lit = 0;
    this.leaving = false;
    this.sunk = false;
    Music.play(SONGS.lose);
  }

  key() {
    if (this.t > 3 && !this.leaving) this.leave();
  }

  leave() {
    this.leaving = true;
    goto(() => new TitleScene(), 'diamond', 1.2);
  }

  strike() {
    const x = rand(40, 440);
    lightning(x, -4, x + rand(-80, 80), SEA_Y, { disp: 60, life: 0.5, glow: '#6a8ad8', branches: 4 });
    flash(0.7, [0.75, 0.85, 1], 3.5);
    shake(0.45);
    kick(0.02);
    this.lit = 1;
    Sound.thunder();
  }

  update(dt) {
    const t = this.t;
    if (t > this.nextBolt) {
      this.nextBolt = t + rand(1.3, 2.6);
      this.strike();
    }
    this.lit = Math.max(0, this.lit - dt * 2.2);
    for (const c of this.clouds) c.x += c.v * dt;
    for (let i = 0; i < 14; i++) {
      const x = rand(-40, W + 60);
      const y = rand(-20, 0);
      const vy = rand(330, 420);
      spawn({
        x,
        y,
        vx: -80,
        vy,
        life: (SEA_Y + rand(0, 60) - y) / vy,
        kind: K.DROP,
        color: pick(['#8aa4c8', '#6a84a8', '#b0c4e0']),
        layer: 1,
        onDie: (p) => {
          if (Math.random() < 0.4) burst(p.x, p.y, 2, { speed: [20, 50], angle: -Math.PI / 2, spread: 0.9, life: [0.12, 0.25], kind: K.SQ, color: '#a0b8d8', g: 300, layer: 1 });
        },
      });
    }
    this.word.items.forEach((it, i) => {
      const land = 0.7 + i * 0.2;
      if (t >= land && !this.landed.has(i)) {
        this.landed.add(i);
        const x = this.wordX + it.x + it.w / 2;
        shake(0.3);
        kick(0.015);
        Sound.thud(0.9);
        burst(x, 96, 14, { speed: [20, 90], angle: -Math.PI / 2, spread: 1.4, life: [0.5, 1], kind: K.SMOKE, ramp: RAMP.smoke, size: 2, size2: 6, g: 10, drag: 3, layer: 1 });
        burst(x, 92, 10, { speed: [30, 120], angle: -Math.PI / 2, spread: 1.2, life: [0.4, 0.9], kind: K.SQ, ramp: ['#8a98b0', '#5a667e', '#3a4458'], size: 2, size2: 1, g: 380, layer: 1 });
      }
      if (t > land && Math.random() < 0.04) {
        spawn({ x: this.wordX + it.x + rand(4, it.w - 4), y: 96, vy: rand(10, 30), g: 260, life: 1, kind: K.DROP, color: '#9fb8d8', layer: 1 });
      }
    });
    const sink = seg(t, 0.8, 7.5);
    if (sink > 0 && Math.random() < 0.5) {
      spawn({ x: 200 + rand(-30, 40), y: SEA_Y + rand(4, 30), vx: rand(-6, 6), vy: rand(-40, -15), life: rand(0.6, 1.4), kind: K.BUBBLE, color: '#7a9ac8', size: randi(1, 2), sway: 10, layer: 1 });
    }
    if (sink > 0.95 && !this.sunk) {
      this.sunk = true;
      Sound.splash();
      burst(210, SEA_Y, 30, { speed: [40, 130], angle: -Math.PI / 2, spread: 0.7, life: [0.5, 1], kind: K.SQ, ramp: ['#d0e0f8', '#8aa4c8', '#4a5c80'], size: 2, size2: 1, g: 300, layer: 1 });
    }
    cam.rot = Math.sin(t * 0.7) * 0.02;
    cam.zoom = 1 + seg(t, 0, 9) * 0.07;
    if (t > 10 && !this.leaving) this.leave();
  }

  draw(ctx) {
    const t = this.t;
    ctx.drawImage(this.sky, 0, 0);
    if (this.lit > 0) {
      ditherRect(ctx, 0, 0, W, SEA_Y, '#8aa0d8', this.lit * 8);
    }
    for (const c of this.clouds) {
      const x = Math.round(mod(c.x + 200, W + 400) - 200);
      ctx.drawImage(c.s, x, c.y);
      if (this.lit > 0.4) ctx.drawImage(c.s, x, c.y + 1);
    }
    drawBolts(ctx);
    drawWaves(ctx, t, SEA_Y - 6, 3, 0.035, 1.6, '#0a1224', '#2a3a5a');
    const sink = Ease.inQuad(seg(t, 0.8, 7.5));
    const ship = SPR.shipGray[((t * 4) | 0) & 3];
    ctx.save();
    ctx.translate(205, SEA_Y - 10 + sink * 80 + Math.sin(t * 1.8) * 2);
    ctx.rotate(-0.1 - sink * 0.7 + Math.sin(t * 1.3) * 0.05);
    ctx.drawImage(ship, -55, -52);
    ctx.restore();
    drawWaves(ctx, t, SEA_Y + 4, 4, 0.03, 2.2, '#0c162c', '#3a4c70', 1.7);
    drawParticles(ctx, 0);
    drawWaves(ctx, t, SEA_Y + 30, 6, 0.022, 2.8, '#070d1c', '#4a5c80', 3.1);
    this.word.items.forEach((it, i) => {
      const land = 0.7 + i * 0.2;
      const k = seg(t, land - 0.45, land);
      if (k <= 0) return;
      const y = 40 - (1 - Ease.inQuad(k)) * 150;
      const after = t - land;
      const bounce = after > 0 ? -Math.abs(Math.sin(after * 10)) * Math.exp(-after * 5) * 8 : 0;
      const tilt = this.tilt[i] * seg(t, land + 0.3, land + 1.2) + (after > 0 ? Math.sin(t * 1.5 + i) * 0.015 : 0);
      const spr = glyphSprite(it.ch, ST.lose);
      const x = this.wordX + it.x;
      ctx.save();
      ctx.translate(x + it.w / 2, y + bounce + 56);
      ctx.rotate(tilt);
      ctx.drawImage(spr, Math.round(-it.w / 2 - spr.o), Math.round(-56 - 24 - spr.o));
      ctx.restore();
    });
    if (t > 2.8) {
      const n = Math.floor((t - 2.8) * 12);
      drawText(ctx, 'EL MAR NO PERDONA...', 240, 214, ST.loseSub, { align: 'center', count: n, fx: (i) => ({ y: Math.round(Math.sin(t * 1.5 + i * 0.5) * 1) }) });
    }
    drawParticles(ctx, 1);
    if (t > 5.2 && ((t * 1.4) | 0) % 2 === 0) drawText(ctx, 'INTÉNTALO DE NUEVO', 240, 240, ST.loseSub, { align: 'center' });
    drawRings(ctx, 1);
  }
}
